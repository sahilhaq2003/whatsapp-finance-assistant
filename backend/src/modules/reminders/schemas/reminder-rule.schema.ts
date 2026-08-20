import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';
import { ReminderChannel } from '../enums/reminder-channel.enum';

export type ReminderRuleDocument = HydratedDocument<ReminderRule>;

@Schema({
  timestamps: true,
  collection: 'reminder_rules',
})
export class ReminderRule {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, enum: ReminderTrigger, required: true })
  trigger: ReminderTrigger;

  @Prop({ type: String, enum: ReminderChannel, default: ReminderChannel.WHATSAPP })
  channel: ReminderChannel;

  @Prop({ type: Boolean, default: false })
  isEnabled: boolean;

  @Prop({ type: Number, default: 3 })
  offsetDays: number;

  @Prop({ type: Number, default: 0 })
  dayOfMonth: number;

  @Prop({ type: Number, default: 1 })
  hourOfDay: number;

  @Prop({ type: Number, default: 9 })
  minuteOfHour: number;

  @Prop({ type: Number, default: 5 })
  maxRemindsPerInvoice: number;

  @Prop({ type: Number, default: 60 })
  manualCooldownMinutes: number;

  @Prop({ type: String, trim: true })
  templateName?: string;

  @Prop({ type: String, trim: true })
  templateLanguage?: string;
}

export const ReminderRuleSchema = SchemaFactory.createForClass(ReminderRule);

ReminderRuleSchema.index({ businessId: 1, trigger: 1 }, { unique: true });
