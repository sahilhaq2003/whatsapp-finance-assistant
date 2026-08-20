import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FeatureKey } from '../enums/feature-key.enum';

export type PlanDefinitionDocument = PlanDefinition & Document;

class FeatureToggle {
  @Prop({ required: true, enum: FeatureKey })
  key!: FeatureKey;

  @Prop({ default: false })
  enabled!: boolean;
}

class PlanLimits {
  @Prop({ default: 50 })
  customersPerMonth!: number;

  @Prop({ default: 100 })
  invoicesPerMonth!: number;

  @Prop({ default: 50 })
  aiRequestsPerMonth!: number;

  @Prop({ default: 10 })
  voiceMinutesPerMonth!: number;

  @Prop({ default: 20 })
  remindersPerMonth!: number;

  @Prop({ default: 5 })
  exportsPerMonth!: number;
}

@Schema({ timestamps: true, collection: 'plan_definitions' })
export class PlanDefinition {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, default: '' })
  description!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({
    type: [
      {
        key: { type: String, enum: FeatureKey },
        enabled: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  features!: FeatureToggle[];

  @Prop({
    type: {
      customersPerMonth: { type: Number, default: 50 },
      invoicesPerMonth: { type: Number, default: 100 },
      aiRequestsPerMonth: { type: Number, default: 50 },
      voiceMinutesPerMonth: { type: Number, default: 10 },
      remindersPerMonth: { type: Number, default: 20 },
      exportsPerMonth: { type: Number, default: 5 },
    },
    default: {},
  })
  limits!: PlanLimits;
}

export const PlanDefinitionSchema =
  SchemaFactory.createForClass(PlanDefinition);
