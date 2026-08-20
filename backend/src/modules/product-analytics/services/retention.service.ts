import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BetaEnrollment,
  BetaEnrollmentDocument,
} from '../../beta/schemas/beta-enrollment.schema';
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
  Business,
  BusinessDocument,
} from '../../businesses/schemas/business.schema';
import { RetentionResult } from '../interfaces/metrics.interface';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class RetentionService {
  constructor(
    @InjectModel(BetaEnrollment.name)
    private betaEnrollmentModel: Model<BetaEnrollmentDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
  ) {}

  async getD7Retention(
    dateFrom?: string,
    cohort?: string,
  ): Promise<RetentionResult> {
    return this.getRetention(7, dateFrom, cohort);
  }

  async getD30Retention(
    dateFrom?: string,
    cohort?: string,
  ): Promise<RetentionResult> {
    return this.getRetention(30, dateFrom, cohort);
  }

  private async getRetention(
    days: number,
    dateFrom?: string,
    cohort?: string,
  ): Promise<RetentionResult> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const query: Record<string, unknown> = {
      firstMeaningfulActivityAt: { $lte: cutoffDate },
    };

    if (cohort) {
      query.cohort = cohort;
    }

    if (dateFrom) {
      query.firstMeaningfulActivityAt = {
        ...(query.firstMeaningfulActivityAt as Record<string, unknown>),
        $gte: new Date(dateFrom),
      };
    }

    const enrollments = await this.betaEnrollmentModel
      .find(query)
      .lean()
      .exec();

    if (enrollments.length === 0) {
      return { eligibleBusinesses: 0, retainedBusinesses: 0, rate: 0 };
    }

    let retainedCount = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.firstMeaningfulActivityAt) continue;

      const retentionDate = new Date(
        enrollment.firstMeaningfulActivityAt.getTime() +
          days * 24 * 60 * 60 * 1000,
      );

      if (retentionDate > now) continue;

      const hasActivity = await this.hasActivityOnDay(
        enrollment.businessId.toString(),
        retentionDate,
      );

      if (hasActivity) {
        retainedCount++;
      }
    }

    const eligibleBusinesses = enrollments.filter(
      (e) =>
        e.firstMeaningfulActivityAt &&
        new Date(
          e.firstMeaningfulActivityAt.getTime() + days * 24 * 60 * 60 * 1000,
        ) <= now,
    ).length;

    return {
      eligibleBusinesses,
      retainedBusinesses: retainedCount,
      rate: eligibleBusinesses > 0 ? retainedCount / eligibleBusinesses : 0,
    };
  }

  async hasActivityOnDay(businessId: string, date: Date): Promise<boolean> {
    const dayStart = this.getStartOfDay(date);
    const dayEnd = this.getEndOfDay(date);

    const [txCount, invoiceCount, paymentCount] = await Promise.all([
      this.transactionModel
        .countDocuments({
          businessId,
          date: { $gte: dayStart, $lte: dayEnd },
          status: TransactionStatus.CONFIRMED,
        })
        .exec(),
      this.invoiceModel
        .countDocuments({
          businessId,
          issuedAt: { $gte: dayStart, $lte: dayEnd },
          status: InvoiceStatus.ISSUED,
        })
        .exec(),
      this.paymentModel
        .countDocuments({
          businessId,
          date: { $gte: dayStart, $lte: dayEnd },
          status: PaymentStatus.CONFIRMED,
        })
        .exec(),
    ]);

    return txCount > 0 || invoiceCount > 0 || paymentCount > 0;
  }

  async getBusinessTimezone(businessId: string): Promise<string> {
    const business = await this.businessModel
      .findById(businessId)
      .select('timezone')
      .lean()
      .exec();

    return business?.timezone || 'Asia/Colombo';
  }

  private getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }
}
