import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
  Business,
  BusinessDocument,
} from '../../businesses/schemas/business.schema';
import {
  BetaEnrollment,
  BetaEnrollmentDocument,
} from '../../beta/schemas/beta-enrollment.schema';
import { BetaEnrollmentStatus } from '../../beta/enums/beta-enrollment-status.enum';
import {
  Transaction,
  TransactionDocument,
} from '../../transactions/schemas/transaction.schema';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import {
  Invoice,
  InvoiceDocument,
} from '../../invoices/schemas/invoice.schema';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import {
  AiProposal,
  AiProposalDocument,
} from '../../ai/schemas/ai-proposal.schema';
import {
  Feedback,
  FeedbackDocument,
} from '../../feedback/schemas/feedback.schema';
import { FeedbackStatus } from '../../feedback/enums/feedback-status.enum';

export interface BetaBusinessSummary {
  businessId: string;
  businessName: string;
  ownerName: string;
  cohort: string;
  enrollmentStatus: string;
  startedAt: Date | null;
  firstMeaningfulActivityAt: Date | null;
  transactionCount: number;
  invoiceCount: number;
  whatsappConnected: boolean;
  voiceEnabled: boolean;
}

export interface AccountHealth {
  whatsappConnected: boolean;
  authorizedSenderPaired: boolean;
  aiEnabled: boolean;
  voiceEnabled: boolean;
  workerActive: boolean;
  lastMeaningfulActivityAt: Date | null;
}

@Injectable()
export class OpsService {
  constructor(
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    @InjectModel(BetaEnrollment.name)
    private enrollmentModel: Model<BetaEnrollmentDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(AiProposal.name)
    private proposalModel: Model<AiProposalDocument>,
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) {}

  async getBetaBusinessList(cohort?: string): Promise<BetaBusinessSummary[]> {
    const matchStage: Record<string, unknown> = {};
    if (cohort) matchStage.cohort = cohort;

    const enrollments = await this.enrollmentModel
      .find(matchStage)
      .populate('businessId', 'name')
      .populate('userId', 'name email')
      .lean();

    const summaries: BetaBusinessSummary[] = [];

    for (const enrollment of enrollments) {
      const business = enrollment.businessId as unknown as BusinessDocument;
      const user = enrollment.userId as unknown as {
        name?: string;
        email?: string;
      };

      if (!business) continue;

      const businessId = business._id;

      const [txCount, invCount] = await Promise.all([
        this.transactionModel.countDocuments({
          businessId,
          status: TransactionStatus.CONFIRMED,
        }),
        this.invoiceModel.countDocuments({
          businessId,
          status: { $ne: InvoiceStatus.DRAFT },
        }),
      ]);

      summaries.push({
        businessId: businessId.toString(),
        businessName: business.name || 'Unknown',
        ownerName: user?.name || user?.email || 'Unknown',
        cohort: enrollment.cohort || '',
        enrollmentStatus: enrollment.status,
        startedAt: enrollment.startedAt || null,
        firstMeaningfulActivityAt: enrollment.firstMeaningfulActivityAt || null,
        transactionCount: txCount,
        invoiceCount: invCount,
        whatsappConnected: false,
        voiceEnabled: false,
      });
    }

    return summaries;
  }

  async getAccountHealth(businessId: string): Promise<AccountHealth> {
    const proposalCount = await this.proposalModel.countDocuments({
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    return {
      whatsappConnected: false,
      authorizedSenderPaired: false,
      aiEnabled: proposalCount > 0,
      voiceEnabled: false,
      workerActive: true,
      lastMeaningfulActivityAt: null,
    };
  }

  async getOpsDashboard() {
    const totalBusinesses = await this.businessModel.countDocuments();
    const totalEnrollments = await this.enrollmentModel.countDocuments();
    const activeEnrollments = await this.enrollmentModel.countDocuments({
      status: BetaEnrollmentStatus.ACTIVE,
    });
    const totalFeedback = await this.feedbackModel.countDocuments();
    const newFeedback = await this.feedbackModel.countDocuments({
      status: FeedbackStatus.NEW,
    });

    return {
      totalBusinesses,
      totalBetaEnrollments: totalEnrollments,
      activeBetaEnrollments: activeEnrollments,
      totalFeedback,
      newFeedback,
    };
  }
}
