import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ _id: false })
export class InvoiceCustomerSnapshot {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({ type: String, trim: true })
  email?: string;

  @Prop({ type: Object })
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    district?: string;
    postalCode?: string;
    country?: string;
  };
}

export const InvoiceCustomerSnapshotSchema =
  SchemaFactory.createForClass(InvoiceCustomerSnapshot);

@Schema({
  timestamps: true,
  collection: 'invoices',
})
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  invoiceNumber: string;

  @Prop({ type: Date, required: true })
  issueDate: Date;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Prop({
    type: String,
    enum: InvoicePaymentStatus,
    default: InvoicePaymentStatus.UNPAID,
  })
  paymentStatus: InvoicePaymentStatus;

  @Prop({ type: Number, required: true, min: 0 })
  subtotalMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalMinor: number;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  notes?: string;

  @Prop({ type: InvoiceCustomerSnapshotSchema, required: true })
  customerSnapshot: InvoiceCustomerSnapshot;

  @Prop({ type: Date })
  issuedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  issuedByUserId?: Types.ObjectId;

  @Prop({ type: Date })
  voidedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  voidedByUserId?: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 500 })
  voidReason?: string;

  @Prop({ type: String, trim: true })
  pdfKey?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByUserId: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ businessId: 1, customerId: 1, issueDate: -1 });
InvoiceSchema.index({ businessId: 1, status: 1, issueDate: -1 });
InvoiceSchema.index({ businessId: 1, paymentStatus: 1, dueDate: 1 });
InvoiceSchema.index({ businessId: 1, createdAt: -1 });
