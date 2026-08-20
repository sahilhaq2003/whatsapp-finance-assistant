import { Injectable, BadRequestException } from '@nestjs/common';
import { ReportPeriod } from '../enums/report-period.enum';
import { ReportPeriodResult } from '../interfaces/report-period.interface';

const MAX_RANGE_DAYS = 5 * 365;

@Injectable()
export class ReportPeriodService {
  resolve(period: ReportPeriod | undefined, dateFrom?: string, dateTo?: string, timezone = 'Asia/Colombo'): ReportPeriodResult {
    if (period === ReportPeriod.CUSTOM) {
      return this.resolveCustom(dateFrom, dateTo, timezone);
    }
    if (period) {
      return this.resolvePreset(period, timezone);
    }
    return this.resolvePreset(ReportPeriod.THIS_MONTH, timezone);
  }

  private resolvePreset(period: ReportPeriod, timezone: string): ReportPeriodResult {
    const now = new Date();
    const today = this.getStartOfDay(now, timezone);

    switch (period) {
      case ReportPeriod.TODAY:
        return { startDate: today, endDate: now, label: 'Today' };

      case ReportPeriod.YESTERDAY: {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        return { startDate: yesterday, endDate: endOfYesterday, label: 'Yesterday' };
      }

      case ReportPeriod.THIS_WEEK: {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { startDate: weekStart, endDate: now, label: 'This Week' };
      }

      case ReportPeriod.LAST_WEEK: {
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        lastWeekEnd.setHours(23, 59, 59, 999);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        lastWeekStart.setHours(0, 0, 0, 0);
        return { startDate: lastWeekStart, endDate: lastWeekEnd, label: 'Last Week' };
      }

      case ReportPeriod.THIS_MONTH: {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: monthStart, endDate: now, label: 'This Month' };
      }

      case ReportPeriod.LAST_MONTH: {
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { startDate: lastMonthStart, endDate: lastMonthEnd, label: 'Last Month' };
      }

      case ReportPeriod.THIS_YEAR: {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { startDate: yearStart, endDate: now, label: 'This Year' };
      }

      default:
        return { startDate: today, endDate: now, label: 'This Month' };
    }
  }

  private resolveCustom(dateFrom?: string, dateTo?: string, timezone = 'Asia/Colombo'): ReportPeriodResult {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException('Custom period requires dateFrom and dateTo');
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (startDate > endDate) {
      throw new BadRequestException('dateFrom must be before or equal to dateTo');
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    endDate.setHours(23, 59, 59, 999);

    return {
      startDate,
      endDate,
      label: `${dateFrom} to ${dateTo}`,
    };
  }

  getTrendGranularity(startDate: Date, endDate: Date): 'day' | 'week' | 'month' {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 31) return 'day';
    if (diffDays <= 180) return 'week';
    return 'month';
  }

  private getStartOfDay(date: Date, timezone: string): Date {
    try {
      const formatted = date.toLocaleDateString('en-CA', { timeZone: timezone });
      return new Date(`${formatted}T00:00:00.000Z`);
    } catch {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      return result;
    }
  }
}
