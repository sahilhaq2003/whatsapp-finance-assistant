import { Injectable, Logger } from '@nestjs/common';
import { DateRangePreset } from '../../enums/business-query.enums';
import type { DateRange, ResolvedDateRange } from '../interfaces/business-query.interface';

@Injectable()
export class BusinessQueryDateService {
  private readonly logger = new Logger(BusinessQueryDateService.name);

  resolveDateRange(
    dateRange?: { preset?: string; startDate?: string | null; endDate?: string | null },
    timezone: string = 'Asia/Colombo',
  ): ResolvedDateRange {
    if (!dateRange || !dateRange.preset) {
      const resolved = this.resolvePreset(DateRangePreset.THIS_MONTH, timezone);
      return resolved;
    }

    if (dateRange.preset === DateRangePreset.CUSTOM) {
      return this.resolveCustomRange(dateRange.startDate, dateRange.endDate, timezone);
    }

    const preset = dateRange.preset as DateRangePreset;
    return this.resolvePreset(preset, timezone);
  }

  private resolvePreset(preset: DateRangePreset, timezone: string): ResolvedDateRange {
    const now = new Date();
    const today = this.getLocalDate(now, timezone);

    switch (preset) {
      case DateRangePreset.TODAY:
        return {
          startDate: today,
          endDate: today,
          label: 'today',
        };

      case DateRangePreset.YESTERDAY: {
        const yesterday = new Date(today + 'T12:00:00');
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.getLocalDate(yesterday, timezone);
        return {
          startDate: yesterdayStr,
          endDate: yesterdayStr,
          label: 'yesterday',
        };
      }

      case DateRangePreset.THIS_WEEK: {
        const weekStart = this.getWeekStart(today);
        return {
          startDate: weekStart,
          endDate: today,
          label: 'this week',
        };
      }

      case DateRangePreset.LAST_WEEK: {
        const thisWeekStart = this.getWeekStart(today);
        const lastWeekStart = new Date(thisWeekStart + 'T12:00:00');
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart + 'T12:00:00');
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        return {
          startDate: this.getLocalDate(lastWeekStart, timezone),
          endDate: this.getLocalDate(lastWeekEnd, timezone),
          label: 'last week',
        };
      }

      case DateRangePreset.THIS_MONTH: {
        const monthStart = today.substring(0, 7) + '-01';
        return {
          startDate: monthStart,
          endDate: today,
          label: 'this month',
        };
      }

      case DateRangePreset.LAST_MONTH: {
        const year = parseInt(today.substring(0, 4));
        const month = parseInt(today.substring(5, 7));
        const lastMonthDate = new Date(year, month - 2, 15);
        const lastMonthStr = this.getLocalDate(lastMonthDate, timezone);
        const lmStart = lastMonthStr.substring(0, 7) + '-01';
        const lastDayOfPrevMonth = new Date(year, month - 1, 0);
        const lmEnd = this.getLocalDate(lastDayOfPrevMonth, timezone);
        return {
          startDate: lmStart,
          endDate: lmEnd,
          label: 'last month',
        };
      }

      case DateRangePreset.THIS_YEAR: {
        const yearStart = today.substring(0, 4) + '-01-01';
        return {
          startDate: yearStart,
          endDate: today,
          label: 'this year',
        };
      }

      default:
        this.logger.warn(`Unknown date preset "${preset}", falling back to this month`);
        return this.resolvePreset(DateRangePreset.THIS_MONTH, timezone);
    }
  }

  private resolveCustomRange(
    startDate?: string | null,
    endDate?: string | null,
    timezone: string = 'Asia/Colombo',
  ): ResolvedDateRange {
    const today = this.getLocalDate(new Date(), timezone);

    const start = startDate && this.isValidDateStr(startDate) ? startDate : today;
    const end = endDate && this.isValidDateStr(endDate) ? endDate : today;

    if (start > end) {
      this.logger.warn(`Custom date range start "${start}" > end "${end}", swapping`);
      return {
        startDate: end,
        endDate: start,
        label: `${end} to ${start}`,
      };
    }

    return {
      startDate: start,
      endDate: end,
      label: `${start} to ${end}`,
    };
  }

  private getLocalDate(date: Date, timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
    } catch {
      return new Intl.DateTimeFormat('en-CA').format(date);
    }
  }

  private getWeekStart(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
  }

  private isValidDateStr(str: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str + 'T00:00:00').getTime());
  }

  getStartOfDay(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00.000Z');
  }

  getEndOfDay(dateStr: string): Date {
    return new Date(dateStr + 'T23:59:59.999Z');
  }
}
