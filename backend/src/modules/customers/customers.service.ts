import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { Payment } from '../payments/schemas/payment.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { AuditService } from '../audit/audit.service';

function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (/^0\d{9}$/.test(trimmed)) {
    return '+94' + trimmed.substring(1);
  }
  return trimmed;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<unknown>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    userId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerDocument> {
    const data: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      name: dto.name.trim(),
      status: CustomerStatus.ACTIVE,
      createdByUserId: new Types.ObjectId(userId),
    };

    if (dto.phone) data.phone = normalizePhone(dto.phone);
    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.address) data.address = dto.address;
    if (dto.notes) data.notes = dto.notes.trim();

    const customer = new this.customerModel(data);
    const saved = await customer.save();

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Customer',
      entityId: (saved._id as Types.ObjectId).toString(),
      action: 'CUSTOMER_CREATED',
      newValues: { name: saved.name, phone: saved.phone, email: saved.email },
    });

    return saved;
  }

  async findAll(
    businessId: string,
    query: CustomerQueryDto,
  ): Promise<{
    items: CustomerDocument[];
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

    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = CustomerStatus.ACTIVE;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(filter).exec(),
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
    customerId: string,
  ): Promise<CustomerDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in this business');
    }

    return customer;
  }

  async findActiveById(
    businessId: string,
    customerId: string,
  ): Promise<CustomerDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
      status: CustomerStatus.ACTIVE,
    });

    if (!customer) {
      throw new NotFoundException(
        'Active customer not found in this business',
      );
    }

    return customer;
  }

  async update(
    businessId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    const customer = await this.findById(businessId, customerId);

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (dto.name !== undefined && dto.name !== customer.name) {
      oldValues.name = customer.name;
      newValues.name = dto.name.trim();
      customer.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      const normalized = dto.phone ? normalizePhone(dto.phone) : undefined;
      oldValues.phone = customer.phone;
      newValues.phone = normalized;
      customer.phone = normalized;
    }
    if (dto.email !== undefined) {
      const normalized = dto.email ? dto.email.toLowerCase().trim() : undefined;
      oldValues.email = customer.email;
      newValues.email = normalized;
      customer.email = normalized;
    }
    if (dto.address !== undefined) {
      oldValues.address = customer.address;
      newValues.address = dto.address;
      customer.address = dto.address as never;
    }
    if (dto.notes !== undefined) {
      oldValues.notes = customer.notes;
      newValues.notes = dto.notes ? dto.notes.trim() : undefined;
      customer.notes = dto.notes ? dto.notes.trim() : undefined;
    }

    const updated = await customer.save();

    await this.auditService.log({
      businessId,
      userId: customer.createdByUserId.toString(),
      entityType: 'Customer',
      entityId: customer._id.toString(),
      action: 'CUSTOMER_UPDATED',
      oldValues,
      newValues,
    });

    return updated;
  }

  async archive(
    businessId: string,
    customerId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const customer = await this.findById(businessId, customerId);

    if (customer.status === CustomerStatus.ARCHIVED) {
      throw new BadRequestException('Customer is already archived');
    }

    customer.status = CustomerStatus.ARCHIVED;
    customer.archivedAt = new Date();
    customer.archivedByUserId = new Types.ObjectId(userId);
    await customer.save();

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Customer',
      entityId: customer._id.toString(),
      action: 'CUSTOMER_ARCHIVED',
      oldValues: { status: CustomerStatus.ACTIVE },
      newValues: { status: CustomerStatus.ARCHIVED },
    });

    return { message: 'Customer archived successfully' };
  }

  async restore(
    businessId: string,
    customerId: string,
    userId: string,
  ): Promise<CustomerDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in this business');
    }

    if (customer.status === CustomerStatus.ACTIVE) {
      throw new BadRequestException('Customer is already active');
    }

    customer.status = CustomerStatus.ACTIVE;
    customer.archivedAt = undefined;
    customer.archivedByUserId = undefined;
    const restored = await customer.save();

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Customer',
      entityId: customer._id.toString(),
      action: 'CUSTOMER_RESTORED',
      oldValues: { status: CustomerStatus.ARCHIVED },
      newValues: { status: CustomerStatus.ACTIVE },
    });

    return restored;
  }

  async getTransactions(
    businessId: string,
    customerId: string,
    query: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    },
  ): Promise<{
    items: TransactionDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    await this.findById(businessId, customerId);

    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
      status: TransactionStatus.CONFIRMED,
    };

    if (query.type) filter.type = query.type;
    if (query.dateFrom || query.dateTo) {
      filter.date = {};
      if (query.dateFrom)
        (filter.date as Record<string, Date>).$gte = new Date(query.dateFrom);
      if (query.dateTo)
        (filter.date as Record<string, Date>).$lte = new Date(query.dateTo);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('categoryId', 'name type')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
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

  async getFinancialSummary(
    businessId: string,
    customerId: string,
  ): Promise<{
    currency: string;
    totalReceived: number;
    confirmedTransactionCount: number;
    lastTransactionDate: string | null;
  }> {
    await this.findById(businessId, customerId);

    const result = await this.transactionModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          customerId: new Types.ObjectId(customerId),
          status: TransactionStatus.CONFIRMED,
          type: TransactionType.INCOME,
        },
      },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: '$amountMinor' },
          count: { $sum: 1 },
          lastDate: { $max: '$date' },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        currency: 'LKR',
        totalReceived: 0,
        confirmedTransactionCount: 0,
        lastTransactionDate: null,
      };
    }

    const doc = result[0];

    const tx = await this.transactionModel.findOne({
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
      status: TransactionStatus.CONFIRMED,
      type: TransactionType.INCOME,
    }).sort({ date: -1 }).select('currency').exec();

    return {
      currency: tx?.currency || 'LKR',
      totalReceived: doc.totalReceived,
      confirmedTransactionCount: doc.count,
      lastTransactionDate: doc.lastDate
        ? new Date(doc.lastDate).toISOString()
        : null,
    };
  }

  async getFinancialSummaryWithInvoices(
    businessId: string,
    customerId: string,
  ): Promise<{
    currency: string;
    totalReceived: number;
    confirmedTransactionCount: number;
    lastTransactionDate: string | null;
    invoiceCount: number;
    outstandingInvoiceCount: number;
    outstandingBalance: number;
  }> {
    const base = await this.getFinancialSummary(businessId, customerId);

    const issuedInvoices = await this.invoiceModel.find({
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
      status: InvoiceStatus.ISSUED,
    });

    let outstandingBalance = 0;
    let outstandingInvoiceCount = 0;

    for (const inv of issuedInvoices) {
      const confirmedPayments = await (this.paymentModel as Model<{
        amountMinor: number;
        status: string;
      }>).find({
        invoiceId: inv._id,
        businessId: new Types.ObjectId(businessId),
        status: PaymentStatus.CONFIRMED,
      });

      const paid = confirmedPayments.reduce(
        (sum, p) => sum + p.amountMinor,
        0,
      );
      const remaining = Math.max(0, inv.totalMinor - paid);

      if (remaining > 0) {
        outstandingBalance += remaining;
        outstandingInvoiceCount++;
      }
    }

    return {
      ...base,
      invoiceCount: issuedInvoices.length,
      outstandingInvoiceCount,
      outstandingBalance,
    };
  }

  async getCustomerInvoices(
    businessId: string,
    customerId: string,
    query: { status?: string; paymentStatus?: string; page?: number; limit?: number },
  ): Promise<{
    items: InvoiceDocument[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    await this.findById(businessId, customerId);

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

  async getCustomerPayments(
    businessId: string,
    customerId: string,
    query: { page?: number; limit?: number },
  ): Promise<{
    items: unknown[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    await this.findById(businessId, customerId);

    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
    };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.paymentModel as Model<unknown>)
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId', 'invoiceNumber'),
      (this.paymentModel as Model<unknown>).countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
