import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReminderStatus } from '../enums/reminder-status.enum';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';
import { ReminderChannel } from '../enums/reminder-channel.enum';

export type ReminderDocument = HydratedDocument<Reminder>;

@Schema({
  timestamps: true,
  collection: 'reminders',
})
export class Reminder {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, enum: ReminderTrigger, required: true })
  trigger: ReminderTrigger;

  @Prop({ type: String, enum: ReminderChannel, default: ReminderChannel.WHATSAPP })
  channel: ReminderChannel;

  @Prop({ type: String, enum: ReminderStatus, default: ReminderStatus.PENDING })
  status: ReminderStatus;

  @Prop({ type: Date, required: true })
  scheduledAt: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: String })
  providerMessageId?: string;

  @Prop({ type: String, trim: true })
  errorMessage?: string;

  @Prop({ type: String })
  errorCode?: string;

  @Prop({ type: String, required: true })
  deduplicationKey: string;

  @Prop({ type: Number, default: 0 })
  sendAttempts: number;

  @Prop({ type: String, trim: true })
  snapshotInvoiceNumber?: string;

  @Prop({ type: Number })
  snapshotTotalMinor?: number;

  @Prop({ type: Number })
  snapshotRemainingMinor?: number;

  @Prop({ type: Date })
  snapshotDueDate?: Date;

  @Prop({ type: String, trim: true })
  snapshotCustomerPhone?: string;

  @Prop({ type: String, trim: true })
  snapshotCustomerName?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  triggeredByUserId?: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 500 })
  failureReason?: string;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

ReminderSchema.index({ businessId: 1, invoiceId: 1, scheduledAt: 1 });
ReminderSchema.index({ businessId: 1, status: 1, scheduledAt: 1 });
ReminderSchema.index({ deduplicationKey: 1 }, { unique: true });
ReminderSchema.index({ businessId: 1, createdAt: -1 });
