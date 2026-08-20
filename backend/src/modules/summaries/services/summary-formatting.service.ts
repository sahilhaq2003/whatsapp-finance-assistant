import { Injectable, Logger } from '@nestjs/common';
import { SummaryFrequency } from '../enums/summary-frequency.enum';

@Injectable()
export class SummaryFormattingService {
  private readonly logger = new Logger(SummaryFormattingService.name);

  formatCurrency(amountMinor: number, currency: string): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: currency || 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);
  }

  formatDate(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    }).format(date);
  }

  formatPeriodRange(start: Date, end: Date, timezone: string): string {
    const startStr = this.formatDate(start, timezone);
    const endStr = this.formatDate(end, timezone);
    return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
  }

  formatDailySummary(data: {
    periodStart: Date;
    periodEnd: Date;
    timezone: string;
    currency: string;
    incomeMinor: number;
    expenseMinor: number;
    netCashFlowMinor: number;
    transactionCount: number;
    outstandingAmountMinor: number;
    outstandingInvoiceCount: number;
  }): string {
    const lines: string[] = [];
    lines.push('Daily Business Summary');
    lines.push(this.formatDate(data.periodStart, data.timezone));
    lines.push('');
    lines.push(`Income: ${this.formatCurrency(data.incomeMinor, data.currency)}`);
    lines.push(`Expenses: ${this.formatCurrency(data.expenseMinor, data.currency)}`);
    lines.push(`Net cash flow: ${this.formatCurrency(data.netCashFlowMinor, data.currency)}`);
    lines.push(`Transactions: ${data.transactionCount}`);
    lines.push('');
    lines.push('Outstanding invoices:');
    lines.push(
      `${this.formatCurrency(data.outstandingAmountMinor, data.currency)} across ${data.outstandingInvoiceCount} invoice${data.outstandingInvoiceCount !== 1 ? 's' : ''}`,
    );
    return lines.join('\n');
  }

  formatWeeklySummary(data: {
    periodStart: Date;
    periodEnd: Date;
    timezone: string;
    currency: string;
    incomeMinor: number;
    expenseMinor: number;
    netCashFlowMinor: number;
    transactionCount: number;
    outstandingAmountMinor: number;
    outstandingInvoiceCount: number;
    overdueAmountMinor: number;
    overdueInvoiceCount: number;
    topExpenseCategories: Array<{ name: string; amountMinor: number }>;
  }): string {
    const lines: string[] = [];
    lines.push('Weekly Business Summary');
    lines.push(this.formatPeriodRange(data.periodStart, data.periodEnd, data.timezone));
    lines.push('');
    lines.push(`Income: ${this.formatCurrency(data.incomeMinor, data.currency)}`);
    lines.push(`Expenses: ${this.formatCurrency(data.expenseMinor, data.currency)}`);
    lines.push(`Net cash flow: ${this.formatCurrency(data.netCashFlowMinor, data.currency)}`);
    lines.push(`Transactions: ${data.transactionCount}`);
    lines.push('');

    if (data.topExpenseCategories.length > 0) {
      lines.push('Top expense categories:');
      data.topExpenseCategories.slice(0, 3).forEach((cat, i) => {
        lines.push(`${i + 1}. ${cat.name} — ${this.formatCurrency(cat.amountMinor, data.currency)}`);
      });
      lines.push('');
    }

    lines.push('Outstanding:');
    lines.push(
      `${this.formatCurrency(data.outstandingAmountMinor, data.currency)} across ${data.outstandingInvoiceCount} invoice${data.outstandingInvoiceCount !== 1 ? 's' : ''}`,
    );

    if (data.overdueInvoiceCount > 0) {
      lines.push('');
      lines.push('Overdue:');
      lines.push(
        `${this.formatCurrency(data.overdueAmountMinor, data.currency)} across ${data.overdueInvoiceCount} invoice${data.overdueInvoiceCount !== 1 ? 's' : ''}`,
      );
    }

    return lines.join('\n');
  }

  formatNoActivitySummary(data: {
    periodStart: Date;
    timezone: string;
    currency: string;
    outstandingAmountMinor: number;
    outstandingInvoiceCount: number;
  }): string {
    const lines: string[] = [];
    lines.push('Daily Business Summary');
    lines.push(this.formatDate(data.periodStart, data.timezone));
    lines.push('');
    lines.push('No confirmed income or expenses were recorded today.');
    lines.push('');
    lines.push('Outstanding invoices:');
    lines.push(
      `${this.formatCurrency(data.outstandingAmountMinor, data.currency)} across ${data.outstandingInvoiceCount} invoice${data.outstandingInvoiceCount !== 1 ? 's' : ''}`,
    );
    return lines.join('\n');
  }
}
