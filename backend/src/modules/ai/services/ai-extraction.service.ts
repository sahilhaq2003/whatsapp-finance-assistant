import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageEvent, MessageEventDocument } from '../../whatsapp/schemas/message-event.schema';
import { AiProposal, AiProposalDocument, ProposalParsedData } from '../schemas/ai-proposal.schema';
import type { FinancialExtractionResult } from '../interfaces/ai-provider.interface';
import { AiIntent } from '../enums/ai-intent.enum';
import { AiProposalStatus } from '../enums/ai-proposal-status.enum';
import { LlmProviderService } from '../providers/llm-provider.service';
import { AiPromptService } from './ai-prompt.service';
import { BusinessQueryHandler } from '../business-query/business-query.handler';
import { AI_CONSTANTS, AI_REPLIES } from '../ai.constants';

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private readonly isEnabled: boolean;
  private readonly minConfidence: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(MessageEvent.name)
    private messageEventModel: Model<MessageEventDocument>,
    @InjectModel(AiProposal.name)
    private proposalModel: Model<AiProposalDocument>,
    private readonly llmProvider: LlmProviderService,
    private readonly promptService: AiPromptService,
    private readonly businessQueryHandler: BusinessQueryHandler,
  ) {
    this.isEnabled = this.configService.get<string>('AI_ENABLED') !== 'false';
    this.minConfidence = this.configService.get<number>('AI_MIN_CONFIDENCE') || 0.75;
  }

  async processFinancialMessage(
    messageEvent: MessageEventDocument,
    businessId: string,
    userId: string,
    options?: {
      inputSource?: 'whatsapp_text' | 'whatsapp_voice' | 'dashboard';
      transcript?: string;
      speechConfidence?: number;
    },
  ): Promise<{
    proposal: AiProposalDocument | null;
    reply: string;
  }> {
    if (!this.isEnabled) {
      return {
        proposal: null,
        reply: AI_REPLIES.AI_UNAVAILABLE,
      };
    }

    const originalText = (messageEvent.text || '').trim();
    if (!originalText) {
      return {
        proposal: null,
        reply: 'I received an empty message.',
      };
    }

    try {
      const context = await this.promptService.buildExtractionContext(
        businessId,
        userId,
        messageEvent._id.toString(),
        messageEvent.senderPhone,
        originalText,
      );

      const extractionResult = await this.llmProvider.extractFinancialIntent({
        messageText: originalText,
        businessTimezone: context.businessTimezone,
        businessCurrency: context.businessCurrency,
        currentLocalDate: context.currentLocalDate,
        expenseCategories: context.expenseCategories.map((c) => c.name),
        incomeCategories: context.incomeCategories.map((c) => c.name),
      });

      if (extractionResult.intent === AiIntent.BUSINESS_QUERY) {
        const queryResult = await this.businessQueryHandler.handleQuestion(
          businessId,
          originalText,
        );
        return {
          proposal: null,
          reply: queryResult.answer,
        };
      }

      return await this.handleExtractionResult(
        extractionResult,
        originalText,
        messageEvent,
        businessId,
        userId,
        context,
        options,
      );
    } catch (error) {
      this.logger.error(`AI extraction failed: ${error}`);
      return {
        proposal: null,
        reply: 'I received your message, but I could not understand it right now. Please try again in a moment.',
      };
    }
  }

  async processCorrection(
    originalText: string,
    correctionText: string,
    existingParsed: Partial<ProposalParsedData>,
    businessId: string,
    userId: string,
    messageEvent: MessageEventDocument,
  ): Promise<{
    result: FinancialExtractionResult;
    reply: string;
  }> {
    try {
      const context = await this.promptService.buildExtractionContext(
        businessId,
        userId,
        messageEvent._id.toString(),
        messageEvent.senderPhone,
        originalText,
      );

      const correctionPrompt = `The user previously sent: "${originalText}"

The system extracted: ${JSON.stringify(existingParsed)}

The user now corrects with: "${correctionText}"

Apply the correction to the existing extraction. Return the updated extraction.`;

      const result = await this.llmProvider.extractFinancialIntent({
        messageText: correctionPrompt,
        businessTimezone: context.businessTimezone,
        businessCurrency: context.businessCurrency,
        currentLocalDate: context.currentLocalDate,
        expenseCategories: context.expenseCategories.map((c) => c.name),
        incomeCategories: context.incomeCategories.map((c) => c.name),
      });

      return { result, reply: '' };
    } catch (error) {
      this.logger.error(`AI correction extraction failed: ${error}`);
      return {
        result: {
          intent: AiIntent.UNKNOWN,
          confidence: 0,
          transactions: [],
          missingFields: [],
          clarificationQuestion: null,
        },
        reply: 'I could not process your correction. Please try again.',
      };
    }
  }

  private async handleExtractionResult(
    result: FinancialExtractionResult,
    originalText: string,
    messageEvent: MessageEventDocument,
    businessId: string,
    userId: string,
    context: Awaited<ReturnType<AiPromptService['buildExtractionContext']>>,
    options?: {
      inputSource?: 'whatsapp_text' | 'whatsapp_voice' | 'dashboard';
      transcript?: string;
      speechConfidence?: number;
    },
  ): Promise<{
    proposal: AiProposalDocument | null;
    reply: string;
  }> {
    if (result.clarificationQuestion && result.transactions.length === 0) {
      return await this.createProposal({
        businessId,
        userId,
        messageEventId: messageEvent._id.toString(),
        intent: result.intent,
        originalText,
        parsedData: {},
        confidence: result.confidence,
        status: AiProposalStatus.NEEDS_CLARIFICATION,
        clarificationQuestion: result.clarificationQuestion,
        inputSource: options?.inputSource,
        transcript: options?.transcript,
        speechConfidence: options?.speechConfidence,
      });
    }

    if (result.missingFields.length > 0 || result.confidence < this.minConfidence) {
      let question = result.clarificationQuestion;
      if (!question) {
        if (result.missingFields.includes('amount')) {
          const tx = result.transactions[0];
          question = `How much did you ${tx?.type === 'income' ? 'receive' : 'spend'}?`;
        } else if (result.missingFields.includes('type')) {
          question = 'Was this an income or an expense?';
        } else {
          question = 'Could you provide more details?';
        }
      }

      const tx = result.transactions[0];
      return await this.createProposal({
        businessId,
        userId,
        messageEventId: messageEvent._id.toString(),
        intent: result.intent,
        originalText,
        parsedData: tx ? {
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency || context.businessCurrency,
          category: tx.category,
          date: tx.date,
          description: tx.description,
          customer: tx.customer,
          paymentMethod: tx.paymentMethod,
        } : {},
        confidence: result.confidence,
        status: AiProposalStatus.NEEDS_CLARIFICATION,
        clarificationQuestion: question,
        inputSource: options?.inputSource,
        transcript: options?.transcript,
        speechConfidence: options?.speechConfidence,
      });
    }

    const tx = result.transactions[0];
    if (!tx) {
      return await this.createProposal({
        businessId,
        userId,
        messageEventId: messageEvent._id.toString(),
        intent: result.intent,
        originalText,
        parsedData: {},
        confidence: 0,
        status: AiProposalStatus.NEEDS_CLARIFICATION,
        clarificationQuestion: 'I could not understand the financial details. Could you rephrase?',
        inputSource: options?.inputSource,
        transcript: options?.transcript,
        speechConfidence: options?.speechConfidence,
      });
    }

    const parsedData: Partial<ProposalParsedData> = {
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency || context.businessCurrency,
      category: tx.category,
      date: tx.date || context.currentLocalDate,
      description: tx.description || originalText,
      customer: tx.customer,
      paymentMethod: tx.paymentMethod,
    };

    const { proposal } = await this.createProposal({
      businessId,
      userId,
      messageEventId: messageEvent._id.toString(),
      intent: result.intent,
      originalText,
      parsedData,
      confidence: result.confidence,
      status: AiProposalStatus.PENDING,
      clarificationQuestion: null,
      inputSource: options?.inputSource,
      transcript: options?.transcript,
      speechConfidence: options?.speechConfidence,
    });

    const displayText = this.promptService.formatProposalConfirmation(parsedData as Record<string, unknown>);

    return {
      proposal,
      reply: `I understood:\n\n${displayText}\n\nConfirm this transaction?\n\nReply:\nCONFIRM\nEDIT\nCANCEL`,
    };
  }

  private async createProposal(params: {
    businessId: string;
    userId: string;
    messageEventId: string;
    intent: AiIntent;
    originalText: string;
    parsedData: Partial<ProposalParsedData>;
    confidence: number;
    status: AiProposalStatus;
    clarificationQuestion?: string | null;
    inputSource?: 'whatsapp_text' | 'whatsapp_voice' | 'dashboard';
    transcript?: string;
    speechConfidence?: number;
  }): Promise<{ proposal: AiProposalDocument; reply: string }> {
    const expiryMinutes = this.configService.get<number>('AI_PROPOSAL_EXPIRY_MINUTES') || AI_CONSTANTS.PROPOSAL_EXPIRY_DEFAULT_MINUTES;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const proposal = await this.proposalModel.create({
      businessId: params.businessId,
      userId: params.userId,
      messageEventId: params.messageEventId,
      intent: params.intent,
      originalText: params.originalText,
      inputSource: params.inputSource || 'whatsapp_text',
      transcript: params.transcript,
      speechConfidence: params.speechConfidence,
      parsedData: params.parsedData,
      confidence: params.confidence,
      status: params.status,
      validationErrors: [],
      clarificationQuestion: params.clarificationQuestion || undefined,
      expiresAt,
    });

    let reply: string;
    if (params.status === AiProposalStatus.NEEDS_CLARIFICATION) {
      reply = params.clarificationQuestion || 'Could you provide more details?';
    } else {
      const displayText = this.promptService.formatProposalConfirmation(
        params.parsedData as Record<string, unknown>,
      );
      reply = `I understood:\n\n${displayText}\n\nConfirm this transaction?\n\nReply:\nCONFIRM\nEDIT\nCANCEL`;
    }

    return { proposal, reply };
  }
}
