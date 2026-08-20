import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../../../transactions/schemas/transaction.schema';
import { Invoice, InvoiceDocument } from '../../../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../../../payments/schemas/payment.schema';
import { Customer, CustomerDocument } from '../../../customers/schemas/customer.schema';
import { Category, CategoryDocument } from '../../../categories/schemas/category.schema';
import { BusinessQueryType } from '../../enums/business-query.enums';
import type { DateRange, ResolvedDateRange, BusinessQueryResult } from '../interfaces/business-query.interface';
import { TransactionStatus } from '../../../../common/enums/transaction-status.enum';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';
import { InvoiceStatus } from '../../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../../../common/enums/payment-status.enum';
import { fromMinorUnits } from '../../../../common/utils/financial.utils';

@Injectable()
export class BusinessQueryService {
  private readonly logger = new Logger(BusinessQueryService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
  ) {}

  async executeQuery(
    queryType: BusinessQueryType,
    businessId: string,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
    options?: { customerName?: string | null; invoiceNumber?: string | null; limit?: number | null },
  ): Promise<BusinessQueryResult> {
    const bid = new Types.ObjectId(businessId);

    switch (queryType) {
      case BusinessQueryType.EXPENSE_TOTAL:
        return this.getExpenseTotal(bid, currency, dateRange, period);
      case BusinessQueryType.INCOME_TOTAL:
        return this.getIncomeTotal(bid, currency, dateRange, period);
      case BusinessQueryType.NET_CASH_FLOW:
        return this.getNetCashFlow(bid, currency, dateRange, period);
      case BusinessQueryType.TRANSACTION_COUNT:
        return this.getTransactionCount(bid, currency, dateRange, period);
      case BusinessQueryType.EXPENSE_CATEGORY_BREAKDOWN:
        return this.getExpenseCategoryBreakdown(bid, currency, dateRange, period);
      case BusinessQueryType.INCOME_CATEGORY_BREAKDOWN:
        return this.getIncomeCategoryBreakdown(bid, currency, dateRange, period);
      case BusinessQueryType.OUTSTANDING_AMOUNT:
        return this.getOutstandingAmount(bid, currency);
      case BusinessQueryType.OUTSTANDING_INVOICES:
        return this.getOutstandingInvoices(bid, currency);
      case BusinessQueryType.OVERDUE_INVOICES:
        return this.getOverdueInvoices(bid, currency);
      case BusinessQueryType.UNPAID_CUSTOMERS:
        return this.getUnpaidCustomers(bid, currency, options?.limit);
      case BusinessQueryType.INVOICE_STATUS:
        return this.getInvoiceStatus(bid, currency, options?.invoiceNumber || '');
      case BusinessQueryType.RECENT_TRANSACTIONS:
        return this.getRecentTransactions(bid, currency, options?.limit || 5);
      default:
        return {
          queryType: BusinessQueryType.UNKNOWN,
          currency,
          data: null,
        };
    }
  }

  private async getExpenseTotal(
    businessId: Types.ObjectId,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
  ): Promise<BusinessQueryResult> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAmountMinor: { $sum: '$amountMinor' },
          count: { $sum: 1 },
        },
      },
    ]);

    const total = result[0]?.totalAmountMinor || 0;
    const count = result[0]?.count || 0;

    return {
      queryType: BusinessQueryType.EXPENSE_TOTAL,
      currency,
      period,
      data: {
        amountMinor: total,
        amountDisplay: fromMinorUnits(total, currency),
        currency,
        transactionCount: count,
      },
    };
  }

  private async getIncomeTotal(
    businessId: Types.ObjectId,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
  ): Promise<BusinessQueryResult> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId,
          type: TransactionType.INCOME,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAmountMinor: { $sum: '$amountMinor' },
          count: { $sum: 1 },
        },
      },
    ]);

    const total = result[0]?.totalAmountMinor || 0;
    const count = result[0]?.count || 0;

    return {
      queryType: BusinessQueryType.INCOME_TOTAL,
      currency,
      period,
      data: {
        amountMinor: total,
        amountDisplay: fromMinorUnits(total, currency),
        currency,
        transactionCount: count,
      },
    };
  }

  private async getNetCashFlow(
    businessId: Types.ObjectId,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
  ): Promise<BusinessQueryResult> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          totalAmountMinor: { $sum: '$amountMinor' },
        },
      },
    ]);

    let incomeTotal = 0;
    let expenseTotal = 0;

    for (const row of result) {
      if (row._id === TransactionType.INCOME) incomeTotal = row.totalAmountMinor;
      if (row._id === TransactionType.EXPENSE) expenseTotal = row.totalAmountMinor;
    }

    const netCashFlow = incomeTotal - expenseTotal;

    return {
      queryType: BusinessQueryType.NET_CASH_FLOW,
      currency,
      period,
      data: {
        incomeAmountMinor: incomeTotal,
        incomeAmountDisplay: fromMinorUnits(incomeTotal, currency),
        expenseAmountMinor: expenseTotal,
        expenseAmountDisplay: fromMinorUnits(expenseTotal, currency),
        netCashFlowMinor: netCashFlow,
        netCashFlowDisplay: fromMinorUnits(Math.abs(netCashFlow), currency),
        currency,
      },
    };
  }

  private async getTransactionCount(
    businessId: Types.ObjectId,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
  ): Promise<BusinessQueryResult> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    let incomeCount = 0;
    let expenseCount = 0;

    for (const row of result) {
      if (row._id === TransactionType.INCOME) incomeCount = row.count;
      if (row._id === TransactionType.EXPENSE) expenseCount = row.count;
    }

    return {
      queryType: BusinessQueryType.TRANSACTION_COUNT,
      currency,
      period,
      data: {
        totalCount: incomeCount + expenseCount,
        incomeCount,
        expenseCount,
      },
    };
  }

  private async getExpenseCategoryBreakdown(
    businessId: Types.ObjectId,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
  ): Promise<BusinessQueryResult> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          totalAmountMinor: { $sum: '$amountMinor' },
        },
      },
      {
        $sort: { totalAmountMinor: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const categoryIds = result.map((r) => r._id);
    const categories = await this.categoryModel.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    let totalMinor = 0;
    const categories_data = result.map((r) => {
      const amount = r.totalAmountMinor;
      totalMinor += amount;
      return {
        categoryName: categoryMap.get(r._id.toString()) || 'Unknown',
        categoryId: r._id.toString(),
        amountMinor: amount,
        amountDisplay: fromMinorUnits(amount, currency),
      };
    });

    return {
      queryType: BusinessQueryType.EXPENSE_CATEGORY_BREAKDOWN,
      currency,
      period,
      data: {
        categories: categories_data,
        totalMinor,
      },
    };
  }

  private async getIncomeCategoryBreakdown(
    businessId: Types.ObjectId,
    currency: string,
    dateRange: DateRange,
    period: ResolvedDateRange,
  ): Promise<BusinessQueryResult> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId,
          type: TransactionType.INCOME,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          totalAmountMinor: { $sum: '$amountMinor' },
        },
      },
      {
        $sort: { totalAmountMinor: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const categoryIds = result.map((r) => r._id);
    const categories = await this.categoryModel.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    let totalMinor = 0;
    const categories_data = result.map((r) => {
      const amount = r.totalAmountMinor;
      totalMinor += amount;
      return {
        categoryName: categoryMap.get(r._id.toString()) || 'Unknown',
        categoryId: r._id.toString(),
        amountMinor: amount,
        amountDisplay: fromMinorUnits(amount, currency),
      };
    });

    return {
      queryType: BusinessQueryType.INCOME_CATEGORY_BREAKDOWN,
      currency,
      period,
      data: {
        categories: categories_data,
        totalMinor,
      },
    };
  }

  private async getOutstandingAmount(
    businessId: Types.ObjectId,
    currency: string,
  ): Promise<BusinessQueryResult> {
    const invoices = await this.invoiceModel.find({
      businessId,
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIALLY_PAID] },
    });

    const payments = await this.paymentModel.find({
      businessId,
      invoiceId: { $in: invoices.map((inv) => inv._id) },
      status: PaymentStatus.CONFIRMED,
    });

    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      const key = payment.invoiceId.toString();
      paidByInvoice.set(key, (paidByInvoice.get(key) || 0) + payment.amountMinor);
    }

    let totalOutstanding = 0;
    let outstandingCount = 0;
    for (const invoice of invoices) {
      const paid = paidByInvoice.get(invoice._id.toString()) || 0;
      const remaining = invoice.totalMinor - paid;
      if (remaining > 0) {
        totalOutstanding += remaining;
        outstandingCount++;
      }
    }

    return {
      queryType: BusinessQueryType.OUTSTANDING_AMOUNT,
      currency,
      data: {
        amountMinor: totalOutstanding,
        amountDisplay: fromMinorUnits(totalOutstanding, currency),
        currency,
        outstandingInvoiceCount: outstandingCount,
      },
    };
  }

  private async getOutstandingInvoices(
    businessId: Types.ObjectId,
    currency: string,
  ): Promise<BusinessQueryResult> {
    const invoices = await this.invoiceModel.find({
      businessId,
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIALLY_PAID] },
    }).sort({ dueDate: 1 });

    const payments = await this.paymentModel.find({
      businessId,
      invoiceId: { $in: invoices.map((inv) => inv._id) },
      status: PaymentStatus.CONFIRMED,
    });

    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      const key = payment.invoiceId.toString();
      paidByInvoice.set(key, (paidByInvoice.get(key) || 0) + payment.amountMinor);
    }

    const today = new Date();
    let totalOutstanding = 0;
    const items = invoices
      .map((invoice) => {
        const paid = paidByInvoice.get(invoice._id.toString()) || 0;
        const remaining = invoice.totalMinor - paid;
        const isOverdue = invoice.dueDate ? invoice.dueDate < today && remaining > 0 : false;
        return {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerSnapshot?.name || 'Unknown',
          totalMinor: invoice.totalMinor,
          remainingMinor: remaining,
          dueDate: invoice.dueDate?.toISOString().split('T')[0],
          isOverdue,
        };
      })
      .filter((item) => item.remainingMinor > 0);

    totalOutstanding = items.reduce((sum, item) => sum + item.remainingMinor, 0);

    return {
      queryType: BusinessQueryType.OUTSTANDING_INVOICES,
      currency,
      data: {
        invoices: items,
        totalOutstandingMinor: totalOutstanding,
        totalOutstandingDisplay: fromMinorUnits(totalOutstanding, currency),
        currency,
        count: items.length,
      },
    };
  }

  private async getOverdueInvoices(
    businessId: Types.ObjectId,
    currency: string,
  ): Promise<BusinessQueryResult> {
    const today = new Date();
    const invoices = await this.invoiceModel.find({
      businessId,
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIALLY_PAID] },
      dueDate: { $lt: today },
    }).sort({ dueDate: 1 });

    const payments = await this.paymentModel.find({
      businessId,
      invoiceId: { $in: invoices.map((inv) => inv._id) },
      status: PaymentStatus.CONFIRMED,
    });

    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      const key = payment.invoiceId.toString();
      paidByInvoice.set(key, (paidByInvoice.get(key) || 0) + payment.amountMinor);
    }

    let totalOverdue = 0;
    const items = invoices
      .map((invoice) => {
        const paid = paidByInvoice.get(invoice._id.toString()) || 0;
        const remaining = invoice.totalMinor - paid;
        return {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerSnapshot?.name || 'Unknown',
          totalMinor: invoice.totalMinor,
          remainingMinor: remaining,
          dueDate: invoice.dueDate?.toISOString().split('T')[0],
        };
      })
      .filter((item) => item.remainingMinor > 0);

    totalOverdue = items.reduce((sum, item) => sum + item.remainingMinor, 0);

    return {
      queryType: BusinessQueryType.OVERDUE_INVOICES,
      currency,
      data: {
        invoices: items,
        totalOverdueMinor: totalOverdue,
        totalOverdueDisplay: fromMinorUnits(totalOverdue, currency),
        currency,
        count: items.length,
      },
    };
  }

  private async getUnpaidCustomers(
    businessId: Types.ObjectId,
    currency: string,
    limit?: number | null,
  ): Promise<BusinessQueryResult> {
    const maxResults = Math.min(limit || 5, 20);

    const invoices = await this.invoiceModel.find({
      businessId,
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIALLY_PAID] },
    });

    const payments = await this.paymentModel.find({
      businessId,
      invoiceId: { $in: invoices.map((inv) => inv._id) },
      status: PaymentStatus.CONFIRMED,
    });

    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      const key = payment.invoiceId.toString();
      paidByInvoice.set(key, (paidByInvoice.get(key) || 0) + payment.amountMinor);
    }

    const customerOutstanding = new Map<string, { name: string; outstandingMinor: number; invoiceCount: number; customerId: string }>();
    for (const invoice of invoices) {
      const paid = paidByInvoice.get(invoice._id.toString()) || 0;
      const remaining = invoice.totalMinor - paid;
      if (remaining <= 0) continue;

      const custId = invoice.customerId.toString();
      const existing = customerOutstanding.get(custId);
      if (existing) {
        existing.outstandingMinor += remaining;
        existing.invoiceCount++;
      } else {
        customerOutstanding.set(custId, {
          customerId: custId,
          name: invoice.customerSnapshot?.name || 'Unknown',
          outstandingMinor: remaining,
          invoiceCount: 1,
        });
      }
    }

    const sorted = Array.from(customerOutstanding.values())
      .sort((a, b) => b.outstandingMinor - a.outstandingMinor);

    const totalCount = sorted.length;
    const topCustomers = sorted.slice(0, maxResults);

    return {
      queryType: BusinessQueryType.UNPAID_CUSTOMERS,
      currency,
      data: {
        customers: topCustomers.map((c) => ({
          customerId: c.customerId,
          customerName: c.name,
          outstandingAmountMinor: c.outstandingMinor,
          outstandingAmountDisplay: fromMinorUnits(c.outstandingMinor, currency),
          invoiceCount: c.invoiceCount,
        })),
        totalCount,
        totalOutstandingMinor: sorted.reduce((sum, c) => sum + c.outstandingMinor, 0),
        totalOutstandingDisplay: fromMinorUnits(sorted.reduce((sum, c) => sum + c.outstandingMinor, 0), currency),
        currency,
      },
    };
  }

  private async getInvoiceStatus(
    businessId: Types.ObjectId,
    currency: string,
    invoiceNumber: string,
  ): Promise<BusinessQueryResult> {
    const invoice = await this.invoiceModel.findOne({
      businessId,
      invoiceNumber,
    });

    if (!invoice) {
      return {
        queryType: BusinessQueryType.INVOICE_STATUS,
        currency,
        data: {
          found: false,
          invoiceNumber,
          message: `Invoice "${invoiceNumber}" not found in your records.`,
        },
      };
    }

    const payments = await this.paymentModel.find({
      businessId,
      invoiceId: invoice._id,
      status: PaymentStatus.CONFIRMED,
    });

    let totalPaid = 0;
    for (const payment of payments) {
      totalPaid += payment.amountMinor;
    }

    const remaining = invoice.totalMinor - totalPaid;
    const today = new Date();
    const isOverdue = invoice.dueDate ? invoice.dueDate < today && remaining > 0 : false;

    return {
      queryType: BusinessQueryType.INVOICE_STATUS,
      currency,
      data: {
        found: true,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerSnapshot?.name || 'Unknown',
        totalMinor: invoice.totalMinor,
        paidMinor: totalPaid,
        remainingMinor: remaining,
        paymentStatus: invoice.paymentStatus,
        dueDate: invoice.dueDate?.toISOString().split('T')[0],
        isOverdue,
        currency: invoice.currency,
        invoiceId: invoice._id.toString(),
      },
    };
  }

  private async getRecentTransactions(
    businessId: Types.ObjectId,
    currency: string,
    limit: number,
  ): Promise<BusinessQueryResult> {
    const maxResults = Math.min(limit, 20);

    const transactions = await this.transactionModel.find({
      businessId,
      status: TransactionStatus.CONFIRMED,
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(maxResults)
      .populate('categoryId', 'name');

    const items = transactions.map((tx) => {
      const cat = tx.categoryId as unknown as { name: string };
      return {
        id: tx._id.toString(),
        type: tx.type,
        amountMinor: tx.amountMinor,
        amountDisplay: fromMinorUnits(tx.amountMinor, tx.currency),
        currency: tx.currency,
        description: tx.description,
        categoryName: cat?.name || 'Unknown',
        date: tx.date.toISOString().split('T')[0],
      };
    });

    return {
      queryType: BusinessQueryType.RECENT_TRANSACTIONS,
      currency,
      data: {
        transactions: items,
        count: items.length,
      },
    };
  }
}
