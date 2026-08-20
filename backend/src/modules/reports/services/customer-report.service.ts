import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../../transactions/schemas/transaction.schema';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { CustomerReportResult, CustomerReportRow } from '../interfaces/financial-overview.interface';

@Injectable()
export class CustomerReportService {
  private readonly logger = new Logger(CustomerReportService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
  ) {}

  async getCustomerReport(businessId: string): Promise<CustomerReportResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';

    const customers = await this.customerModel.find({
      businessId: new Types.ObjectId(businessId),
    }).sort({ name: 1 });

    const rows: CustomerReportRow[] = [];

    for (const cust of customers) {
      const [incomeResult, txCount, invoiceCount] = await Promise.all([
        this.transactionModel.aggregate([
          {
            $match: {
              businessId: new Types.ObjectId(businessId),
              customerId: cust._id,
              type: TransactionType.INCOME,
              status: TransactionStatus.CONFIRMED,
            },
          },
          { $group: { _id: null, total: { $sum: '$amountMinor' } } },
        ]),
        this.transactionModel.countDocuments({
          businessId: new Types.ObjectId(businessId),
          customerId: cust._id,
          status: TransactionStatus.CONFIRMED,
        }),
        this.invoiceModel.countDocuments({
          businessId: new Types.ObjectId(businessId),
          customerId: cust._id,
          status: { $ne: InvoiceStatus.DRAFT },
        }),
      ]);

      const confirmedIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;

      const outstanding = await this.calculateCustomerOutstanding(businessId, cust._id.toString());
      const overdue = await this.calculateCustomerOverdue(businessId, cust._id.toString());

      const lastTx = await this.transactionModel.findOne({
        businessId: new Types.ObjectId(businessId),
        customerId: cust._id,
        status: TransactionStatus.CONFIRMED,
      }).sort({ date: -1 }).select('date');

      rows.push({
        customerId: cust._id.toString(),
        customerName: cust.name,
        confirmedIncome,
        transactionCount: txCount,
        invoiceCount,
        outstandingAmount: outstanding,
        overdueAmount: overdue,
        lastActivityDate: lastTx?.date?.toISOString() || null,
      });
    }

    return { currency, customers: rows };
  }

  async getCustomerDetail(businessId: string, customerId: string) {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';

    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
    });
    if (!customer) return null;

    const incomeResult = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          customerId: customer._id,
          type: TransactionType.INCOME,
          status: TransactionStatus.CONFIRMED,
        },
      },
      { $group: { _id: null, total: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
    ]);

    const expenseResult = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          customerId: customer._id,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.CONFIRMED,
        },
      },
      { $group: { _id: null, total: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
    ]);

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      customerId: customer._id,
      status: { $ne: InvoiceStatus.DRAFT },
    });

    let totalInvoiced = 0;
    let outstandingAmount = 0;
    let overdueAmount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const inv of invoices) {
      totalInvoiced += inv.totalMinor;
      const payments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = payments.reduce((sum, p) => sum + p.amountMinor, 0);
      const remaining = Math.max(0, inv.totalMinor - paid);
      outstandingAmount += remaining;
      if (remaining > 0 && inv.dueDate && inv.dueDate < today) {
        overdueAmount += remaining;
      }
    }

    return {
      currency,
      customer: {
        customerId: customer._id.toString(),
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      transactionSummary: {
        confirmedIncome: incomeResult.length > 0 ? incomeResult[0].total : 0,
        incomeCount: incomeResult.length > 0 ? incomeResult[0].count : 0,
        confirmedExpense: expenseResult.length > 0 ? expenseResult[0].total : 0,
        expenseCount: expenseResult.length > 0 ? expenseResult[0].count : 0,
      },
      invoiceSummary: {
        totalInvoiced,
        invoiceCount: invoices.length,
        outstandingAmount,
        overdueAmount,
      },
    };
  }

  private async calculateCustomerOutstanding(businessId: string, customerId: string): Promise<number> {
    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
    });

    let outstanding = 0;
    for (const inv of invoices) {
      const payments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = payments.reduce((sum, p) => sum + p.amountMinor, 0);
      outstanding += Math.max(0, inv.totalMinor - paid);
    }
    return outstanding;
  }

  private async calculateCustomerOverdue(businessId: string, customerId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
      dueDate: { $exists: true, $ne: null, $lt: today },
    });

    let overdue = 0;
    for (const inv of invoices) {
      const payments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = payments.reduce((sum, p) => sum + p.amountMinor, 0);
      overdue += Math.max(0, inv.totalMinor - paid);
    }
    return overdue;
  }
}
