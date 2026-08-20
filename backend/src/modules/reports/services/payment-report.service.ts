import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { ReportPeriodService } from './report-period.service';
import { ReportQueryDto } from '../dto/report-query.dto';
import {
  PaymentReportResult,
  PaymentReportRow,
  PaymentMethodBreakdown,
} from '../interfaces/financial-overview.interface';

@Injectable()
export class PaymentReportService {
  private readonly logger = new Logger(PaymentReportService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    private readonly periodService: ReportPeriodService,
  ) {}

  async getPaymentReport(businessId: string, query: ReportQueryDto & { customerId?: string; invoiceId?: string; method?: string; status?: string }): Promise<PaymentReportResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const tz = business?.timezone || 'Asia/Colombo';
    const { startDate, endDate } = this.periodService.resolve(query.period, query.dateFrom, query.dateTo, tz);

    const match: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      date: { $gte: startDate, $lte: endDate },
    };

    if (query.customerId) match.customerId = new Types.ObjectId(query.customerId);
    if (query.invoiceId) match.invoiceId = new Types.ObjectId(query.invoiceId);
    if (query.method) match.method = query.method;
    if (query.status) {
      match.status = query.status;
    }

    const payments = await this.paymentModel
      .find(match)
      .sort({ date: -1 })
      .lean();

    const invoiceIds = [...new Set(payments.map((p) => p.invoiceId.toString()))];
    const customerIds = [...new Set(payments.map((p) => p.customerId.toString()))];

    const [invoices, customers] = await Promise.all([
      this.invoiceModel.find({ _id: { $in: invoiceIds } }).lean(),
      this.customerModel.find({ _id: { $in: customerIds } }).lean(),
    ]);

    const invoiceMap = new Map(invoices.map((i) => [i._id.toString(), i]));
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    const confirmedPayments = payments.filter((p) => p.status === PaymentStatus.CONFIRMED);
    const confirmedTotal = confirmedPayments.reduce((sum, p) => sum + p.amountMinor, 0);

    const methodMap = new Map<string, { amount: number; count: number }>();
    for (const p of confirmedPayments) {
      const existing = methodMap.get(p.method) || { amount: 0, count: 0 };
      existing.amount += p.amountMinor;
      existing.count += 1;
      methodMap.set(p.method, existing);
    }

    const methodBreakdown: PaymentMethodBreakdown[] = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }));

    const rows: PaymentReportRow[] = payments.map((p) => {
      const inv = invoiceMap.get(p.invoiceId.toString());
      const cust = customerMap.get(p.customerId.toString());
      return {
        paymentId: p._id.toString(),
        date: p.date.toISOString(),
        customerName: cust?.name || '-',
        invoiceNumber: inv?.invoiceNumber || '-',
        amount: p.amountMinor,
        method: p.method,
        reference: p.reference || '-',
        status: p.status,
      };
    });

    return {
      currency,
      summary: { confirmedTotal, paymentCount: confirmedPayments.length },
      methodBreakdown,
      payments: rows,
    };
  }

  async getPaymentsForExport(businessId: string, query: ReportQueryDto & { customerId?: string; invoiceId?: string; method?: string; status?: string }): Promise<PaymentReportRow[]> {
    const result = await this.getPaymentReport(businessId, query);
    return result.payments;
  }
}
