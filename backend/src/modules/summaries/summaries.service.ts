import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinancialSummary, FinancialSummaryDocument } from './schemas/financial-summary.schema';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { SummaryFrequency } from './enums/summary-frequency.enum';
import { SummaryStatus } from './enums/summary-status.enum';
import { WeeklyDay } from './enums/weekly-day.enum';
import { SummarySchedulerService } from './services/summary-scheduler.service';

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);

  constructor(
    @InjectModel(FinancialSummary.name)
    private summaryModel: Model<FinancialSummaryDocument>,
    private readonly schedulerService: SummarySchedulerService,
  ) {}

  async findAll(
    businessId: string,
    query: SummaryQueryDto,
  ): Promise<{
    items: FinancialSummaryDocument[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };
    if (query.frequency) filter.frequency = query.frequency;
    if (query.status) filter.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.summaryModel
        .find(filter)
        .sort({ periodStart: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.summaryModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(businessId: string, summaryId: string): Promise<FinancialSummaryDocument> {
    const summary = await this.summaryModel.findOne({
      _id: new Types.ObjectId(summaryId),
      businessId: new Types.ObjectId(businessId),
    });
    if (!summary) {
      throw new NotFoundException('Summary not found');
    }
    return summary;
  }

  async generateManual(
    businessId: string,
    frequency: SummaryFrequency,
  ): Promise<FinancialSummaryDocument> {
    const pref = await this.schedulerService['prefModel'].findOne({
      businessId: new Types.ObjectId(businessId),
    });
    const tz = pref?.timezone || 'Asia/Colombo';

    const now = new Date();
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    let periodStart: Date;
    let periodEnd: Date;

    if (frequency === SummaryFrequency.DAILY) {
      const y = localNow.getFullYear();
      const m = localNow.getMonth();
      const d = localNow.getDate();
      periodStart = new Date(y, m, d, 0, 0, 0, 0);
      periodEnd = new Date(y, m, d, 23, 59, 59, 999);
    } else {
      const result = await this.schedulerService['getWeeklyPeriod'](now, tz, pref?.weeklyDay || WeeklyDay.SUNDAY);
      periodStart = result.periodStart;
      periodEnd = result.periodEnd;
    }

    const data = await this.schedulerService['financialSummaryService'].generateSummary(
      businessId, periodStart, periodEnd,
    );

    const dateKey = periodStart.toISOString().split('T')[0];
    const deduplicationKey = `manual:${businessId}:${frequency}:${dateKey}:${Date.now()}`;

    const summary = await this.summaryModel.create({
      businessId: new Types.ObjectId(businessId),
      frequency,
      periodStart,
      periodEnd,
      timezone: tz,
      currency: data.currency,
      incomeMinor: data.incomeMinor,
      expenseMinor: data.expenseMinor,
      netCashFlowMinor: data.netCashFlowMinor,
      transactionCount: data.transactionCount,
      outstandingAmountMinor: data.outstandingAmountMinor,
      outstandingInvoiceCount: data.outstandingInvoiceCount,
      overdueAmountMinor: data.overdueAmountMinor,
      overdueInvoiceCount: data.overdueInvoiceCount,
      topExpenseCategories: data.topExpenseCategories,
      topIncomeCategories: data.topIncomeCategories,
      status: SummaryStatus.GENERATED,
      generatedAt: new Date(),
      deduplicationKey,
    } as any);

    return summary;
  }
}
