import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DataRequest,
  DataRequestDocument,
} from '../schemas/data-request.schema';
import { DataRequestType } from '../enums/data-request-type.enum';
import { DataRequestStatus } from '../enums/data-request-status.enum';
import {
  Business,
  BusinessDocument,
} from '../../businesses/schemas/business.schema';
import {
  Category,
  CategoryDocument,
} from '../../categories/schemas/category.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../transactions/schemas/transaction.schema';
import {
  Customer,
  CustomerDocument,
} from '../../customers/schemas/customer.schema';
import {
  Invoice,
  InvoiceDocument,
} from '../../invoices/schemas/invoice.schema';
import {
  InvoiceItem,
  InvoiceItemDocument,
} from '../../invoices/schemas/invoice-item.schema';
import {
  Payment,
  PaymentDocument,
} from '../../payments/schemas/payment.schema';
import {
  Reminder,
  ReminderDocument,
} from '../../reminders/schemas/reminder.schema';
import {
  FinancialSummary,
  FinancialSummaryDocument,
} from '../../summaries/schemas/financial-summary.schema';
import {
  AiProposal,
  AiProposalDocument,
} from '../../ai/schemas/ai-proposal.schema';

@Injectable()
export class DataRequestsService {
  constructor(
    @InjectModel(DataRequest.name)
    private dataRequestModel: Model<DataRequestDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(InvoiceItem.name)
    private invoiceItemModel: Model<InvoiceItemDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(FinancialSummary.name)
    private financialSummaryModel: Model<FinancialSummaryDocument>,
    @InjectModel(AiProposal.name)
    private aiProposalModel: Model<AiProposalDocument>,
  ) {}

  async createExportRequest(
    userId: string,
    businessId: string,
  ): Promise<DataRequestDocument> {
    const request = new this.dataRequestModel({
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
      type: DataRequestType.EXPORT,
      status: DataRequestStatus.PENDING,
      requestedAt: new Date(),
    });

    return request.save();
  }

  async createDeletionRequest(
    userId: string,
    businessId: string,
    confirmation: string,
  ): Promise<DataRequestDocument> {
    if (confirmation !== 'CONFIRM_DELETION') {
      throw new BadRequestException(
        'Invalid confirmation. Please type CONFIRM_DELETION to proceed.',
      );
    }

    const request = new this.dataRequestModel({
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
      type: DataRequestType.DELETION,
      status: DataRequestStatus.PENDING_REVIEW,
      requestedAt: new Date(),
    });

    return request.save();
  }

  async getUserRequests(userId: string): Promise<DataRequestDocument[]> {
    return this.dataRequestModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getBusinessDataForExport(
    businessId: string,
  ): Promise<Record<string, unknown>> {
    const businessIdObj = new Types.ObjectId(businessId);

    const [
      business,
      categories,
      transactions,
      customers,
      invoices,
      invoiceItems,
      payments,
      reminders,
      summaries,
      aiProposals,
    ] = await Promise.all([
      this.businessModel.findById(businessIdObj).lean().exec(),
      this.categoryModel.find({ businessId: businessIdObj }).lean().exec(),
      this.transactionModel
        .find({ businessId: businessIdObj })
        .sort({ date: -1 })
        .lean()
        .exec(),
      this.customerModel.find({ businessId: businessIdObj }).lean().exec(),
      this.invoiceModel
        .find({ businessId: businessIdObj })
        .sort({ issueDate: -1 })
        .lean()
        .exec(),
      this.invoiceItemModel.find({ businessId: businessIdObj }).lean().exec(),
      this.paymentModel
        .find({ businessId: businessIdObj })
        .sort({ date: -1 })
        .lean()
        .exec(),
      this.reminderModel
        .find({ businessId: businessIdObj })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.financialSummaryModel
        .find({ businessId: businessIdObj })
        .sort({ periodStart: -1 })
        .lean()
        .exec(),
      this.aiProposalModel
        .find({ businessId: businessIdObj })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    return {
      business,
      categories,
      transactions,
      customers,
      invoices,
      invoiceItems,
      payments,
      reminders,
      financialSummaries: summaries,
      aiProposals,
    };
  }

  async getRequestById(
    requestId: string,
    userId: string,
  ): Promise<DataRequestDocument> {
    const request = await this.dataRequestModel
      .findOne({
        _id: new Types.ObjectId(requestId),
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!request) {
      throw new NotFoundException('Data request not found');
    }

    return request;
  }

  async listAllRequests(
    type?: DataRequestType,
    status?: DataRequestStatus,
  ): Promise<DataRequestDocument[]> {
    const query: Record<string, unknown> = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    return this.dataRequestModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName phone')
      .populate('businessId', 'name slug')
      .lean()
      .exec();
  }

  async updateRequestStatus(
    requestId: string,
    status: DataRequestStatus,
    reviewNotes?: string,
  ): Promise<DataRequestDocument | null> {
    const update: Record<string, unknown> = { status };

    if (
      status === DataRequestStatus.COMPLETED ||
      status === DataRequestStatus.REJECTED
    ) {
      update.processedAt = new Date();
    }

    if (reviewNotes) {
      update.reviewNotes = reviewNotes;
    }

    return this.dataRequestModel
      .findByIdAndUpdate(requestId, update, { new: true })
      .lean()
      .exec();
  }
}
