import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { InvoiceItem, InvoiceItemDocument } from './schemas/invoice-item.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Business, BusinessDocument } from '../businesses/schemas/business.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../common/enums/invoice-payment-status.enum';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { InvoiceNumberService } from './services/invoice-number.service';
import { InvoiceCalculationService } from './services/invoice-calculation.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(InvoiceItem.name) private itemModel: Model<InvoiceItemDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private invoiceNumberService: InvoiceNumberService,
    private invoiceCalculationService: InvoiceCalculationService,
    private auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceDocument> {
    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(dto.customerId),
      businessId: new Types.ObjectId(businessId),
      status: CustomerStatus.ACTIVE,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found or inactive');
    }

    const business = await this.businessModel.findById(
      new Types.ObjectId(businessId),
    );
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const currency = business.baseCurrency;

    if (dto.dueDate && new Date(dto.dueDate) < new Date(dto.issueDate)) {
      throw new BadRequestException('Due date must not be before issue date');
    }

    const calculatedItems = dto.items.map((item, index) => {
      const line = this.invoiceCalculationService.calculateLineTotal(
        item.quantity,
        item.rate,
        currency,
      );
      return {
        description: item.description,
        quantity: item.quantity,
        rateMinor: this.invoiceCalculationService.toMinorUnits(
          item.rate,
          currency,
        ),
        amountMinor: line.amountMinor,
        sortOrder: index,
      };
    });

    const { subtotalMinor, totalMinor } =
      this.invoiceCalculationService.calculateInvoiceTotals(
        dto.items,
        currency,
      );

    const invoiceNumber = await this.invoiceNumberService.generateNextInvoiceNumber(
      businessId,
      new Date(dto.issueDate),
    );

    const customerSnapshot = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address
        ? {
            line1: customer.address.line1,
            line2: customer.address.line2,
            city: customer.address.city,
            district: customer.address.district,
            postalCode: customer.address.postalCode,
            country: customer.address.country,
          }
        : undefined,
    };

    const invoice = new this.invoiceModel({
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(dto.customerId),
      invoiceNumber,
      issueDate: new Date(dto.issueDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      currency,
      status: InvoiceStatus.DRAFT,
      paymentStatus: InvoicePaymentStatus.UNPAID,
      subtotalMinor,
      totalMinor,
      notes: dto.notes,
      customerSnapshot,
      createdByUserId: new Types.ObjectId(userId),
    });

    const savedInvoice = await invoice.save();

    const items = calculatedItems.map(
      (item) =>
        new this.itemModel({
          businessId: new Types.ObjectId(businessId),
          invoiceId: savedInvoice._id,
          ...item,
        }),
    );
    await this.itemModel.insertMany(items);

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Invoice',
      entityId: (savedInvoice._id as Types.ObjectId).toString(),
      action: 'INVOICE_CREATED',
      newValues: {
        invoiceNumber,
        customerId: dto.customerId,
        totalMinor,
      },
    });

    return savedInvoice;
  }

  async findAll(
    businessId: string,
    query: InvoiceQueryDto,
  ): Promise<{
    items: InvoiceDocument[];
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

    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.dateFrom || query.dateTo) {
      filter.issueDate = {};
      if (query.dateFrom) {
        (filter.issueDate as Record<string, Date>).$gte = new Date(
          query.dateFrom,
        );
      }
      if (query.dateTo) {
        (filter.issueDate as Record<string, Date>).$lte = new Date(
          query.dateTo,
        );
      }
    }
    if (query.overdue === 'true') {
      filter.status = InvoiceStatus.ISSUED;
      filter.paymentStatus = { $ne: InvoicePaymentStatus.PAID };
      filter.dueDate = { $lt: new Date() };
    }
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { invoiceNumber: regex },
        { 'customerSnapshot.name': regex },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name phone email')
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
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

  async findById(
    businessId: string,
    invoiceId: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel
      .findOne({
        _id: new Types.ObjectId(invoiceId),
        businessId: new Types.ObjectId(businessId),
      })
      .populate('customerId', 'name phone email');
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async getItems(
    businessId: string,
    invoiceId: string,
  ): Promise<InvoiceItemDocument[]> {
    return this.itemModel
      .find({
        invoiceId: new Types.ObjectId(invoiceId),
        businessId: new Types.ObjectId(businessId),
      })
      .sort({ sortOrder: 1 });
  }

  async update(
    businessId: string,
    userId: string,
    invoiceId: string,
    dto: UpdateInvoiceDto,
  ): Promise<InvoiceDocument> {
    const invoice = await this.findById(businessId, invoiceId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ConflictException(
        'Issued invoices cannot be edited. Void the invoice and create a new one if financial details are incorrect.',
      );
    }

    const updateData: Record<string, unknown> = {};

    if (dto.customerId) {
      const customer = await this.customerModel.findOne({
        _id: new Types.ObjectId(dto.customerId),
        businessId: new Types.ObjectId(businessId),
        status: CustomerStatus.ACTIVE,
      });
      if (!customer) {
        throw new NotFoundException('Customer not found or inactive');
      }
      updateData.customerId = new Types.ObjectId(dto.customerId);
      updateData.customerSnapshot = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      };
    }

    if (dto.issueDate) {
      updateData.issueDate = new Date(dto.issueDate);
    }
    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    if (dto.items) {
      const business = await this.businessModel.findById(
        new Types.ObjectId(businessId),
      );
      const currency = business?.baseCurrency || 'LKR';

      const calculatedItems = dto.items.map((item, index) => {
        const line = this.invoiceCalculationService.calculateLineTotal(
          item.quantity,
          item.rate,
          currency,
        );
        return {
          description: item.description,
          quantity: item.quantity,
          rateMinor: this.invoiceCalculationService.toMinorUnits(
            item.rate,
            currency,
          ),
          amountMinor: line.amountMinor,
          sortOrder: index,
        };
      });

      const { subtotalMinor, totalMinor } =
        this.invoiceCalculationService.calculateInvoiceTotals(
          dto.items,
          currency,
        );

      updateData.subtotalMinor = subtotalMinor;
      updateData.totalMinor = totalMinor;

      await this.itemModel.deleteMany({
        invoiceId: new Types.ObjectId(invoiceId),
        businessId: new Types.ObjectId(businessId),
      });

      const newItems = calculatedItems.map(
        (item) =>
          new this.itemModel({
            businessId: new Types.ObjectId(businessId),
            invoiceId: new Types.ObjectId(invoiceId),
            ...item,
          }),
      );
      await this.itemModel.insertMany(newItems);
    }

    const oldValues = {
      totalMinor: invoice.totalMinor,
      customerId: invoice.customerId.toString(),
    };

    const updated = await this.invoiceModel.findByIdAndUpdate(
      new Types.ObjectId(invoiceId),
      { $set: updateData },
      { new: true },
    );

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'INVOICE_UPDATED',
      oldValues,
      newValues: updateData,
    });

    return updated!;
  }

  async issue(
    businessId: string,
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.findById(businessId, invoiceId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ConflictException('Only draft invoices can be issued');
    }

    const items = await this.getItems(businessId, invoiceId);
    if (items.length === 0) {
      throw new BadRequestException(
        'Cannot issue an invoice with no line items',
      );
    }

    const now = new Date();
    const updated = await this.invoiceModel.findByIdAndUpdate(
      new Types.ObjectId(invoiceId),
      {
        $set: {
          status: InvoiceStatus.ISSUED,
          issuedAt: now,
          issuedByUserId: new Types.ObjectId(userId),
          paymentStatus: InvoicePaymentStatus.UNPAID,
        },
      },
      { new: true },
    );

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'INVOICE_ISSUED',
      oldValues: { status: InvoiceStatus.DRAFT },
      newValues: { status: InvoiceStatus.ISSUED, issuedAt: now },
    });

    return updated!;
  }

  async void(
    businessId: string,
    userId: string,
    invoiceId: string,
    reason?: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.findById(businessId, invoiceId);

    if (invoice.status === InvoiceStatus.VOIDED) {
      throw new ConflictException('Invoice is already voided');
    }

    if (invoice.status === InvoiceStatus.ISSUED) {
      const confirmedPayments = await this.paymentModel
        .countDocuments({
          invoiceId: new Types.ObjectId(invoiceId),
          businessId: new Types.ObjectId(businessId),
          status: PaymentStatus.CONFIRMED,
        })
        .exec();

      if (confirmedPayments > 0) {
        throw new ConflictException(
          'This invoice has recorded payments. Void/refund those payments before voiding the invoice.',
        );
      }
    }

    const now = new Date();
    const updated = await this.invoiceModel.findByIdAndUpdate(
      new Types.ObjectId(invoiceId),
      {
        $set: {
          status: InvoiceStatus.VOIDED,
          voidedAt: now,
          voidedByUserId: new Types.ObjectId(userId),
          voidReason: reason,
        },
      },
      { new: true },
    );

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'INVOICE_VOIDED',
      oldValues: { status: invoice.status },
      newValues: { status: InvoiceStatus.VOIDED, voidReason: reason },
    });

    return updated!;
  }

  async getPayments(
    businessId: string,
    invoiceId: string,
  ): Promise<{ items: unknown[]; summary: { invoiceTotalMinor: number; confirmedPaidMinor: number; remainingMinor: number; paymentStatus: InvoicePaymentStatus } }> {
    await this.findById(businessId, invoiceId);
    const summary = await this.getInvoicePaymentSummary(businessId, invoiceId);

    const payments = await this.paymentModel
      .find({
        invoiceId: new Types.ObjectId(invoiceId),
        businessId: new Types.ObjectId(businessId),
      })
      .sort({ date: -1 })
      .populate('createdByUserId', 'name email');

    return { items: payments as unknown[], summary };
  }

  async getInvoicePaymentSummary(
    businessId: string,
    invoiceId: string,
  ): Promise<{
    invoiceTotalMinor: number;
    confirmedPaidMinor: number;
    remainingMinor: number;
    paymentStatus: InvoicePaymentStatus;
  }> {
    const invoice = await this.findById(businessId, invoiceId);

    const confirmedPayments = await this.paymentModel.find({
      invoiceId: new Types.ObjectId(invoiceId),
      businessId: new Types.ObjectId(businessId),
      status: PaymentStatus.CONFIRMED,
    });

    const confirmedPaidMinor = confirmedPayments.reduce(
      (sum, p) => sum + p.amountMinor,
      0,
    );

    const remainingMinor = Math.max(0, invoice.totalMinor - confirmedPaidMinor);

    let paymentStatus: InvoicePaymentStatus;
    if (confirmedPaidMinor === 0) {
      paymentStatus = InvoicePaymentStatus.UNPAID;
    } else if (confirmedPaidMinor >= invoice.totalMinor) {
      paymentStatus = InvoicePaymentStatus.PAID;
    } else {
      paymentStatus = InvoicePaymentStatus.PARTIALLY_PAID;
    }

    return {
      invoiceTotalMinor: invoice.totalMinor,
      confirmedPaidMinor,
      remainingMinor,
      paymentStatus,
    };
  }

  async recalculatePaymentStatus(
    businessId: string,
    invoiceId: string,
  ): Promise<void> {
    const summary = await this.getInvoicePaymentSummary(businessId, invoiceId);

    await this.invoiceModel.findByIdAndUpdate(
      new Types.ObjectId(invoiceId),
      { $set: { paymentStatus: summary.paymentStatus } },
    );
  }

  async getOutstandingSummary(
    businessId: string,
  ): Promise<{
    currency: string;
    outstandingAmount: number;
    outstandingInvoiceCount: number;
    overdueAmount: number;
    overdueInvoiceCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const outstandingInvoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
    });

    const business = await this.businessModel.findById(
      new Types.ObjectId(businessId),
    );
    const currency = business?.baseCurrency || 'LKR';

    let outstandingAmount = 0;
    let overdueAmount = 0;
    let overdueInvoiceCount = 0;

    for (const inv of outstandingInvoices) {
      const confirmedPayments = await this.paymentModel.find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });

      const paid = confirmedPayments.reduce(
        (sum, p) => sum + p.amountMinor,
        0,
      );
      const remaining = Math.max(0, inv.totalMinor - paid);

      outstandingAmount += remaining;

      if (inv.dueDate && inv.dueDate < today && remaining > 0) {
        overdueAmount += remaining;
        overdueInvoiceCount++;
      }
    }

    return {
      currency,
      outstandingAmount,
      outstandingInvoiceCount: outstandingInvoices.length,
      overdueAmount,
      overdueInvoiceCount,
    };
  }

  async getCustomerInvoices(
    businessId: string,
    customerId: string,
    query: { status?: InvoiceStatus; paymentStatus?: InvoicePaymentStatus; page?: number; limit?: number },
  ): Promise<{
    items: InvoiceDocument[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
    };
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      this.invoiceModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async recalculateAndSavePaymentStatus(
    businessId: string,
    invoiceId: string,
  ): Promise<InvoicePaymentStatus> {
    const summary = await this.getInvoicePaymentSummary(businessId, invoiceId);
    await this.invoiceModel.findByIdAndUpdate(
      new Types.ObjectId(invoiceId),
      { $set: { paymentStatus: summary.paymentStatus } },
    );
    return summary.paymentStatus;
  }

  async savePdfKey(
    businessId: string,
    invoiceId: string,
    pdfKey: string,
  ): Promise<void> {
    await this.invoiceModel.findByIdAndUpdate(
      new Types.ObjectId(invoiceId),
      { $set: { pdfKey } },
    );
  }
}
