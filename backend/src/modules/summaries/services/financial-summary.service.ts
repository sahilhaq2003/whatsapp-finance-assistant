import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../../transactions/schemas/transaction.schema';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class FinancialSummaryService {
  private readonly logger = new Logger(FinancialSummaryService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
  ) {}

  async generateSummary(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    businessId: string;
    currency: string;
    incomeMinor: number;
    expenseMinor: number;
    netCashFlowMinor: number;
    transactionCount: number;
    outstandingAmountMinor: number;
    outstandingInvoiceCount: number;
    overdueAmountMinor: number;
    overdueInvoiceCount: number;
    topExpenseCategories: Array<{ categoryId: Types.ObjectId; name: string; amountMinor: number; transactionCount: number }>;
    topIncomeCategories: Array<{ categoryId: Types.ObjectId; name: string; amountMinor: number; transactionCount: number }>;
  }> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    if (!business) {
      throw new Error('Business not found');
    }
    const currency = business.baseCurrency || 'LKR';

    const [incomeResult, expenseResult, transactionCount, topExpense, topIncome] = await Promise.all([
      this.aggregateByType(businessId, TransactionType.INCOME, periodStart, periodEnd),
      this.aggregateByType(businessId, TransactionType.EXPENSE, periodStart, periodEnd),
      this.countTransactions(businessId, periodStart, periodEnd),
      this.getTopCategories(businessId, TransactionType.EXPENSE, periodStart, periodEnd),
      this.getTopCategories(businessId, TransactionType.INCOME, periodStart, periodEnd),
    ]);

    const [outstandingAmount, outstandingCount, overdueAmount, overdueCount] = await Promise.all([
      this.calculateOutstandingAmount(businessId),
      this.countOutstandingInvoices(businessId),
      this.calculateOverdueAmount(businessId),
      this.countOverdueInvoices(businessId),
    ]);

    const incomeMinor = incomeResult.totalMinor;
    const expenseMinor = expenseResult.totalMinor;
    const netCashFlowMinor = incomeMinor - expenseMinor;

    return {
      businessId,
      currency,
      incomeMinor,
      expenseMinor,
      netCashFlowMinor,
      transactionCount,
      outstandingAmountMinor: outstandingAmount,
      outstandingInvoiceCount: outstandingCount,
      overdueAmountMinor: overdueAmount,
      overdueInvoiceCount: overdueCount,
      topExpenseCategories: topExpense,
      topIncomeCategories: topIncome,
    };
  }

  private async aggregateByType(
    businessId: string,
    type: TransactionType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ totalMinor: number }> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          type,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalMinor: { $sum: '$amountMinor' },
        },
      },
    ]);
    return { totalMinor: result.length > 0 ? result[0].totalMinor : 0 };
  }

  private async countTransactions(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return this.transactionModel.countDocuments({
      businessId: new Types.ObjectId(businessId),
      status: TransactionStatus.CONFIRMED,
      date: { $gte: periodStart, $lte: periodEnd },
    });
  }

  private async getTopCategories(
    businessId: string,
    type: TransactionType,
    periodStart: Date,
    periodEnd: Date,
    limit = 3,
  ): Promise<Array<{ categoryId: Types.ObjectId; name: string; amountMinor: number; transactionCount: number }>> {
    const results = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          type,
          status: TransactionStatus.CONFIRMED,
          date: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          amountMinor: { $sum: '$amountMinor' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { amountMinor: -1 } },
      { $limit: limit },
    ]);

    if (results.length === 0) return [];

    const categoryIds = results.map((r) => r._id);
    const categories = await this.categoryModel.find({
      _id: { $in: categoryIds },
    });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    return results.map((r) => ({
      categoryId: r._id,
      name: categoryMap.get(r._id.toString()) || 'Unknown',
      amountMinor: r.amountMinor,
      transactionCount: r.transactionCount,
    }));
  }

  private async calculateOutstandingAmount(businessId: string): Promise<number> {
    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
    });

    let outstanding = 0;
    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      outstanding += Math.max(0, inv.totalMinor - paid);
    }
    return outstanding;
  }

  private async countOutstandingInvoices(businessId: string): Promise<number> {
    return this.invoiceModel.countDocuments({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
    });
  }

  private async calculateOverdueAmount(businessId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
      dueDate: { $exists: true, $ne: null, $lt: today },
    });

    let overdue = 0;
    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      const remaining = Math.max(0, inv.totalMinor - paid);
      if (remaining > 0) overdue += remaining;
    }
    return overdue;
  }

  private async countOverdueInvoices(businessId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
      dueDate: { $exists: true, $ne: null, $lt: today },
    });

    let count = 0;
    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      if (Math.max(0, inv.totalMinor - paid) > 0) count++;
    }
    return count;
  }
}
