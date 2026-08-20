import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceCounterDocument = HydratedDocument<InvoiceCounter>;

@Schema({
  timestamps: false,
  collection: 'invoice_counters',
})
export class InvoiceCounter {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  year: number;

  @Prop({ type: Number, required: true, default: 0 })
  sequence: number;
}

export const InvoiceCounterSchema =
  SchemaFactory.createForClass(InvoiceCounter);

InvoiceCounterSchema.index({ businessId: 1, year: 1 }, { unique: true });
