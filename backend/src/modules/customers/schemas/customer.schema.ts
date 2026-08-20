import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CustomerStatus } from '../../../common/enums/customer-status.enum';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ _id: false })
export class CustomerAddress {
  @Prop({ type: String, trim: true, maxlength: 200 })
  line1?: string;

  @Prop({ type: String, trim: true, maxlength: 200 })
  line2?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  city?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  district?: string;

  @Prop({ type: String, trim: true, maxlength: 20 })
  postalCode?: string;

  @Prop({ type: String, trim: true, maxlength: 10, default: 'LK' })
  country?: string;
}

export const CustomerAddressSchema =
  SchemaFactory.createForClass(CustomerAddress);

@Schema({
  timestamps: true,
  collection: 'customers',
})
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name: string;

  @Prop({ type: String, trim: true, maxlength: 30 })
  phone?: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 254 })
  email?: string;

  @Prop({ type: CustomerAddressSchema })
  address?: CustomerAddress;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  notes?: string;

  @Prop({ type: String, enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByUserId: Types.ObjectId;

  @Prop({ type: Date })
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedByUserId?: Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ businessId: 1, status: 1 });
CustomerSchema.index({ businessId: 1, name: 1 });
CustomerSchema.index({ businessId: 1, phone: 1 });
CustomerSchema.index({ businessId: 1, email: 1 });
CustomerSchema.index({ businessId: 1, createdAt: -1 });
