import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DataRequestType } from '../enums/data-request-type.enum';
import { DataRequestStatus } from '../enums/data-request-status.enum';

export type DataRequestDocument = HydratedDocument<DataRequest>;

@Schema({
  timestamps: true,
  collection: 'data_requests',
})
export class DataRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, enum: DataRequestType, required: true })
  type: DataRequestType;

  @Prop({
    type: String,
    enum: DataRequestStatus,
    default: DataRequestStatus.PENDING,
  })
  status: DataRequestStatus;

  @Prop({ type: Date, default: Date.now })
  requestedAt: Date;

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: String })
  fileKey?: string;

  @Prop({ type: Date })
  fileExpiresAt?: Date;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  reviewNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedByUserId?: Types.ObjectId;
}

export const DataRequestSchema = SchemaFactory.createForClass(DataRequest);

DataRequestSchema.index({ userId: 1, createdAt: -1 });
DataRequestSchema.index({ businessId: 1, type: 1 });
DataRequestSchema.index({ status: 1, createdAt: -1 });
