import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FeedbackType } from '../enums/feedback-type.enum';
import { FeedbackStatus } from '../enums/feedback-status.enum';

export type FeedbackDocument = HydratedDocument<Feedback>;

@Schema({
  timestamps: true,
  collection: 'feedback',
})
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: FeedbackType, required: true })
  type: FeedbackType;

  @Prop({ type: String, required: true, maxlength: 5000 })
  message: string;

  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop({ type: String, trim: true, maxlength: 500 })
  page?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  relatedEntityType?: string;

  @Prop({ type: Types.ObjectId })
  relatedEntityId?: Types.ObjectId;

  @Prop({ type: String, enum: FeedbackStatus, default: FeedbackStatus.NEW })
  status: FeedbackStatus;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  adminNotes?: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

FeedbackSchema.index({ businessId: 1, createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });
