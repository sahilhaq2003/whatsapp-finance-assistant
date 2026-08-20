import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinancialSummary, FinancialSummaryDocument } from '../schemas/financial-summary.schema';
import { SummaryPreference, SummaryPreferenceDocument } from '../schemas/summary-preference.schema';
import { SummaryFrequency } from '../enums/summary-frequency.enum';
import { SummaryStatus } from '../enums/summary-status.enum';
import { WeeklyDay } from '../enums/weekly-day.enum';
import { SummaryPreferencesService } from './summary-preferences.service';
import { FinancialSummaryService } from './financial-summary.service';

@Injectable()
export class SummarySchedulerService {
  private readonly logger = new Logger(SummarySchedulerService.name);

  constructor(
    @InjectModel(FinancialSummary.name)
    private summaryModel: Model<FinancialSummaryDocument>,
    @InjectModel(SummaryPreference.name)
    private prefModel: Model<SummaryPreferenceDocument>,
    private readonly preferencesService: SummaryPreferencesService,
    private readonly financialSummaryService: FinancialSummaryService,
  ) {}

  async checkAndGenerateDaily(): Promise<void> {
    const prefs = await this.prefModel.find({ dailyEnabled: true });

    for (const pref of prefs) {
      try {
        const businessId = pref.businessId.toString();
        const tz = pref.timezone || 'Asia/Colombo';
        const now = new Date();

        const localNow = this.toLocalDate(now, tz);
        const periodStart = this.getStartOfDay(localNow, tz);
        const periodEnd = this.getEndOfDay(localNow, tz);

        const isWithinWindow = this.isWithinSendWindow(
          now, tz, pref.dailySendHour, pref.dailySendMinute, 15,
        );
        if (!isWithinWindow) continue;

        const jobId = `summary:${businessId}:daily:${this.formatDateKey(periodStart)}`;
        const existing = await this.summaryModel.findOne({ deduplicationKey: jobId });
        if (existing) continue;

        await this.generateAndStore(businessId, SummaryFrequency.DAILY, periodStart, periodEnd, tz, jobId);
      } catch (error) {
        this.logger.error(`Error generating daily summary for ${pref.businessId}: ${error}`);
      }
    }
  }

  async checkAndGenerateWeekly(): Promise<void> {
    const prefs = await this.prefModel.find({ weeklyEnabled: true });

    for (const pref of prefs) {
      try {
        const businessId = pref.businessId.toString();
        const tz = pref.timezone || 'Asia/Colombo';
        const now = new Date();

        const localNow = this.toLocalDate(now, tz);
        const currentDay = this.getLocalDayOfWeek(localNow, tz);
        const targetDay = pref.weeklyDay || WeeklyDay.SUNDAY;

        if (currentDay.toLowerCase() !== targetDay.toLowerCase()) continue;

        const isWithinWindow = this.isWithinSendWindow(
          now, tz, pref.weeklySendHour, pref.weeklySendMinute, 15,
        );
        if (!isWithinWindow) continue;

        const { periodStart, periodEnd } = this.getWeeklyPeriod(now, tz, targetDay);

        const weekKey = this.getWeekKey(periodStart);
        const jobId = `summary:${businessId}:weekly:${weekKey}`;
        const existing = await this.summaryModel.findOne({ deduplicationKey: jobId });
        if (existing) continue;

        await this.generateAndStore(businessId, SummaryFrequency.WEEKLY, periodStart, periodEnd, tz, jobId);
      } catch (error) {
        this.logger.error(`Error generating weekly summary for ${pref.businessId}: ${error}`);
      }
    }
  }

  private async generateAndStore(
    businessId: string,
    frequency: SummaryFrequency,
    periodStart: Date,
    periodEnd: Date,
    timezone: string,
    deduplicationKey: string,
  ): Promise<FinancialSummaryDocument | null> {
    try {
      const data = await this.financialSummaryService.generateSummary(
        businessId, periodStart, periodEnd,
      );

      const summary = await this.summaryModel.create({
        businessId: new Types.ObjectId(businessId),
        frequency,
        periodStart,
        periodEnd,
        timezone,
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

      this.logger.log(`Generated ${frequency} summary for ${businessId}: ${deduplicationKey}`);
      return summary;
    } catch (error) {
      this.logger.error(`Failed to generate summary for ${businessId}: ${error}`);
      return null;
    }
  }

  async generatePreview(
    businessId: string,
    frequency: SummaryFrequency,
  ): Promise<{
    periodStart: string;
    periodEnd: string;
    currency: string;
    income: number;
    expenses: number;
    netCashFlow: number;
    transactionCount: number;
    outstandingAmount: number;
    outstandingInvoiceCount: number;
  }> {
    const pref = await this.preferencesService.getPreferences(businessId);
    const tz = pref.timezone || 'Asia/Colombo';
    const now = new Date();
    const localNow = this.toLocalDate(now, tz);

    let periodStart: Date;
    let periodEnd: Date;

    if (frequency === SummaryFrequency.DAILY) {
      periodStart = this.getStartOfDay(localNow, tz);
      periodEnd = this.getEndOfDay(localNow, tz);
    } else {
      const { periodStart: ps, periodEnd: pe } = this.getWeeklyPeriod(now, tz, pref.weeklyDay || WeeklyDay.SUNDAY);
      periodStart = ps;
      periodEnd = pe;
    }

    const data = await this.financialSummaryService.generateSummary(
      businessId, periodStart, periodEnd,
    );

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      currency: data.currency,
      income: data.incomeMinor,
      expenses: data.expenseMinor,
      netCashFlow: data.netCashFlowMinor,
      transactionCount: data.transactionCount,
      outstandingAmount: data.outstandingAmountMinor,
      outstandingInvoiceCount: data.outstandingInvoiceCount,
    };
  }

  private toLocalDate(date: Date, timezone: string): Date {
    const str = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(str);
  }

  private getStartOfDay(localDate: Date, timezone: string): Date {
    const y = localDate.getFullYear();
    const m = localDate.getMonth();
    const d = localDate.getDate();
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  private getEndOfDay(localDate: Date, timezone: string): Date {
    const y = localDate.getFullYear();
    const m = localDate.getMonth();
    const d = localDate.getDate();
    return new Date(y, m, d, 23, 59, 59, 999);
  }

  private isWithinSendWindow(
    now: Date,
    timezone: string,
    sendHour: number,
    sendMinute: number,
    windowMinutes: number,
  ): boolean {
    const localNow = this.toLocalDate(now, timezone);
    const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();
    const targetMinutes = sendHour * 60 + sendMinute;
    return Math.abs(currentMinutes - targetMinutes) <= windowMinutes;
  }

  private getLocalDayOfWeek(localDate: Date, timezone: string): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[localDate.getDay()];
  }

  private getWeeklyPeriod(
    now: Date,
    timezone: string,
    targetDay: WeeklyDay,
  ): { periodStart: Date; periodEnd: Date } {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const targetDayNum = dayMap[targetDay.toLowerCase()] ?? 0;
    const localNow = this.toLocalDate(now, timezone);
    const currentDay = localNow.getDay();

    let daysBack: number;
    if (targetDayNum === 0) {
      daysBack = currentDay === 0 ? 7 : currentDay;
    } else {
      daysBack = currentDay >= targetDayNum ? currentDay - targetDayNum : 7 - (targetDayNum - currentDay);
    }

    const periodEnd = new Date(localNow);
    periodEnd.setDate(periodEnd.getDate() - (daysBack > 0 ? 1 : 0));
    periodEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    return { periodStart, periodEnd };
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekKey(periodStart: Date): string {
    const d = new Date(periodStart);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  async getDueSummaries(): Promise<FinancialSummaryDocument[]> {
    return this.summaryModel.find({
      status: SummaryStatus.GENERATED,
    }).sort({ generatedAt: 1 });
  }
}
