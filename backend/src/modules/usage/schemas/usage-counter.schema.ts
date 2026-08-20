import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { UsageMetric } from '../enums/usage-metric.enum';

export type UsageCounterDocument = UsageCounter & Document;

@Schema({ timestamps: false, collection: 'usage_counters' })
export class UsageCounter {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Business',
  })
  businessId!: mongoose.Types.ObjectId;

  @Prop({ type: String, enum: UsageMetric, required: true })
  metric!: UsageMetric;

  @Prop({ type: String, enum: ['month'], default: 'month' })
  periodType!: string;

  @Prop({ type: String, required: true })
  periodKey!: string;

  @Prop({ type: Number, default: 0 })
  quantity!: number;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const UsageCounterSchema = SchemaFactory.createForClass(UsageCounter);

UsageCounterSchema.index(
  { businessId: 1, metric: 1, periodType: 1, periodKey: 1 },
  { unique: true },
);
