import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../transactions/schemas/transaction.schema';
import {
  Invoice,
  InvoiceDocument,
} from '../../invoices/schemas/invoice.schema';
import {
  Payment,
  PaymentDocument,
} from '../../payments/schemas/payment.schema';
import {
  BetaEnrollment,
  BetaEnrollmentDocument,
} from '../../beta/schemas/beta-enrollment.schema';
import { RetentionService } from './retention.service';
import { AiQualityMetricsService } from './ai-quality-metrics.service';
import {
  BetaMetricsResponse,
  RateResult,
} from '../interfaces/metrics.interface';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class ProductMetricsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(BetaEnrollment.name)
    private betaEnrollmentModel: Model<BetaEnrollmentDocument>,
    private readonly retentionService: RetentionService,
    private readonly aiQualityMetricsService: AiQualityMetricsService,
  ) {}

  async getBetaMetrics(
    dateFrom?: string,
    dateTo?: string,
    cohort?: string,
  ): Promise<BetaMetricsResponse> {
    const start = new Date(dateFrom || Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(dateTo || Date.now());

    const [
      weeklyActiveBusinesses,
      d7Retention,
      d30Retention,
      whatsappConfirmationSuccess,
      aiCorrectionRate,
      aiClarificationRate,
      invoiceAdoption,
      voiceQuality,
      reminderOutcome,
    ] = await Promise.all([
      this.getWeeklyActiveBusinesses(start, end),
      this.retentionService.getD7Retention(dateFrom, cohort),
      this.retentionService.getD30Retention(dateFrom, cohort),
      this.aiQualityMetricsService.getWhatsAppConfirmationSuccess(start, end),
      this.aiQualityMetricsService.getCorrectionRate(start, end),
      this.aiQualityMetricsService.getClarificationRate(start, end),
      this.getInvoiceAdoption(start, end),
      this.aiQualityMetricsService.getVoiceQuality(start, end),
      this.aiQualityMetricsService.getReminderOutcome(start, end),
    ]);

    const transactionsPerActiveBusiness =
      await this.getTransactionsPerActiveBusiness(
        start,
        end,
        weeklyActiveBusinesses,
      );

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      weeklyActiveBusinesses,
      transactionsPerActiveBusiness,
      d7Retention,
      d30Retention,
      whatsappConfirmationSuccess,
      aiCorrectionRate,
      aiClarificationRate,
      invoiceAdoption,
      voiceQuality,
      reminderOutcome,
    };
  }

  async getWeeklyActiveBusinesses(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<number> {
    const pipeline = [
      {
        $match: {
          date: { $gte: dateFrom, $lte: dateTo },
          status: TransactionStatus.CONFIRMED,
        },
      },
      {
        $group: {
          _id: '$businessId',
        },
      },
      {
        $count: 'count',
      },
    ];

    const txBusinesses = await this.transactionModel.aggregate(pipeline).exec();

    const invoicePipeline = [
      {
        $match: {
          issuedAt: { $gte: dateFrom, $lte: dateTo },
          status: InvoiceStatus.ISSUED,
        },
      },
      {
        $group: {
          _id: '$businessId',
        },
      },
    ];

    const invoiceBusinesses = await this.invoiceModel
      .aggregate(invoicePipeline)
      .exec();

    const paymentPipeline = [
      {
        $match: {
          date: { $gte: dateFrom, $lte: dateTo },
          status: PaymentStatus.CONFIRMED,
        },
      },
      {
        $group: {
          _id: '$businessId',
        },
      },
    ];

    const paymentBusinesses = await this.paymentModel
      .aggregate(paymentPipeline)
      .exec();

    const businessIds = new Set<string>();

    for (const doc of txBusinesses) {
      businessIds.add(doc._id.toString());
    }
    for (const doc of invoiceBusinesses) {
      businessIds.add(doc._id.toString());
    }
    for (const doc of paymentBusinesses) {
      businessIds.add(doc._id.toString());
    }

    return businessIds.size;
  }

  async getTransactionsPerActiveBusiness(
    dateFrom: Date,
    dateTo: Date,
    activeBusinessCount?: number,
  ): Promise<number> {
    const activeBusinesses =
      activeBusinessCount ??
      (await this.getWeeklyActiveBusinesses(dateFrom, dateTo));

    if (activeBusinesses === 0) {
      return 0;
    }

    const result = await this.transactionModel
      .aggregate([
        {
          $match: {
            date: { $gte: dateFrom, $lte: dateTo },
            status: TransactionStatus.CONFIRMED,
          },
        },
        {
          $count: 'total',
        },
      ])
      .exec();

    const totalTransactions = result.length > 0 ? result[0].total : 0;
    return totalTransactions / activeBusinesses;
  }

  async getInvoiceAdoption(dateFrom: Date, dateTo: Date): Promise<RateResult> {
    const activeBusinessPipeline = [
      {
        $match: {
          $or: [
            {
              date: { $gte: dateFrom, $lte: dateTo },
              status: TransactionStatus.CONFIRMED,
            },
            {
              issuedAt: { $gte: dateFrom, $lte: dateTo },
              status: InvoiceStatus.ISSUED,
            },
            {
              date: { $gte: dateFrom, $lte: dateTo },
              status: PaymentStatus.CONFIRMED,
            },
          ],
        },
      },
      {
        $group: {
          _id: '$businessId',
        },
      },
    ];

    const [txActive, invoiceActive, paymentActive] = await Promise.all([
      this.transactionModel
        .aggregate([
          ...activeBusinessPipeline,
          { $group: { _id: '$businessId' } },
        ])
        .exec(),
      this.invoiceModel
        .aggregate([
          {
            $match: {
              issuedAt: { $gte: dateFrom, $lte: dateTo },
              status: InvoiceStatus.ISSUED,
            },
          },
          { $group: { _id: '$businessId' } },
        ])
        .exec(),
      this.paymentModel
        .aggregate([
          {
            $match: {
              date: { $gte: dateFrom, $lte: dateTo },
              status: PaymentStatus.CONFIRMED,
            },
          },
          { $group: { _id: '$businessId' } },
        ])
        .exec(),
    ]);

    const activeBusinessIds = new Set<string>();
    for (const doc of txActive) {
      activeBusinessIds.add(doc._id.toString());
    }
    for (const doc of invoiceActive) {
      activeBusinessIds.add(doc._id.toString());
    }
    for (const doc of paymentActive) {
      activeBusinessIds.add(doc._id.toString());
    }

    const invoiceBusinessIds = new Set<string>();
    for (const doc of invoiceActive) {
      invoiceBusinessIds.add(doc._id.toString());
    }

    const denominator = activeBusinessIds.size;
    const numerator = [...invoiceBusinessIds].filter((id) =>
      activeBusinessIds.has(id),
    ).length;

    return {
      denominator,
      numerator,
      rate: denominator > 0 ? numerator / denominator : 0,
    };
  }
}
