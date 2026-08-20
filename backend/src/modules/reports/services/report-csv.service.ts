import { Injectable } from '@nestjs/common';
import { ReportType } from '../enums/report-type.enum';
import {
  TransactionReportRow,
  OutstandingInvoiceRow,
  PaymentReportRow,
} from '../interfaces/financial-overview.interface';

@Injectable()
export class ReportCsvService {
  generateTransactionsCsv(rows: TransactionReportRow[], currency: string): string {
    const headers = ['Date', 'Type', 'Description', 'Customer', 'Category', 'Payment Method', 'Amount', 'Currency', 'Status', 'Source'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      csvRows.push([
        this.escapeCsvDate(row.date),
        this.escapeCsvValue(row.type),
        this.escapeCsvText(row.description),
        this.escapeCsvText(row.customerName),
        this.escapeCsvText(row.categoryName),
        this.escapeCsvValue(row.paymentMethod),
        this.formatMinorAmount(row.amount, currency),
        this.escapeCsvValue(currency),
        this.escapeCsvValue(row.status),
        this.escapeCsvValue(row.source),
      ].join(','));
    }

    return '\uFEFF' + csvRows.join('\n');
  }

  generateOutstandingCsv(rows: OutstandingInvoiceRow[], currency: string): string {
    const headers = ['Invoice Number', 'Customer', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Remaining', 'Payment Status', 'Overdue'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      csvRows.push([
        this.escapeCsvText(row.invoiceNumber),
        this.escapeCsvText(row.customerName),
        this.escapeCsvDate(row.issueDate),
        row.dueDate ? this.escapeCsvDate(row.dueDate) : '',
        this.formatMinorAmount(row.total, currency),
        this.formatMinorAmount(row.paid, currency),
        this.formatMinorAmount(row.remaining, currency),
        this.escapeCsvValue(row.paymentStatus),
        this.escapeCsvValue(row.isOverdue ? 'Yes' : 'No'),
      ].join(','));
    }

    return '\uFEFF' + csvRows.join('\n');
  }

  generatePaymentsCsv(rows: PaymentReportRow[], currency: string): string {
    const headers = ['Date', 'Customer', 'Invoice', 'Method', 'Reference', 'Amount', 'Status'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      csvRows.push([
        this.escapeCsvDate(row.date),
        this.escapeCsvText(row.customerName),
        this.escapeCsvText(row.invoiceNumber),
        this.escapeCsvValue(row.method),
        this.escapeCsvText(row.reference),
        this.formatMinorAmount(row.amount, currency),
        this.escapeCsvValue(row.status),
      ].join(','));
    }

    return '\uFEFF' + csvRows.join('\n');
  }

  generateCategoryCsv(categories: Array<{ name: string; amount: number; transactionCount: number; percentage: number }>, currency: string): string {
    const headers = ['Category', 'Amount', 'Currency', 'Transactions', 'Percentage'];
    const csvRows = [headers.join(',')];

    for (const cat of categories) {
      csvRows.push([
        this.escapeCsvText(cat.name),
        this.formatMinorAmount(cat.amount, currency),
        this.escapeCsvValue(currency),
        cat.transactionCount.toString(),
        `${cat.percentage}%`,
      ].join(','));
    }

    return '\uFEFF' + csvRows.join('\n');
  }

  generateOverviewCsv(data: Record<string, unknown>[], currency: string): string {
    if (data.length === 0) return '\uFEFF';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      csvRows.push(
        headers.map((h) => {
          const val = row[h];
          if (typeof val === 'string') return this.escapeCsvText(val);
          if (typeof val === 'number') return val.toString();
          return this.escapeCsvValue(String(val ?? ''));
        }).join(','),
      );
    }

    return '\uFEFF' + csvRows.join('\n');
  }

  sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
  }

  private escapeCsvText(value: string): string {
    if (!value) return '';
    const sanitized = this.sanitizeFormulaInjection(value);
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';
    return this.escapeCsvText(value);
  }

  private escapeCsvDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toISOString().split('T')[0];
    } catch {
      return this.escapeCsvText(dateStr);
    }
  }

  private formatMinorAmount(amountMinor: number, currency: string): string {
    const decimals = this.getCurrencyDecimals(currency);
    const amount = amountMinor / Math.pow(10, decimals);
    return amount.toFixed(decimals);
  }

  private getCurrencyDecimals(currency: string): number {
    const upper = currency.toUpperCase();
    if (upper === 'JPY' || upper === 'KRW') return 0;
    return 2;
  }

  private sanitizeFormulaInjection(value: string): string {
    if (!value) return '';
    const firstChar = value.charAt(0);
    if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
      return `'${value}`;
    }
    return value;
  }
}
