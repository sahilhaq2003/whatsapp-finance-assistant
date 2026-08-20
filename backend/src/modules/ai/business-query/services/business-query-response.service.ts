import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessQueryType } from '../../enums/business-query.enums';
import type { BusinessQueryResult } from '../interfaces/business-query.interface';
import { fromMinorUnits } from '../../../../common/utils/financial.utils';

@Injectable()
export class BusinessQueryResponseService {
  private readonly logger = new Logger(BusinessQueryResponseService.name);

  constructor(private readonly configService: ConfigService) {}

  formatResponse(result: BusinessQueryResult): string {
    switch (result.queryType) {
      case BusinessQueryType.EXPENSE_TOTAL:
        return this.formatExpenseTotal(result);
      case BusinessQueryType.INCOME_TOTAL:
        return this.formatIncomeTotal(result);
      case BusinessQueryType.NET_CASH_FLOW:
        return this.formatNetCashFlow(result);
      case BusinessQueryType.TRANSACTION_COUNT:
        return this.formatTransactionCount(result);
      case BusinessQueryType.EXPENSE_CATEGORY_BREAKDOWN:
        return this.formatExpenseCategoryBreakdown(result);
      case BusinessQueryType.INCOME_CATEGORY_BREAKDOWN:
        return this.formatIncomeCategoryBreakdown(result);
      case BusinessQueryType.OUTSTANDING_AMOUNT:
        return this.formatOutstandingAmount(result);
      case BusinessQueryType.OUTSTANDING_INVOICES:
        return this.formatOutstandingInvoices(result);
      case BusinessQueryType.OVERDUE_INVOICES:
        return this.formatOverdueInvoices(result);
      case BusinessQueryType.UNPAID_CUSTOMERS:
        return this.formatUnpaidCustomers(result);
      case BusinessQueryType.INVOICE_STATUS:
        return this.formatInvoiceStatus(result);
      case BusinessQueryType.RECENT_TRANSACTIONS:
        return this.formatRecentTransactions(result);
      default:
        return 'I can answer questions about your recorded income, expenses, invoices and outstanding payments. Could you rephrase your question?';
    }
  }

  private formatAmount(amountMinor: number, currency: string): string {
    const amount = fromMinorUnits(amountMinor, currency);
    return `${currency} ${amount.toLocaleString('en-LK')}`;
  }

  private formatExpenseTotal(result: BusinessQueryResult): string {
    const d = result.data as { amountMinor: number; currency: string; transactionCount: number };
    if (d.transactionCount === 0) {
      return `You have no confirmed expenses recorded for ${result.period?.label || 'this period'}.`;
    }
    return `Your recorded expenses for ${result.period?.label || 'this period'}: ${this.formatAmount(d.amountMinor, d.currency)} (${d.transactionCount} transaction${d.transactionCount !== 1 ? 's' : ''}).`;
  }

  private formatIncomeTotal(result: BusinessQueryResult): string {
    const d = result.data as { amountMinor: number; currency: string; transactionCount: number };
    if (d.transactionCount === 0) {
      return `You have no confirmed income recorded for ${result.period?.label || 'this period'}.`;
    }
    return `Your recorded income for ${result.period?.label || 'this period'}: ${this.formatAmount(d.amountMinor, d.currency)} (${d.transactionCount} transaction${d.transactionCount !== 1 ? 's' : ''}).`;
  }

  private formatNetCashFlow(result: BusinessQueryResult): string {
    const d = result.data as {
      incomeAmountMinor: number; expenseAmountMinor: number;
      netCashFlowMinor: number; currency: string;
    };
    const period = result.period?.label || 'this period';

    if (d.incomeAmountMinor === 0 && d.expenseAmountMinor === 0) {
      return `No confirmed income or expenses recorded for ${period}.`;
    }

    const flow = d.netCashFlowMinor >= 0
      ? `Net cash flow: ${this.formatAmount(d.netCashFlowMinor, d.currency)}`
      : `Net cash flow: -${this.formatAmount(Math.abs(d.netCashFlowMinor), d.currency)}`;

    return `${period}:\nIncome: ${this.formatAmount(d.incomeAmountMinor, d.currency)}\nExpenses: ${this.formatAmount(d.expenseAmountMinor, d.currency)}\n${flow}`;
  }

  private formatTransactionCount(result: BusinessQueryResult): string {
    const d = result.data as { totalCount: number; incomeCount: number; expenseCount: number };
    const period = result.period?.label || 'this period';

    if (d.totalCount === 0) {
      return `You have no confirmed transactions recorded for ${period}.`;
    }

    const parts: string[] = [];
    if (d.incomeCount > 0) parts.push(`${d.incomeCount} income`);
    if (d.expenseCount > 0) parts.push(`${d.expenseCount} expense`);
    return `You have ${d.totalCount} confirmed transaction${d.totalCount !== 1 ? 's' : ''} for ${period}: ${parts.join(', ')}.`;
  }

  private formatExpenseCategoryBreakdown(result: BusinessQueryResult): string {
    const d = result.data as { categories: Array<{ categoryName: string; amountMinor: number }>; totalMinor: number };
    const period = result.period?.label || 'this period';

    if (!d.categories || d.categories.length === 0) {
      return `You have no confirmed expenses recorded for ${period}.`;
    }

    const top3 = d.categories.slice(0, 3);
    const lines = top3.map(
      (c, i) => `${i + 1}. ${c.categoryName} — ${this.formatAmount(c.amountMinor, result.currency)}`,
    );

    let response = `Your top expense categories for ${period}:\n${lines.join('\n')}`;

    if (d.categories.length > 3) {
      const restTotal = d.categories.slice(3).reduce((sum, c) => sum + c.amountMinor, 0);
      if (restTotal > 0) {
        response += `\n+ ${d.categories.length - 3} more categories (${this.formatAmount(restTotal, result.currency)})`;
      }
    }

    return response;
  }

  private formatIncomeCategoryBreakdown(result: BusinessQueryResult): string {
    const d = result.data as { categories: Array<{ categoryName: string; amountMinor: number }>; totalMinor: number };
    const period = result.period?.label || 'this period';

    if (!d.categories || d.categories.length === 0) {
      return `You have no confirmed income recorded for ${period}.`;
    }

    const top3 = d.categories.slice(0, 3);
    const lines = top3.map(
      (c, i) => `${i + 1}. ${c.categoryName} — ${this.formatAmount(c.amountMinor, result.currency)}`,
    );

    let response = `Your top income categories for ${period}:\n${lines.join('\n')}`;

    if (d.categories.length > 3) {
      const restTotal = d.categories.slice(3).reduce((sum, c) => sum + c.amountMinor, 0);
      if (restTotal > 0) {
        response += `\n+ ${d.categories.length - 3} more categories (${this.formatAmount(restTotal, result.currency)})`;
      }
    }

    return response;
  }

  private formatOutstandingAmount(result: BusinessQueryResult): string {
    const d = result.data as { amountMinor: number; currency: string; outstandingInvoiceCount: number };

    if (d.outstandingInvoiceCount === 0) {
      return `You currently have no outstanding issued invoices.`;
    }

    return `You have ${d.outstandingInvoiceCount} outstanding invoice${d.outstandingInvoiceCount !== 1 ? 's' : ''} totaling ${this.formatAmount(d.amountMinor, d.currency)}.`;
  }

  private formatOutstandingInvoices(result: BusinessQueryResult): string {
    const d = result.data as {
      invoices: Array<{ invoiceNumber: string; customerName: string; remainingMinor: number; isOverdue: boolean }>;
      count: number;
    };

    if (d.count === 0) {
      return `You currently have no outstanding issued invoices.`;
    }

    const maxShow = 5;
    const shown = d.invoices.slice(0, maxShow);
    const lines = shown.map(
      (inv, i) => `${i + 1}. ${inv.invoiceNumber} — ${inv.customerName} — ${this.formatAmount(inv.remainingMinor, result.currency)}`,
    );

    let response = `You have ${d.count} outstanding invoice${d.count !== 1 ? 's' : ''}:\n${lines.join('\n')}`;

    if (d.count > maxShow) {
      response += `\n... and ${d.count - maxShow} more`;
    }

    return response;
  }

  private formatOverdueInvoices(result: BusinessQueryResult): string {
    const d = result.data as {
      invoices: Array<{ invoiceNumber: string; customerName: string; remainingMinor: number; dueDate?: string }>;
      count: number;
    };

    if (d.count === 0) {
      return `You currently have no overdue invoices.`;
    }

    const maxShow = 5;
    const shown = d.invoices.slice(0, maxShow);
    const lines = shown.map(
      (inv, i) => `${i + 1}. ${inv.invoiceNumber} — ${inv.customerName} — ${this.formatAmount(inv.remainingMinor, result.currency)}`,
    );

    let response = `You have ${d.count} overdue invoice${d.count !== 1 ? 's' : ''}:\n${lines.join('\n')}`;

    if (d.count > maxShow) {
      response += `\n... and ${d.count - maxShow} more`;
    }

    return response;
  }

  private formatUnpaidCustomers(result: BusinessQueryResult): string {
    const d = result.data as {
      customers: Array<{ customerName: string; outstandingAmountMinor: number; invoiceCount: number }>;
      totalCount: number;
    };

    if (d.totalCount === 0) {
      return `I found no outstanding issued invoices in your records.`;
    }

    const maxShow = 5;
    const shown = d.customers.slice(0, maxShow);
    const lines = shown.map(
      (c, i) => `${i + 1}. ${c.customerName} — ${this.formatAmount(c.outstandingAmountMinor, result.currency)} (${c.invoiceCount} invoice${c.invoiceCount !== 1 ? 's' : ''})`,
    );

    let response = `You have ${d.totalCount} customer${d.totalCount !== 1 ? 's' : ''} with outstanding invoices:\n${lines.join('\n')}`;

    if (d.totalCount > maxShow) {
      response += `\n... and ${d.totalCount - maxShow} more`;
    }

    return response;
  }

  private formatInvoiceStatus(result: BusinessQueryResult): string {
    const d = result.data as {
      found: boolean; invoiceNumber: string; message?: string;
      customerName?: string; totalMinor?: number; paidMinor?: number; remainingMinor?: number;
      paymentStatus?: string; isOverdue?: boolean;
    };

    if (!d.found) {
      return d.message || `Invoice "${d.invoiceNumber}" not found in your records.`;
    }

    let statusText = '';
    switch (d.paymentStatus) {
      case 'paid': statusText = 'fully paid'; break;
      case 'partially_paid': statusText = 'partially paid'; break;
      case 'unpaid': statusText = 'unpaid'; break;
      default: statusText = d.paymentStatus || 'unknown';
    }

    let response = `Invoice ${d.invoiceNumber} — ${d.customerName}\nStatus: ${statusText}\nTotal: ${this.formatAmount(d.totalMinor!, result.currency)}\nPaid: ${this.formatAmount(d.paidMinor!, result.currency)}\nRemaining: ${this.formatAmount(d.remainingMinor!, result.currency)}`;

    if (d.isOverdue) {
      response += '\nThis invoice is overdue.';
    }

    return response;
  }

  private formatRecentTransactions(result: BusinessQueryResult): string {
    const d = result.data as {
      transactions: Array<{ type: string; amountDisplay: number; categoryName: string; description?: string; date: string; currency: string }>;
      count: number;
    };

    if (d.count === 0) {
      return `You have no confirmed transactions recorded.`;
    }

    const lines = d.transactions.map(
      (tx, i) => {
        const typeLabel = tx.type === 'income' ? 'Income' : 'Expense';
        const catOrDesc = tx.description || tx.categoryName;
        return `${i + 1}. ${typeLabel} — ${catOrDesc} — ${this.formatAmount(tx.amountDisplay * 100, result.currency).replace(result.currency, tx.currency)}`;
      },
    );

    return `Your ${d.count} most recent confirmed transactions:\n${lines.join('\n')}`;
  }
}
