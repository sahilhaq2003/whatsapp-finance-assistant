import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiProposal, AiProposalDocument } from '../schemas/ai-proposal.schema';
import { Transaction, TransactionDocument } from '../../transactions/schemas/transaction.schema';
import { AiProposalStatus } from '../enums/ai-proposal-status.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { TransactionSource } from '../../../common/enums/transaction-source.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { toMinorUnits } from '../../../common/utils/financial.utils';
import { AuditService } from '../../audit/audit.service';
import { AI_AUDIT_ACTIONS } from '../ai.constants';
import { AiValidationService } from './ai-validation.service';
import { AiPromptService } from './ai-prompt.service';
import type { ParsedTransactionProposal } from '../interfaces/financial-extraction.interface';

@Injectable()
export class AiProposalService {
  private readonly logger = new Logger(AiProposalService.name);

  constructor(
    @InjectModel(AiProposal.name)
    private proposalModel: Model<AiProposalDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private readonly auditService: AuditService,
    private readonly validationService: AiValidationService,
    private readonly promptService: AiPromptService,
  ) {}

  async getProposals(
    businessId: string,
    query: { status?: string; intent?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number },
  ) {
    const filter: Record<string, unknown> = { businessId: new Types.ObjectId(businessId) };

    if (query.status) filter.status = query.status;
    if (query.intent) filter.intent = query.intent;
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) (filter.createdAt as Record<string, unknown>).$gte = new Date(query.dateFrom);
      if (query.dateTo) (filter.createdAt as Record<string, unknown>).$lte = new Date(query.dateTo);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.proposalModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('confirmedTransactionId', 'type amountMinor currency status')
        .lean(),
      this.proposalModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProposal(businessId: string, proposalId: string): Promise<AiProposalDocument> {
    const proposal = await this.proposalModel
      .findOne({
        _id: new Types.ObjectId(proposalId),
        businessId: new Types.ObjectId(businessId),
      })
      .populate('confirmedTransactionId', 'type amountMinor currency status')
      .exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  async findActiveProposal(
    businessId: string,
    userId: string,
  ): Promise<AiProposalDocument | null> {
    return this.proposalModel.findOne({
      businessId: new Types.ObjectId(businessId),
      userId: new Types.ObjectId(userId),
      status: { $in: [AiProposalStatus.PENDING, AiProposalStatus.NEEDS_CLARIFICATION] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  async confirmProposal(
    businessId: string,
    userId: string,
    proposalId: string,
  ): Promise<{ transaction: TransactionDocument; proposal: AiProposalDocument }> {
    const proposal = await this.getProposal(businessId, proposalId);

    if (proposal.status === AiProposalStatus.CONFIRMED && proposal.confirmedTransactionId) {
      const existingTx = await this.transactionModel.findById(proposal.confirmedTransactionId);
      if (existingTx) {
        return { transaction: existingTx, proposal };
      }
    }

    if (proposal.status === AiProposalStatus.EXPIRED || proposal.expiresAt <= new Date()) {
      await this.proposalModel.findByIdAndUpdate(proposal._id, {
        status: AiProposalStatus.EXPIRED,
      });
      throw new BadRequestException('That confirmation request has expired. Please send the transaction again.');
    }

    if (proposal.status !== AiProposalStatus.PENDING) {
      throw new BadRequestException(`Cannot confirm a proposal with status "${proposal.status}"`);
    }

    const validation = await this.validationService.validate(businessId, proposal.parsedData as Partial<ParsedTransactionProposal>);
    if (!validation.isValid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const data = proposal.parsedData;
    const currency = data.currency || 'LKR';
    const amountMinor = toMinorUnits(data.amount || 0, currency);

    const now = new Date();

    const proposalInputSource = (proposal as any).inputSource;
    const txSource = proposalInputSource === 'whatsapp_voice'
      ? TransactionSource.WHATSAPP_VOICE
      : proposalInputSource === 'whatsapp_text'
        ? TransactionSource.WHATSAPP_TEXT
        : TransactionSource.WHATSAPP_TEXT;

    const transaction = new this.transactionModel({
      businessId: new Types.ObjectId(businessId),
      type: data.type as TransactionType,
      amountMinor,
      currency,
      categoryId: new Types.ObjectId(validation.resolvedCategoryId!),
      customerId: validation.resolvedCustomerId ? new Types.ObjectId(validation.resolvedCustomerId) : undefined,
      date: new Date(data.date || now),
      description: data.description || proposal.originalText,
      paymentMethod: data.paymentMethod as PaymentMethod | undefined,
      source: txSource,
      status: TransactionStatus.CONFIRMED,
      createdByUserId: new Types.ObjectId(userId),
      confirmedByUserId: new Types.ObjectId(userId),
      confirmedAt: now,
    });

    const savedTransaction = await transaction.save();

    const updatedProposal = await this.proposalModel.findByIdAndUpdate(
      proposal._id,
      {
        status: AiProposalStatus.CONFIRMED,
        confirmedTransactionId: savedTransaction._id,
        confirmedAt: now,
        validationErrors: [],
      },
      { new: true },
    );

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'AiProposal',
      entityId: proposal._id.toString(),
      action: AI_AUDIT_ACTIONS.PROPOSAL_CONFIRMED,
      newValues: {
        transactionId: savedTransaction._id.toString(),
        type: data.type,
        amount: data.amount,
        currency,
      },
    });

    return { transaction: savedTransaction, proposal: updatedProposal! };
  }

  async rejectProposal(
    businessId: string,
    userId: string,
    proposalId: string,
  ): Promise<AiProposalDocument> {
    const proposal = await this.getProposal(businessId, proposalId);

    const now = new Date();
    const updated = await this.proposalModel.findByIdAndUpdate(
      proposal._id,
      {
        status: AiProposalStatus.REJECTED,
        rejectedAt: now,
      },
      { new: true },
    );

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'AiProposal',
      entityId: proposal._id.toString(),
      action: AI_AUDIT_ACTIONS.PROPOSAL_REJECTED,
    });

    return updated!;
  }

  async updateProposal(
    businessId: string,
    userId: string,
    proposalId: string,
    updates: Partial<ParsedTransactionProposal>,
  ): Promise<{ proposal: AiProposalDocument; confirmationText: string }> {
    const proposal = await this.getProposal(businessId, proposalId);

    if (proposal.status !== AiProposalStatus.PENDING && proposal.status !== AiProposalStatus.NEEDS_CLARIFICATION) {
      throw new BadRequestException(`Cannot edit a proposal with status "${proposal.status}"`);
    }

    const parsedObj = (proposal.parsedData as any).toObject ? (proposal.parsedData as any).toObject() : { ...proposal.parsedData };
    const previousData = { ...parsedObj } as Record<string, unknown>;
    const currentData = { ...parsedObj } as Record<string, unknown>;

    const mergedData: Record<string, unknown> = { ...currentData };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null) {
        mergedData[key] = value;
      }
    }

    const updateOps: Record<string, unknown> = {
      parsedData: mergedData,
      status: AiProposalStatus.PENDING,
      clarificationQuestion: undefined,
    };

    if (proposal.revisionHistory && proposal.revisionHistory.length > 0) {
      updateOps.$push = {
        revisionHistory: {
          timestamp: new Date(),
          previousData,
          updatedData: mergedData,
          sourceText: JSON.stringify(updates),
        },
      };
    } else {
      updateOps.revisionHistory = [
        {
          timestamp: new Date(),
          previousData,
          updatedData: mergedData,
          sourceText: JSON.stringify(updates),
        },
      ];
    }

    const updated = await this.proposalModel.findByIdAndUpdate(
      proposal._id,
      updateOps,
      { new: true },
    );

    const displayText = this.promptService.formatProposalConfirmation(mergedData as Record<string, unknown>);

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'AiProposal',
      entityId: proposal._id.toString(),
      action: AI_AUDIT_ACTIONS.PROPOSAL_CORRECTED,
      oldValues: previousData,
      newValues: mergedData,
    });

    return { proposal: updated!, confirmationText: displayText };
  }
}
