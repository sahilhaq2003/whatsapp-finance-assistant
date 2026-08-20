import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  amountMinor: number;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, trim: true, maxlength: 200 })
  reference?: string;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  notes?: string;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.CONFIRMED,
  })
  status: PaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByUserId: Types.ObjectId;

  @Prop({ type: Date })
  voidedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  voidedByUserId?: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 500 })
  voidReason?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ businessId: 1, invoiceId: 1, date: -1 });
PaymentSchema.index({ businessId: 1, customerId: 1, date: -1 });
PaymentSchema.index({ businessId: 1, status: 1, date: -1 });
