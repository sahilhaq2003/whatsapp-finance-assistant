import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BusinessStatus } from '../../../common/enums/business-status.enum';

export type BusinessDocument = HydratedDocument<Business>;

@Schema({ _id: false })
export class BusinessAddress {
  @Prop({ trim: true })
  line1?: string;

  @Prop({ trim: true })
  line2?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  district?: string;

  @Prop({ trim: true })
  postalCode?: string;

  @Prop({ trim: true })
  country?: string;
}

export const BusinessAddressSchema =
  SchemaFactory.createForClass(BusinessAddress);

@Schema({ _id: false })
export class BusinessFeatures {
  @Prop({ type: Boolean, default: false })
  voiceInput: boolean;

  @Prop({ type: Boolean, default: false })
  automatedReminders: boolean;

  @Prop({ type: Boolean, default: false })
  advancedReports: boolean;

  @Prop({ type: Boolean, default: false })
  teamAccess: boolean;
}

export const BusinessFeaturesSchema =
  SchemaFactory.createForClass(BusinessFeatures);

@Schema({ _id: false })
export class BusinessUsageLimits {
  @Prop({ type: Number, default: 100 })
  monthlyAiMessages: number;

  @Prop({ type: Number, default: 20 })
  customers: number;

  @Prop({ type: Number, default: 20 })
  invoices: number;

  @Prop({ type: Number, default: 30 })
  monthlyVoiceMinutes: number;

  @Prop({ type: Number, default: 50 })
  monthlyVoiceMessages: number;
}

export const BusinessUsageLimitsSchema = SchemaFactory.createForClass(
  BusinessUsageLimits,
);

@Schema({
  timestamps: true,
  collection: 'businesses',
})
export class Business {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  slug: string;

  @Prop({ type: String, default: 'LK' })
  country: string;

  @Prop({ type: String, default: 'LKR' })
  baseCurrency: string;

  @Prop({ type: String, default: 'Asia/Colombo' })
  timezone: string;

  @Prop({ type: String, default: 'en' })
  defaultLanguage: string;

  @Prop({ type: String, enum: BusinessStatus, default: BusinessStatus.ACTIVE })
  status: BusinessStatus;

  @Prop({ type: String })
  businessType?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ type: BusinessAddressSchema })
  address?: BusinessAddress;

  @Prop({ type: String, default: 'free' })
  planCode: string;

  @Prop({ type: BusinessFeaturesSchema, default: () => ({}) })
  features: BusinessFeatures;

  @Prop({ type: BusinessUsageLimitsSchema, default: () => ({}) })
  usageLimits: BusinessUsageLimits;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

BusinessSchema.index({ status: 1 });
BusinessSchema.index({ country: 1 });
BusinessSchema.index({ planCode: 1 });
