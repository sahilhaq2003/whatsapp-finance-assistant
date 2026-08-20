import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceItemDocument = HydratedDocument<InvoiceItem>;

@Schema({
  timestamps: true,
  collection: 'invoice_items',
})
export class InvoiceItem {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 500 })
  description: string;

  @Prop({ type: String, required: true })
  quantity: string;

  @Prop({ type: Number, required: true, min: 0 })
  rateMinor: number;

  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

InvoiceItemSchema.index({ businessId: 1, invoiceId: 1 });
