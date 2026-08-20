import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MessageEvent,
  MessageEventDocument,
} from '../schemas/message-event.schema';
import {
  WhatsAppConnection,
  WhatsAppConnectionDocument,
} from '../schemas/whatsapp-connection.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { MessageDirection } from '../../../common/enums/message-direction.enum';
import { MessageProcessingStatus } from '../../../common/enums/message-processing-status.enum';
import { MessageType } from '../../../common/enums/message-type.enum';
import { WHATSAPP_CONSTANTS, WHATSAPP_REPLIES, WHATSAPP_COMMANDS } from '../whatsapp.constants';
import { MetaWhatsAppProviderService } from './whatsapp-provider.service';
import { WhatsAppBusinessResolverService } from './whatsapp-business-resolver.service';
import { WhatsAppVoiceProcessorService } from './whatsapp-voice-processor.service';
import { AiExtractionService } from '../../ai/services/ai-extraction.service';
import { AiProposalService } from '../../ai/services/ai-proposal.service';
import { AiProposalStatus } from '../../ai/enums/ai-proposal-status.enum';
import { AI_CONSTANTS } from '../../ai/ai.constants';
import { SPEECH_REPLIES } from '../../speech/speech.constants';

@Injectable()
export class WhatsAppMessageService {
  private readonly logger = new Logger(WhatsAppMessageService.name);

  constructor(
    @InjectModel(MessageEvent.name)
    private messageEventModel: Model<MessageEventDocument>,
    private readonly providerService: MetaWhatsAppProviderService,
    private readonly businessResolver: WhatsAppBusinessResolverService,
    private readonly voiceProcessor: WhatsAppVoiceProcessorService,
    private readonly extractionService: AiExtractionService,
    private readonly proposalService: AiProposalService,
  ) {}

  async handleInboundMessage(
    messageEvent: MessageEventDocument,
    connection: WhatsAppConnectionDocument,
    business: BusinessDocument,
  ): Promise<void> {
    try {
      const sender = await this.businessResolver.findAuthorizedSender(
        business._id.toString(),
        messageEvent.senderPhone,
      );

      if (!sender) {
        await this.sendReply(
          connection,
          messageEvent.senderPhone,
          WHATSAPP_REPLIES.UNAUTHORIZED,
          messageEvent._id.toString(),
        );
        await this.markProcessed(messageEvent._id.toString());
        return;
      }

      if (messageEvent.messageType !== MessageType.TEXT) {
        if (messageEvent.messageType === MessageType.AUDIO) {
          await this.handleVoiceMessage(messageEvent, connection, business, sender.userId.toString());
          return;
        }

        await this.sendReply(
          connection,
          messageEvent.senderPhone,
          WHATSAPP_REPLIES.UNSUPPORTED_TYPE,
          messageEvent._id.toString(),
        );
        await this.markProcessed(messageEvent._id.toString());
        return;
      }

      await this.handleAuthorizedTextMessage(messageEvent, connection, business, sender.userId.toString());
    } catch (error) {
      this.logger.error(`Error handling inbound message: ${error}`);
      await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
        processingStatus: MessageProcessingStatus.FAILED,
        processingErrorCode: 'HANDLER_ERROR',
      });
    }
  }

  async handleAuthorizedTextMessage(
    messageEvent: MessageEventDocument,
    connection: WhatsAppConnectionDocument,
    business: BusinessDocument,
    senderUserId?: string,
  ): Promise<void> {
    const text = (messageEvent.text || '').trim();
    const textLower = text.toLowerCase();

    // Resolve sender if not passed
    if (!senderUserId) {
      const sender = await this.businessResolver.findAuthorizedSender(
        business._id.toString(),
        messageEvent.senderPhone,
      );
      senderUserId = sender?.userId?.toString();
    }

    if (!senderUserId) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        WHATSAPP_REPLIES.UNAUTHORIZED,
        messageEvent._id.toString(),
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    // Handle commands
    if (textLower === WHATSAPP_COMMANDS.HELP) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        WHATSAPP_REPLIES.HELP,
        messageEvent._id.toString(),
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    if (textLower === WHATSAPP_COMMANDS.STATUS) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        `Your WhatsApp connection to Salligo is active.\n\nBusiness: ${business.name}`,
        messageEvent._id.toString(),
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    // Check for active proposal (confirm/cancel/edit flow)
    const activeProposal = await this.proposalService.findActiveProposal(
      business._id.toString(),
      senderUserId,
    );

    if (activeProposal) {
      await this.handleProposalFlow(
        textLower,
        text,
        activeProposal,
        messageEvent,
        connection,
        business,
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    // Process as AI financial extraction
    const { reply } = await this.extractionService.processFinancialMessage(
      messageEvent,
      business._id.toString(),
      senderUserId,
    );

    await this.sendReply(
      connection,
      messageEvent.senderPhone,
      reply,
      messageEvent._id.toString(),
    );

    await this.markProcessed(messageEvent._id.toString());
  }

  private async handleProposalFlow(
    textLower: string,
    text: string,
    activeProposal: any,
    messageEvent: MessageEventDocument,
    connection: WhatsAppConnectionDocument,
    business: BusinessDocument,
  ): Promise<void> {
    const businessId = business._id.toString();
    const userId = senderUserId(activeProposal);
    const proposalId = activeProposal._id.toString();

    const isConfirm = AI_CONSTANTS.CONFIRMATION_KEYWORDS.includes(textLower as any);
    const isCancel = AI_CONSTANTS.REJECTION_KEYWORDS.includes(textLower as any);
    const isEdit = AI_CONSTANTS.EDIT_KEYWORDS.some((kw) => textLower.includes(kw));

    if (isConfirm) {
      try {
        const { proposal } = await this.proposalService.confirmProposal(
          businessId,
          userId,
          proposalId,
        );

        const displayText = formatProposalForDisplay(proposal.parsedData);
        const reply = `Saved successfully.\n\n${displayText}`;

        await this.sendReply(
          connection,
          messageEvent.senderPhone,
          reply,
          messageEvent._id.toString(),
        );
      } catch (error: any) {
        await this.sendReply(
          connection,
          messageEvent.senderPhone,
          error.message || 'Failed to confirm. Please try again.',
          messageEvent._id.toString(),
        );
      }
      return;
    }

    if (isCancel) {
      await this.proposalService.rejectProposal(businessId, userId, proposalId);
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        'Okay. I did not save this transaction.',
        messageEvent._id.toString(),
      );
      return;
    }

    if (isEdit) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        'Tell me what needs to be changed.\n\nExample:\n"Amount should be 2000"\nor\n"Category should be Transport"',
        messageEvent._id.toString(),
      );
      return;
    }

    // Check for correction patterns like "amount should be 2000"
    const correctionResult = this.parseCorrection(text);
    if (correctionResult) {
      try {
        const { proposal, confirmationText } = await this.proposalService.updateProposal(
          businessId,
          userId,
          proposalId,
          correctionResult,
        );

        await this.sendReply(
          connection,
          messageEvent.senderPhone,
          `Updated:\n\n${confirmationText}\n\nConfirm?\n\nCONFIRM\nEDIT\nCANCEL`,
          messageEvent._id.toString(),
        );
      } catch (error: any) {
        await this.sendReply(
          connection,
          messageEvent.senderPhone,
          error.message || 'Failed to update. Please try again.',
          messageEvent._id.toString(),
        );
      }
      return;
    }

    // Not a valid proposal flow command — process as new AI extraction
    const { reply } = await this.extractionService.processFinancialMessage(
      messageEvent,
      businessId,
      userId,
    );

    await this.sendReply(
      connection,
      messageEvent.senderPhone,
      reply,
      messageEvent._id.toString(),
    );
  }

  private parseCorrection(text: string): Partial<{ amount: number; category: string; date: string; description: string; customer: string; paymentMethod: string }> | null {
    const textLower = text.toLowerCase();
    const result: Record<string, unknown> = {};

    const amountMatch = text.match(/(?:amount|cost|price|total|value)\s*(?:should\s*(?:be)?)?\s*(?:is)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)
      || text.match(/(?:is|was)\s+(\d+(?:[.,]\d+)?)/i)
      || text.match(/(\d+(?:[.,]\d+)?)\s*(?:lkr|rs|inr|usd|\$)/i);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    const categoryMatch = text.match(/(?:category|type|group)\s*(?:should\s*(?:be)?)?\s*(?:is)?\s*[:=]?\s*(.+)/i);
    if (categoryMatch) {
      result.category = categoryMatch[1].trim().replace(/['"]/g, '');
    }

    const dateMatch = text.match(/(?:date|for|on)\s*(?:should\s*(?:be)?)?\s*(?:is)?\s*[:=]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i);
    if (dateMatch) {
      result.date = dateMatch[1];
    }

    const descMatch = text.match(/(?:description|desc|note|memo)\s*(?:should\s*(?:be)?)?\s*(?:is)?\s*[:=]?\s*(.+)/i);
    if (descMatch) {
      result.description = descMatch[1].trim().replace(/['"]/g, '');
    }

    const customerMatch = text.match(/(?:customer|client|for)\s*(?:should\s*(?:be)?)?\s*(?:is)?\s*[:=]?\s*(.+)/i);
    if (customerMatch) {
      result.customer = customerMatch[1].trim().replace(/['"]/g, '');
    }

    const paymentMatch = text.match(/(?:payment|method|paid\s*(?:via|by|with)?)\s*(?:should\s*(?:be)?)?\s*(?:is)?\s*[:=]?\s*(cash|bank\s*transfer|card|mobile\s*payment|other)/i);
    if (paymentMatch) {
      result.paymentMethod = paymentMatch[1].toLowerCase().replace(/\s+/g, '_');
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  private async handleVoiceMessage(
    messageEvent: MessageEventDocument,
    connection: WhatsAppConnectionDocument,
    business: BusinessDocument,
    senderUserId: string,
  ): Promise<void> {
    if (!this.voiceProcessor) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        SPEECH_REPLIES.SERVICE_UNAVAILABLE,
        messageEvent._id.toString(),
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    const hasVoiceFeature = business.features?.voiceInput === true;
    if (!hasVoiceFeature) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        SPEECH_REPLIES.FEATURE_DISABLED,
        messageEvent._id.toString(),
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    await this.sendReply(
      connection,
      messageEvent.senderPhone,
      SPEECH_REPLIES.PROCESSING,
      messageEvent._id.toString(),
    );

    const activeProposal = await this.proposalService.findActiveProposal(
      business._id.toString(),
      senderUserId,
    );

    if (activeProposal) {
      await this.sendReply(
        connection,
        messageEvent.senderPhone,
        'Please send the correction as text while a transaction is waiting for confirmation.',
        messageEvent._id.toString(),
      );
      await this.markProcessed(messageEvent._id.toString());
      return;
    }

    const result = await this.voiceProcessor.processVoiceMessage(
      messageEvent,
      business._id.toString(),
      senderUserId,
    );

    await this.sendReply(
      connection,
      messageEvent.senderPhone,
      result.reply,
      messageEvent._id.toString(),
    );

    await this.markProcessed(messageEvent._id.toString());
  }

  async sendTextMessage(
    businessId: string,
    recipientPhone: string,
    text: string,
  ): Promise<MessageEventDocument> {
    if (text.length > WHATSAPP_CONSTANTS.MAX_OUTBOUND_TEXT_LENGTH) {
      throw new Error(
        `Message exceeds maximum length of ${WHATSAPP_CONSTANTS.MAX_OUTBOUND_TEXT_LENGTH} characters`,
      );
    }

    const connection = await this.businessResolver.resolveByBusinessId(businessId);
    if (!connection) {
      throw new Error('No active WhatsApp connection for this business');
    }

    const result = await this.providerService.sendTextMessage({
      phoneNumberId: connection.phoneNumberId,
      recipientPhone,
      text,
    });

    const messageEvent = await this.messageEventModel.create({
      businessId,
      whatsappConnectionId: connection._id,
      provider: connection.provider,
      providerMessageId: result.providerMessageId,
      direction: MessageDirection.OUTBOUND,
      senderPhone: connection.businessPhoneE164,
      recipientPhone,
      messageType: MessageType.TEXT,
      text,
      providerTimestamp: result.sentAt,
      processingStatus: MessageProcessingStatus.PROCESSED,
      deliveryStatus: undefined,
      sentAt: result.sentAt,
    });

    return messageEvent;
  }

  private async sendReply(
    connection: WhatsAppConnectionDocument,
    recipientPhone: string,
    text: string,
    replyToMessageId?: string,
  ): Promise<void> {
    try {
      const truncatedText = text.length > WHATSAPP_CONSTANTS.MAX_OUTBOUND_TEXT_LENGTH
        ? text.substring(0, WHATSAPP_CONSTANTS.MAX_OUTBOUND_TEXT_LENGTH - 3) + '...'
        : text;

      const result = await this.providerService.sendTextMessage({
        phoneNumberId: connection.phoneNumberId,
        recipientPhone,
        text: truncatedText,
      });

      await this.messageEventModel.create({
        businessId: connection.businessId,
        whatsappConnectionId: connection._id,
        provider: connection.provider,
        providerMessageId: result.providerMessageId,
        direction: MessageDirection.OUTBOUND,
        senderPhone: connection.businessPhoneE164,
        recipientPhone,
        messageType: MessageType.TEXT,
        text: truncatedText,
        providerTimestamp: result.sentAt,
        processingStatus: MessageProcessingStatus.PROCESSED,
        replyToProviderMessageId: replyToMessageId,
        sentAt: result.sentAt,
      });
    } catch (error) {
      this.logger.error(`Failed to send reply: ${error}`);
    }
  }

  private async markProcessed(messageEventId: string): Promise<void> {
    await this.messageEventModel.findByIdAndUpdate(messageEventId, {
      processingStatus: MessageProcessingStatus.PROCESSED,
    });
  }
}

function senderUserId(proposal: any): string {
  return proposal.userId?.toString?.() || proposal.userId;
}

function formatProposalForDisplay(parsedData: any): string {
  const lines: string[] = [];
  if (parsedData.type) {
    lines.push(parsedData.type === 'expense' ? 'Expense' : 'Income');
  }
  if (parsedData.amount != null && parsedData.currency) {
    lines.push(`${parsedData.currency} ${parsedData.amount.toLocaleString()}`);
  } else if (parsedData.amount != null) {
    lines.push(`LKR ${parsedData.amount.toLocaleString()}`);
  }
  if (parsedData.category) lines.push(parsedData.category);
  if (parsedData.date) {
    try {
      const d = new Date(parsedData.date + 'T00:00:00');
      lines.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
    } catch {
      lines.push(parsedData.date);
    }
  }
  if (parsedData.description) lines.push(parsedData.description);
  if (parsedData.customer) lines.push(`Customer: ${parsedData.customer}`);
  return lines.join('\n');
}
