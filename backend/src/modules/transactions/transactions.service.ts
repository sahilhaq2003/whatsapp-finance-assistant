import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from './schemas/transaction.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { Business, BusinessDocument } from '../businesses/schemas/business.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TransactionSource } from '../../common/enums/transaction-source.enum';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { toMinorUnits } from '../../common/utils/financial.utils';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionDocument> {
    if (!Types.ObjectId.isValid(dto.categoryId)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(dto.categoryId),
      businessId: new Types.ObjectId(businessId),
      isActive: true,
    });

    if (!category) {
      throw new BadRequestException('Category not found or inactive in this business');
    }

    if ((category.type as string) !== (dto.type as string)) {
      throw new BadRequestException(
        `Category "${category.name}" is a ${category.type} category, but you are creating a ${dto.type} transaction`,
      );
    }

    let customerIdObj: Types.ObjectId | undefined;
    if (dto.customerId) {
      if (!Types.ObjectId.isValid(dto.customerId)) {
        throw new BadRequestException('Invalid customer ID');
      }
      const customer = await this.customerModel.findOne({
        _id: new Types.ObjectId(dto.customerId),
        businessId: new Types.ObjectId(businessId),
        status: CustomerStatus.ACTIVE,
      });
      if (!customer) {
        throw new BadRequestException(
          'Customer not found, inactive, or does not belong to this business',
        );
      }
      customerIdObj = customer._id as Types.ObjectId;
    }

    const business = await this.businessModel.findById(
      new Types.ObjectId(businessId),
    );

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const currency = business.baseCurrency;
    const amountMinor = toMinorUnits(dto.amount, currency);

    const now = new Date();
    const transaction = new this.transactionModel({
      businessId: new Types.ObjectId(businessId),
      type: dto.type,
      amountMinor,
      currency,
      categoryId: new Types.ObjectId(dto.categoryId),
      customerId: customerIdObj,
      date: new Date(dto.date),
      description: dto.description,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      source: TransactionSource.MANUAL,
      status: TransactionStatus.CONFIRMED,
      createdByUserId: new Types.ObjectId(userId),
      confirmedByUserId: new Types.ObjectId(userId),
      confirmedAt: now,
    });

    const saved = await transaction.save();

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Transaction',
      entityId: (saved._id as Types.ObjectId).toString(),
      action: 'TRANSACTION_CREATED',
      newValues: {
        type: saved.type,
        amountMinor: saved.amountMinor,
        currency: saved.currency,
        status: saved.status,
      },
    });

    return saved;
  }

  async findAll(
    businessId: string,
    query: TransactionQueryDto,
  ): Promise<{
    items: TransactionDocument[];
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

    if (query.type) filter.type = query.type;
    if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: TransactionStatus.VOIDED };
    }

    if (query.dateFrom || query.dateTo) {
      filter.date = {};
      if (query.dateFrom) (filter.date as Record<string, Date>).$gte = new Date(query.dateFrom);
      if (query.dateTo) (filter.date as Record<string, Date>).$lte = new Date(query.dateTo);
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { description: regex },
        { notes: regex },
        { reference: regex },
      ];
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

  async findOne(
    businessId: string,
    transactionId: string,
  ): Promise<TransactionDocument> {
    if (!Types.ObjectId.isValid(transactionId)) {
      throw new BadRequestException('Invalid transaction ID');
    }

    const transaction = await this.transactionModel
      .findOne({
        _id: new Types.ObjectId(transactionId),
        businessId: new Types.ObjectId(businessId),
      })
      .populate('categoryId', 'name type');

    if (!transaction) {
      throw new NotFoundException('Transaction not found in this business');
    }

    return transaction;
  }

  async update(
    businessId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionDocument> {
    const transaction = await this.findOne(businessId, transactionId);

    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Cannot update a voided transaction');
    }

    if (dto.categoryId && dto.type) {
      const category = await this.categoryModel.findOne({
        _id: new Types.ObjectId(dto.categoryId),
        businessId: new Types.ObjectId(businessId),
        isActive: true,
      });
      if (!category) {
        throw new BadRequestException('Category not found or inactive');
      }
      if ((category.type as string) !== (dto.type as string)) {
        throw new BadRequestException(
          `Category "${category.name}" is a ${category.type} category`,
        );
      }
    } else if (dto.categoryId && !dto.type) {
      const category = await this.categoryModel.findOne({
        _id: new Types.ObjectId(dto.categoryId),
        businessId: new Types.ObjectId(businessId),
        isActive: true,
      });
      if (!category) {
        throw new BadRequestException('Category not found or inactive');
      }
      if ((category.type as string) !== (transaction.type as string)) {
        throw new BadRequestException(
          `Category "${category.name}" is a ${category.type} category, but the transaction is ${transaction.type}`,
        );
      }
    } else if (dto.type && !dto.categoryId) {
      const category = await this.categoryModel.findById(transaction.categoryId);
      if (category && (category.type as string) !== (dto.type as string)) {
        throw new BadRequestException(
          `Current category "${category.name}" is a ${category.type} category, cannot change transaction type to ${dto.type}`,
        );
      }
    }

    if (dto.amount !== undefined) {
      const business = await this.businessModel.findById(
        new Types.ObjectId(businessId),
      );
      if (business) {
        transaction.amountMinor = toMinorUnits(dto.amount, business.baseCurrency);
      }
    }

    if (dto.customerId !== undefined) {
      if (dto.customerId === '') {
        transaction.customerId = undefined;
      } else {
        if (!Types.ObjectId.isValid(dto.customerId)) {
          throw new BadRequestException('Invalid customer ID');
        }
        const customer = await this.customerModel.findOne({
          _id: new Types.ObjectId(dto.customerId),
          businessId: new Types.ObjectId(businessId),
          status: CustomerStatus.ACTIVE,
        });
        if (!customer) {
          throw new BadRequestException(
            'Customer not found, inactive, or does not belong to this business',
          );
        }
        transaction.customerId = customer._id as Types.ObjectId;
      }
    }

    const oldValues = {
      type: transaction.type,
      amountMinor: transaction.amountMinor,
    };

    if (dto.type !== undefined) transaction.type = dto.type;
    if (dto.categoryId !== undefined)
      transaction.categoryId = new Types.ObjectId(dto.categoryId);
    if (dto.date !== undefined) transaction.date = new Date(dto.date);
    if (dto.description !== undefined) transaction.description = dto.description;
    if (dto.notes !== undefined) transaction.notes = dto.notes;
    if (dto.paymentMethod !== undefined) transaction.paymentMethod = dto.paymentMethod;
    if (dto.reference !== undefined) transaction.reference = dto.reference;

    const updated = await transaction.save();

    await this.auditService.log({
      businessId,
      userId: transaction.createdByUserId.toString(),
      entityType: 'Transaction',
      entityId: transaction._id.toString(),
      action: 'TRANSACTION_UPDATED',
      oldValues,
      newValues: {
        type: updated.type,
        amountMinor: updated.amountMinor,
      },
    });

    return updated;
  }

  async void(
    businessId: string,
    transactionId: string,
    userId: string,
    dto: VoidTransactionDto,
  ): Promise<TransactionDocument> {
    const transaction = await this.findOne(businessId, transactionId);

    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaction is already voided');
    }

    transaction.status = TransactionStatus.VOIDED;
    transaction.voidedAt = new Date();
    transaction.voidedByUserId = new Types.ObjectId(userId);
    if (dto.reason) transaction.voidReason = dto.reason;

    const voided = await transaction.save();

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Transaction',
      entityId: transaction._id.toString(),
      action: 'TRANSACTION_VOIDED',
      oldValues: { status: TransactionStatus.CONFIRMED },
      newValues: { status: TransactionStatus.VOIDED, voidReason: dto.reason },
    });

    return voided;
  }

  async getSummary(
    businessId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    income: number;
    expenses: number;
    netCashFlow: number;
    currency: string;
    transactionCount: number;
  }> {
    const match: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      status: TransactionStatus.CONFIRMED,
    };

    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) (match.date as Record<string, Date>).$gte = new Date(dateFrom);
      if (dateTo) (match.date as Record<string, Date>).$lte = new Date(dateTo);
    }

    const business = await this.businessModel.findById(
      new Types.ObjectId(businessId),
    );
    const currency = business?.baseCurrency || 'LKR';

    const result = await this.transactionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amountMinor' },
          count: { $sum: 1 },
        },
      },
    ]);

    let income = 0;
    let expenses = 0;
    let transactionCount = 0;

    for (const group of result) {
      if (group._id === TransactionType.INCOME) {
        income = group.total;
      } else if (group._id === TransactionType.EXPENSE) {
        expenses = group.total;
      }
      transactionCount += group.count;
    }

    return {
      income,
      expenses,
      netCashFlow: income - expenses,
      currency,
      transactionCount,
    };
  }

  async getCategorySummary(
    businessId: string,
    type?: TransactionType,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<
    Array<{
      categoryId: string;
      categoryName: string;
      total: number;
      count: number;
    }>
  > {
    const match: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      status: TransactionStatus.CONFIRMED,
    };

    if (type) match.type = type;
    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) (match.date as Record<string, Date>).$gte = new Date(dateFrom);
      if (dateTo) (match.date as Record<string, Date>).$lte = new Date(dateTo);
    }

    const result = await this.transactionModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: '$category.name' },
          total: { $sum: '$amountMinor' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return result.map((r) => ({
      categoryId: r._id.toString(),
      categoryName: r.categoryName,
      total: r.total,
      count: r.count,
    }));
  }
}
