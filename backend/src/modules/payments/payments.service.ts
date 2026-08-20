import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { InvoiceCalculationService } from '../invoices/services/invoice-calculation.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { AuditService } from '../audit/audit.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ReminderSchedulerService } from '../reminders/services/reminder-scheduler.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    private invoiceCalculationService: InvoiceCalculationService,
    private auditService: AuditService,
    private invoicesService: InvoicesService,
    private readonly reminderSchedulerService: ReminderSchedulerService,
  ) {}

  async create(
    businessId: string,
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<{ payment: PaymentDocument; invoiceSummary: unknown }> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(dto.invoiceId),
      businessId: new Types.ObjectId(businessId),
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException(
        'Payments can only be recorded against issued invoices',
      );
    }

    const summary = await this.invoicesService.getInvoicePaymentSummary(
      businessId,
      dto.invoiceId,
    );

    if (summary.remainingMinor <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const paymentAmountMinor = this.invoiceCalculationService.toMinorUnits(
      dto.amount,
      invoice.currency,
    );

    if (paymentAmountMinor > summary.remainingMinor) {
      throw new BadRequestException(
        'Payment amount cannot exceed the remaining invoice balance',
      );
    }

    const payment = new this.paymentModel({
      businessId: new Types.ObjectId(businessId),
      invoiceId: new Types.ObjectId(dto.invoiceId),
      customerId: invoice.customerId,
      amountMinor: paymentAmountMinor,
      currency: invoice.currency,
      date: new Date(dto.date),
      method: dto.method,
      reference: dto.reference,
      notes: dto.notes,
      status: PaymentStatus.CONFIRMED,
      createdByUserId: new Types.ObjectId(userId),
    });

    const savedPayment = await payment.save();

    await this.invoicesService.recalculateAndSavePaymentStatus(
      businessId,
      dto.invoiceId,
    );

    try {
      await this.reminderSchedulerService.cancelFutureRemindersForInvoice(
        businessId,
        dto.invoiceId,
      );
    } catch {
      // Reminder cancellation is best-effort, don't fail the payment
    }

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Payment',
      entityId: (savedPayment._id as Types.ObjectId).toString(),
      action: 'PAYMENT_CREATED',
      newValues: {
        invoiceId: dto.invoiceId,
        amountMinor: paymentAmountMinor,
        method: dto.method,
      },
    });

    const updatedSummary = await this.invoicesService.getInvoicePaymentSummary(
      businessId,
      dto.invoiceId,
    );

    return { payment: savedPayment, invoiceSummary: updatedSummary };
  }

  async findAll(
    businessId: string,
    query: PaymentQueryDto,
  ): Promise<{
    items: PaymentDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (query.invoiceId) {
      filter.invoiceId = new Types.ObjectId(query.invoiceId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.dateFrom || query.dateTo) {
      filter.date = {};
      if (query.dateFrom) {
        (filter.date as Record<string, Date>).$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (filter.date as Record<string, Date>).$lte = new Date(query.dateTo);
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId', 'invoiceNumber')
        .populate('customerId', 'name')
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async void(
    businessId: string,
    userId: string,
    paymentId: string,
    reason?: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({
      _id: new Types.ObjectId(paymentId),
      businessId: new Types.ObjectId(businessId),
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.VOIDED) {
      throw new ConflictException('Payment is already voided');
    }

    const now = new Date();
    const updated = await this.paymentModel.findByIdAndUpdate(
      new Types.ObjectId(paymentId),
      {
        $set: {
          status: PaymentStatus.VOIDED,
          voidedAt: now,
          voidedByUserId: new Types.ObjectId(userId),
          voidReason: reason,
        },
      },
      { new: true },
    );

    await this.invoicesService.recalculateAndSavePaymentStatus(
      businessId,
      payment.invoiceId.toString(),
    );

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Payment',
      entityId: paymentId,
      action: 'PAYMENT_VOIDED',
      oldValues: { status: PaymentStatus.CONFIRMED },
      newValues: {
        status: PaymentStatus.VOIDED,
        voidReason: reason,
      },
    });

    return updated!;
  }

  async getCustomerPayments(
    businessId: string,
    customerId: string,
    query: { page?: number; limit?: number },
  ): Promise<{
    items: PaymentDocument[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
    };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId', 'invoiceNumber'),
      this.paymentModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
