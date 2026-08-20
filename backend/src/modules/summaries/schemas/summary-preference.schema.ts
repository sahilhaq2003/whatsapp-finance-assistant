import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SummaryChannel } from '../enums/summary-channel.enum';
import { WeeklyDay } from '../enums/weekly-day.enum';

export type SummaryPreferenceDocument = HydratedDocument<SummaryPreference>;

@Schema({
  timestamps: true,
  collection: 'summary_preferences',
})
export class SummaryPreference {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true, unique: true })
  businessId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  dailyEnabled: boolean;

  @Prop({ type: Number, default: 20 })
  dailySendHour: number;

  @Prop({ type: Number, default: 0 })
  dailySendMinute: number;

  @Prop({ type: Boolean, default: false })
  weeklyEnabled: boolean;

  @Prop({ type: String, enum: WeeklyDay, default: WeeklyDay.SUNDAY })
  weeklyDay: WeeklyDay;

  @Prop({ type: Number, default: 20 })
  weeklySendHour: number;

  @Prop({ type: Number, default: 0 })
  weeklySendMinute: number;

  @Prop({ type: String, default: 'Asia/Colombo' })
  timezone: string;

  @Prop({ type: String, enum: SummaryChannel, default: SummaryChannel.WHATSAPP })
  channel: SummaryChannel;

  @Prop({ type: Boolean, default: true })
  includeIncome: boolean;

  @Prop({ type: Boolean, default: true })
  includeExpenses: boolean;

  @Prop({ type: Boolean, default: true })
  includeNetCashFlow: boolean;

  @Prop({ type: Boolean, default: true })
  includeTransactionCount: boolean;

  @Prop({ type: Boolean, default: true })
  includeOutstandingInvoices: boolean;

  @Prop({ type: Boolean, default: false })
  includeTopCategories: boolean;

  @Prop({ type: Boolean, default: true })
  includeOverdueInvoices: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedByUserId?: Types.ObjectId;
}

export const SummaryPreferenceSchema = SchemaFactory.createForClass(SummaryPreference);

SummaryPreferenceSchema.index({ businessId: 1 }, { unique: true });
