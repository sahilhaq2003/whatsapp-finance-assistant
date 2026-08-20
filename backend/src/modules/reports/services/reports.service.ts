import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../../transactions/schemas/transaction.schema';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { ReportPeriodService } from './report-period.service';
import { ReportPeriod } from '../enums/report-period.enum';
import { ReportQueryDto } from '../dto/report-query.dto';
import {
  FinancialOverviewResult,
  IncomeVsExpenseResult,
  CategoryBreakdownResult,
  CategoryBreakdownItem,
} from '../interfaces/financial-overview.interface';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    private readonly periodService: ReportPeriodService,
  ) {}

  async getFinancialOverview(businessId: string, query: ReportQueryDto): Promise<FinancialOverviewResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const tz = business?.timezone || 'Asia/Colombo';
    const { startDate, endDate } = this.periodService.resolve(query.period, query.dateFrom, query.dateTo, tz);

    const [incomeResult, expenseResult, txCount, outstanding, overdue] = await Promise.all([
      this.aggregateTypeTotal(businessId, TransactionType.INCOME, startDate, endDate),
      this.aggregateTypeTotal(businessId, TransactionType.EXPENSE, startDate, endDate),
      this.transactionModel.countDocuments({
        businessId: new Types.ObjectId(businessId),
        status: TransactionStatus.CONFIRMED,
        date: { $gte: startDate, $lte: endDate },
      }),
      this.getOutstandingAmount(businessId),
      this.getOverdueAmount(businessId),
    ]);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      currency,
      income: incomeResult,
      expenses: expenseResult,
      netCashFlow: incomeResult - expenseResult,
      transactionCount: txCount,
      outstandingAmount: outstanding.amount,
      outstandingInvoiceCount: outstanding.count,
      overdueAmount: overdue.amount,
      overdueInvoiceCount: overdue.count,
    };
  }

  async getIncomeVsExpenses(businessId: string, query: ReportQueryDto): Promise<IncomeVsExpenseResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const tz = business?.timezone || 'Asia/Colombo';
    const { startDate, endDate } = this.periodService.resolve(query.period, query.dateFrom, query.dateTo, tz);
    const granularity = this.periodService.getTrendGranularity(startDate, endDate);

    const [incomeByPeriod, expenseByPeriod] = await Promise.all([
      this.aggregateByPeriod(businessId, TransactionType.INCOME, startDate, endDate, granularity),
      this.aggregateByPeriod(businessId, TransactionType.EXPENSE, startDate, endDate, granularity),
    ]);

    const periodMap = new Map<string, { income: number; expenses: number }>();
    for (const item of incomeByPeriod) {
      periodMap.set(item.period, { income: item.total, expenses: 0 });
    }
    for (const item of expenseByPeriod) {
      const existing = periodMap.get(item.period) || { income: 0, expenses: 0 };
      existing.expenses = item.total;
      periodMap.set(item.period, existing);
    }

    const series = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, income: data.income, expenses: data.expenses }));

    const totals = series.reduce(
      (acc, s) => ({ income: acc.income + s.income, expenses: acc.expenses + s.expenses, netCashFlow: 0 }),
      { income: 0, expenses: 0, netCashFlow: 0 },
    );
    totals.netCashFlow = totals.income - totals.expenses;

    return { currency, totals, series };
  }

  async getCategoryBreakdown(businessId: string, type: TransactionType, query: ReportQueryDto): Promise<CategoryBreakdownResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const tz = business?.timezone || 'Asia/Colombo';
    const { startDate, endDate } = this.periodService.resolve(query.period, query.dateFrom, query.dateTo, tz);

    const results = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          type,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          amount: { $sum: '$amountMinor' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const total = results.reduce((sum, r) => sum + r.amount, 0);
    const categoryIds = results.map((r) => r._id);
    const categories = await this.categoryModel.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const items: CategoryBreakdownItem[] = results.map((r) => ({
      categoryId: r._id.toString(),
      name: categoryMap.get(r._id.toString()) || 'Unknown',
      amount: r.amount,
      transactionCount: r.transactionCount,
      percentage: total > 0 ? Math.round((r.amount / total) * 10000) / 100 : 0,
    }));

    return { type, currency, total, categories: items };
  }

  async getCategoryReport(businessId: string, query: ReportQueryDto): Promise<CategoryBreakdownResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const tz = business?.timezone || 'Asia/Colombo';
    const { startDate, endDate } = this.periodService.resolve(query.period, query.dateFrom, query.dateTo, tz);

    const results = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          status: TransactionStatus.CONFIRMED,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { categoryId: '$categoryId', type: '$type' },
          amount: { $sum: '$amountMinor' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const total = results.reduce((sum, r) => sum + r.amount, 0);
    const categoryIds = results.map((r) => r._id.categoryId);
    const categories = await this.categoryModel.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const items = results.map((r) => ({
      categoryId: r._id.categoryId.toString(),
      name: categoryMap.get(r._id.categoryId.toString()) || 'Unknown',
      amount: r.amount,
      transactionCount: r.transactionCount,
      percentage: total > 0 ? Math.round((r.amount / total) * 10000) / 100 : 0,
    }));

    return { type: 'all', currency, total, categories: items };
  }

  async verifyCategoryOwnership(businessId: string, categoryId: string): Promise<boolean> {
    const cat = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      businessId: new Types.ObjectId(businessId),
    });
    return !!cat;
  }

  async verifyCustomerOwnership(businessId: string, customerId: string): Promise<boolean> {
    const doc = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
    });
    return !!doc;
  }

  private async aggregateTypeTotal(
    businessId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          type,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  private async aggregateByPeriod(
    businessId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month',
  ): Promise<Array<{ period: string; total: number }>> {
    let dateFormat: string;
    switch (granularity) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
    }

    return this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          type,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$date' } },
          total: { $sum: '$amountMinor' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', total: 1 } },
    ]);
  }

  async getOutstandingAmount(businessId: string): Promise<{ amount: number; count: number }> {
    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
    });

    let outstanding = 0;
    let count = 0;
    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      const remaining = Math.max(0, inv.totalMinor - paid);
      if (remaining > 0) {
        outstanding += remaining;
        count++;
      }
    }
    return { amount: outstanding, count };
  }

  async getOverdueAmount(businessId: string): Promise<{ amount: number; count: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
      dueDate: { $exists: true, $ne: null, $lt: today },
    });

    let overdue = 0;
    let count = 0;
    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      const remaining = Math.max(0, inv.totalMinor - paid);
      if (remaining > 0) {
        overdue += remaining;
        count++;
      }
    }
    return { amount: overdue, count };
  }
}
