import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SummaryFrequency } from '../enums/summary-frequency.enum';
import { SummaryStatus } from '../enums/summary-status.enum';

export type FinancialSummaryDocument = HydratedDocument<FinancialSummary>;

@Schema({ _id: false })
export class SummaryCategoryBreakdown {
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  transactionCount: number;
}

export const SummaryCategoryBreakdownSchema = SchemaFactory.createForClass(SummaryCategoryBreakdown);

@Schema({
  timestamps: true,
  collection: 'financial_summaries',
})
export class FinancialSummary {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, enum: SummaryFrequency, required: true })
  frequency: SummaryFrequency;

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: String, default: 'Asia/Colombo' })
  timezone: string;

  @Prop({ type: String, default: 'LKR' })
  currency: string;

  @Prop({ type: Number, required: true, min: 0 })
  incomeMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  expenseMinor: number;

  @Prop({ type: Number, required: true })
  netCashFlowMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  transactionCount: number;

  @Prop({ type: Number, required: true, min: 0 })
  outstandingAmountMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  outstandingInvoiceCount: number;

  @Prop({ type: Number, required: true, min: 0 })
  overdueAmountMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  overdueInvoiceCount: number;

  @Prop({ type: [SummaryCategoryBreakdownSchema], default: [] })
  topExpenseCategories: Array<{
    categoryId: Types.ObjectId;
    name: string;
    amountMinor: number;
    transactionCount: number;
  }>;

  @Prop({ type: [SummaryCategoryBreakdownSchema], default: [] })
  topIncomeCategories: Array<{
    categoryId: Types.ObjectId;
    name: string;
    amountMinor: number;
    transactionCount: number;
  }>;

  @Prop({ type: String, enum: SummaryStatus, default: SummaryStatus.GENERATED })
  status: SummaryStatus;

  @Prop({ type: String })
  providerMessageId?: string;

  @Prop({ type: Date })
  generatedAt: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date })
  failedAt?: Date;

  @Prop({ type: String })
  failureCode?: string;

  @Prop({ type: Number, default: 0 })
  sendAttempts: number;

  @Prop({ type: String, unique: true })
  deduplicationKey?: string;
}

export const FinancialSummarySchema = SchemaFactory.createForClass(FinancialSummary);

FinancialSummarySchema.index(
  { businessId: 1, frequency: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);
FinancialSummarySchema.index({ businessId: 1, createdAt: -1 });
FinancialSummarySchema.index({ businessId: 1, status: 1 });
FinancialSummarySchema.index({ deduplicationKey: 1 }, { unique: true });
