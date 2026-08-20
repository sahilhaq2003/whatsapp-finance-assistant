import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UsageCounter,
  UsageCounterDocument,
} from '../schemas/usage-counter.schema';
import { UsageMetric } from '../enums/usage-metric.enum';
import { EntitlementsService } from '../../entitlements/services/entitlements.service';

const METRIC_TO_LIMIT_KEY: Partial<Record<UsageMetric, string>> = {
  [UsageMetric.AI_REQUESTS]: 'aiRequestsPerMonth',
  [UsageMetric.VOICE_SECONDS]: 'voiceMinutesPerMonth',
  [UsageMetric.CUSTOMERS_CREATED]: 'customersPerMonth',
  [UsageMetric.INVOICES_CREATED]: 'invoicesPerMonth',
  [UsageMetric.REMINDERS_SENT]: 'remindersPerMonth',
  [UsageMetric.REPORT_EXPORTS]: 'exportsPerMonth',
};

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(UsageCounter.name)
    private readonly counterModel: Model<UsageCounterDocument>,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async incrementUsage(
    businessId: string,
    metric: UsageMetric,
    amount: number = 1,
  ): Promise<UsageCounterDocument> {
    const periodKey = this.getPeriodKey();

    return this.counterModel
      .findOneAndUpdate(
        {
          businessId: new (this.counterModel.db as any).Types.ObjectId(
            businessId,
          ),
          metric,
          periodType: 'month',
          periodKey,
        },
        {
          $inc: { quantity: amount },
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            businessId: new (this.counterModel.db as any).Types.ObjectId(
              businessId,
            ),
            metric,
            periodType: 'month',
            periodKey,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async getUsage(
    businessId: string,
    periodKey?: string,
  ): Promise<UsageCounterDocument[]> {
    const key = periodKey || this.getPeriodKey();
    return this.counterModel
      .find({
        businessId: new (this.counterModel.db as any).Types.ObjectId(
          businessId,
        ),
        periodType: 'month',
        periodKey: key,
      })
      .lean()
      .exec();
  }

  async checkQuota(
    businessId: string,
    metric: UsageMetric,
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }> {
    const limits = await this.entitlementsService.getLimits(businessId);
    const limitKey = METRIC_TO_LIMIT_KEY[metric];

    if (!limitKey) {
      return { allowed: true, current: 0, limit: -1, remaining: -1 };
    }

    const limitValue = (limits as Record<string, number>)[limitKey] ?? 0;

    if (limitValue === -1) {
      return { allowed: true, current: 0, limit: -1, remaining: -1 };
    }

    const periodKey = this.getPeriodKey();
    const counter = await this.counterModel
      .findOne({
        businessId: new (this.counterModel.db as any).Types.ObjectId(
          businessId,
        ),
        metric,
        periodType: 'month',
        periodKey,
      })
      .lean()
      .exec();

    const current = counter?.quantity ?? 0;
    const remaining = Math.max(0, limitValue - current);

    return {
      allowed: current < limitValue,
      current,
      limit: limitValue,
      remaining,
    };
  }

  async consumeQuota(
    businessId: string,
    metric: UsageMetric,
    amount: number = 1,
  ): Promise<{ allowed: boolean; usage: UsageCounterDocument }> {
    const quota = await this.checkQuota(businessId, metric);

    if (!quota.allowed) {
      const counter = await this.counterModel
        .findOne({
          businessId: new (this.counterModel.db as any).Types.ObjectId(
            businessId,
          ),
          metric,
          periodType: 'month',
          periodKey: this.getPeriodKey(),
        })
        .lean()
        .exec();

      return {
        allowed: false,
        usage: counter!,
      };
    }

    const updated = await this.incrementUsage(businessId, metric, amount);
    return { allowed: true, usage: updated };
  }

  getPeriodKey(date?: Date): string {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  async resetMonthlyUsage(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const cutoffKey = this.getPeriodKey(cutoff);

    await this.counterModel
      .deleteMany({
        periodType: 'month',
        periodKey: { $lt: cutoffKey },
      })
      .exec();
  }
}
