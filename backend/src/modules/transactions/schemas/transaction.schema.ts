import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { TransactionSource } from '../../../common/enums/transaction-source.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ type: Number, required: true, min: 1 })
  amountMinor: number;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, trim: true, maxlength: 500 })
  description?: string;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  notes?: string;

  @Prop({ type: String, enum: PaymentMethod, required: false })
  paymentMethod?: PaymentMethod;

  @Prop({ type: String, trim: true, maxlength: 200 })
  reference?: string;

  @Prop({ type: String, enum: TransactionSource, default: TransactionSource.MANUAL })
  source: TransactionSource;

  @Prop({ type: String, enum: TransactionStatus, default: TransactionStatus.CONFIRMED })
  status: TransactionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  confirmedByUserId?: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  voidedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  voidedByUserId?: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 500 })
  voidReason?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ businessId: 1, date: -1 });
TransactionSchema.index({ businessId: 1, type: 1, date: -1 });
TransactionSchema.index({ businessId: 1, status: 1, date: -1 });
TransactionSchema.index({ businessId: 1, categoryId: 1, date: -1 });
TransactionSchema.index({ businessId: 1, createdAt: -1 });
TransactionSchema.index({ businessId: 1, customerId: 1, date: -1 });
