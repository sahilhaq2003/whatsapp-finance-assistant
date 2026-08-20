import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../../transactions/schemas/transaction.schema';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { ReportPeriodService } from './report-period.service';
import { TransactionReportQueryDto } from '../dto/transaction-report-query.dto';
import { TransactionReportResult, TransactionReportRow } from '../interfaces/financial-overview.interface';

@Injectable()
export class TransactionReportService {
  private readonly logger = new Logger(TransactionReportService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    private readonly periodService: ReportPeriodService,
  ) {}

  async getTransactionReport(businessId: string, query: TransactionReportQueryDto): Promise<TransactionReportResult> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const currency = business?.baseCurrency || 'LKR';
    const tz = business?.timezone || 'Asia/Colombo';
    const { startDate, endDate } = this.periodService.resolve(query.period, query.dateFrom, query.dateTo, tz);

    const match: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      date: { $gte: startDate, $lte: endDate },
    };

    if (query.type) match.type = query.type;
    if (query.status) {
      match.status = query.status;
    } else {
      match.status = TransactionStatus.CONFIRMED;
    }
    if (query.categoryId) match.categoryId = new Types.ObjectId(query.categoryId);
    if (query.customerId) match.customerId = new Types.ObjectId(query.customerId);
    if (query.paymentMethod) match.paymentMethod = query.paymentMethod;

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [total, transactions] = await Promise.all([
      this.transactionModel.countDocuments(match),
      this.transactionModel
        .aggregate([
          { $match: match },
          { $sort: { date: -1, createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryDoc',
            },
          },
          {
            $lookup: {
              from: 'customers',
              localField: 'customerId',
              foreignField: '_id',
              as: 'customerDoc',
            },
          },
          {
            $project: {
              _id: 1,
              date: 1,
              type: 1,
              description: 1,
              paymentMethod: 1,
              amountMinor: 1,
              status: 1,
              source: 1,
              categoryName: { $let: { vars: { cat: { $arrayElemAt: ['$categoryDoc', 0] } }, in: '$$cat.name' } },
              customerName: { $let: { vars: { cust: { $arrayElemAt: ['$customerDoc', 0] } }, in: '$$cust.name' } },
            },
          },
        ])
        .exec(),
    ]);

    const rows: TransactionReportRow[] = transactions.map((t) => ({
      _id: t._id.toString(),
      date: t.date.toISOString(),
      type: t.type,
      description: t.description || '',
      customerName: t.customerName || '-',
      categoryName: t.categoryName || 'Unknown',
      paymentMethod: t.paymentMethod || '-',
      amount: t.amountMinor,
      status: t.status,
      source: t.source,
    }));

    return {
      currency,
      transactions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionsForExport(businessId: string, query: TransactionReportQueryDto): Promise<TransactionReportRow[]> {
    const result = await this.getTransactionReport(businessId, { ...query, page: 1, limit: 10000 });
    return result.transactions;
  }
}
