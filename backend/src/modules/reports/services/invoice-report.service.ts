import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { ReportPeriodService } from './report-period.service';
import { ReportQueryDto } from '../dto/report-query.dto';
import {
  OutstandingInvoiceResult,
  OverdueInvoiceResult,
  AgingBuckets,
  OutstandingInvoiceRow,
} from '../interfaces/financial-overview.interface';

@Injectable()
export class InvoiceReportService {
  private readonly logger = new Logger(InvoiceReportService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    private readonly periodService: ReportPeriodService,
  ) {}

  async getOutstandingInvoices(businessId: string): Promise<OutstandingInvoiceResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
    }).sort({ dueDate: 1 });

    const rows: OutstandingInvoiceRow[] = [];
    let totalOutstanding = 0;

    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      const remaining = Math.max(0, inv.totalMinor - paid);
      if (remaining <= 0) continue;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = inv.dueDate ? inv.dueDate < today : false;

      rows.push({
        invoiceId: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerSnapshot.name,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate?.toISOString() || null,
        total: inv.totalMinor,
        paid,
        remaining,
        paymentStatus: inv.paymentStatus,
        isOverdue,
      });
      totalOutstanding += remaining;
    }

    return {
      currency,
      summary: { outstandingAmount: totalOutstanding, invoiceCount: rows.length },
      invoices: rows,
    };
  }

  async getOverdueInvoices(businessId: string): Promise<OverdueInvoiceResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
      dueDate: { $exists: true, $ne: null, $lt: today },
    }).sort({ dueDate: 1 });

    const aging: AgingBuckets = { '1to7': 0, '8to30': 0, '31to60': 0, '61plus': 0 };
    const rows: OutstandingInvoiceRow[] = [];
    let totalOverdue = 0;

    for (const inv of invoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });
      const paid = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
      const remaining = Math.max(0, inv.totalMinor - paid);
      if (remaining <= 0) continue;

      const overdueDays = Math.floor((today.getTime() - inv.dueDate!.getTime()) / (1000 * 60 * 60 * 24));

      if (overdueDays <= 7) aging['1to7'] += remaining;
      else if (overdueDays <= 30) aging['8to30'] += remaining;
      else if (overdueDays <= 60) aging['31to60'] += remaining;
      else aging['61plus'] += remaining;

      rows.push({
        invoiceId: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerSnapshot.name,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate?.toISOString() || null,
        total: inv.totalMinor,
        paid,
        remaining,
        paymentStatus: inv.paymentStatus,
        isOverdue: true,
      });
      totalOverdue += remaining;
    }

    return {
      currency,
      summary: { overdueAmount: totalOverdue, invoiceCount: rows.length },
      aging,
      invoices: rows,
    };
  }

  async getOutstandingForExport(businessId: string): Promise<OutstandingInvoiceRow[]> {
    const result = await this.getOutstandingInvoices(businessId);
    return result.invoices;
  }

  async getOverdueForExport(businessId: string): Promise<OutstandingInvoiceRow[]> {
    const result = await this.getOverdueInvoices(businessId);
    return result.invoices;
  }
}
