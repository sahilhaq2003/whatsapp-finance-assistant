import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AiProposal,
  AiProposalDocument,
} from '../../ai/schemas/ai-proposal.schema';
import {
  Reminder,
  ReminderDocument,
} from '../../reminders/schemas/reminder.schema';
import {
  Payment,
  PaymentDocument,
} from '../../payments/schemas/payment.schema';
import {
  MessageEvent,
  MessageEventDocument,
} from '../../whatsapp/schemas/message-event.schema';
import {
  RateResult,
  VoiceQualityResult,
  ReminderOutcomeResult,
} from '../interfaces/metrics.interface';
import { AiProposalStatus } from '../../ai/enums/ai-proposal-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class AiQualityMetricsService {
  constructor(
    @InjectModel(AiProposal.name)
    private aiProposalModel: Model<AiProposalDocument>,
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(MessageEvent.name)
    private messageEventModel: Model<MessageEventDocument>,
  ) {}

  async getWhatsAppConfirmationSuccess(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<RateResult> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateFrom, $lte: dateTo },
          inputSource: { $in: ['whatsapp_text', 'whatsapp_voice'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', AiProposalStatus.CONFIRMED] },
                    { $ne: ['$confirmedTransactionId', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const result = await this.aiProposalModel.aggregate(pipeline).exec();

    const total = result.length > 0 ? result[0].total : 0;
    const confirmed = result.length > 0 ? result[0].confirmed : 0;

    return {
      denominator: total,
      numerator: confirmed,
      rate: total > 0 ? confirmed / total : 0,
    };
  }

  async getCorrectionRate(
    dateFrom: Date,
    dateTo: Date,
    source?: string,
  ): Promise<RateResult> {
    const matchStage: Record<string, unknown> = {
      createdAt: { $gte: dateFrom, $lte: dateTo },
    };

    if (source) {
      matchStage.inputSource = source;
    }

    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          corrected: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$revisionHistory' }, 0] }, 1, 0],
            },
          },
        },
      },
    ];

    const result = await this.aiProposalModel.aggregate(pipeline).exec();

    const total = result.length > 0 ? result[0].total : 0;
    const corrected = result.length > 0 ? result[0].corrected : 0;

    return {
      denominator: total,
      numerator: corrected,
      rate: total > 0 ? corrected / total : 0,
    };
  }

  async getClarificationRate(
    dateFrom: Date,
    dateTo: Date,
    source?: string,
  ): Promise<RateResult> {
    const matchStage: Record<string, unknown> = {
      createdAt: { $gte: dateFrom, $lte: dateTo },
    };

    if (source) {
      matchStage.inputSource = source;
    }

    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          clarification: {
            $sum: {
              $cond: [
                { $eq: ['$status', AiProposalStatus.NEEDS_CLARIFICATION] },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const result = await this.aiProposalModel.aggregate(pipeline).exec();

    const total = result.length > 0 ? result[0].total : 0;
    const clarification = result.length > 0 ? result[0].clarification : 0;

    return {
      denominator: total,
      numerator: clarification,
      rate: total > 0 ? clarification / total : 0,
    };
  }

  async getVoiceQuality(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<VoiceQualityResult> {
    const voiceProposalsPipeline = [
      {
        $match: {
          createdAt: { $gte: dateFrom, $lte: dateTo },
          inputSource: 'whatsapp_voice',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withTranscript: {
            $sum: {
              $cond: [{ $ne: ['$transcript', null] }, 1, 0],
            },
          },
          confirmed: {
            $sum: {
              $cond: [{ $eq: ['$status', AiProposalStatus.CONFIRMED] }, 1, 0],
            },
          },
        },
      },
    ];

    const result = await this.aiProposalModel
      .aggregate(voiceProposalsPipeline)
      .exec();

    const voiceReceived = result.length > 0 ? result[0].total : 0;
    const successfulTranscription =
      result.length > 0 ? result[0].withTranscript : 0;
    const proposalsConfirmed = result.length > 0 ? result[0].confirmed : 0;

    return {
      voiceReceived,
      successfulTranscription,
      transcriptionSuccessRate:
        voiceReceived > 0 ? successfulTranscription / voiceReceived : 0,
      proposalsCreated: voiceReceived,
      proposalsConfirmed,
      confirmationRate:
        voiceReceived > 0 ? proposalsConfirmed / voiceReceived : 0,
    };
  }

  async getReminderOutcome(
    dateFrom: Date,
    dateTo: Date,
    reminderPaymentDays: number = 30,
  ): Promise<ReminderOutcomeResult> {
    const remindersPipeline = [
      {
        $match: {
          sentAt: { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
        },
      },
    ];

    const reminderResult = await this.reminderModel
      .aggregate(remindersPipeline)
      .exec();
    const remindersSent =
      reminderResult.length > 0 ? reminderResult[0].total : 0;

    if (remindersSent === 0) {
      return { remindersSent: 0, paymentsAfterReminder: 0, outcomeRate: 0 };
    }

    const sentReminders = await this.reminderModel
      .find({
        sentAt: { $gte: dateFrom, $lte: dateTo },
        invoiceId: { $ne: null },
      })
      .select('invoiceId sentAt')
      .lean()
      .exec();

    let paymentsAfterReminder = 0;

    for (const reminder of sentReminders) {
      if (!reminder.invoiceId || !reminder.sentAt) continue;

      const paymentWindowEnd = new Date(
        reminder.sentAt.getTime() + reminderPaymentDays * 24 * 60 * 60 * 1000,
      );

      const paymentCount = await this.paymentModel
        .countDocuments({
          invoiceId: reminder.invoiceId,
          status: PaymentStatus.CONFIRMED,
          date: { $gt: reminder.sentAt, $lte: paymentWindowEnd },
        })
        .exec();

      if (paymentCount > 0) {
        paymentsAfterReminder++;
      }
    }

    return {
      remindersSent,
      paymentsAfterReminder,
      outcomeRate:
        remindersSent > 0 ? paymentsAfterReminder / remindersSent : 0,
    };
  }
}
