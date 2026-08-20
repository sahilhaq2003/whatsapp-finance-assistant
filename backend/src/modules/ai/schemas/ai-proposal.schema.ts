import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AiIntent } from '../enums/ai-intent.enum';
import { AiProposalStatus } from '../enums/ai-proposal-status.enum';

export type AiProposalDocument = HydratedDocument<AiProposal>;

@Schema({ _id: false })
export class ProposalParsedData {
  @Prop({ type: String, enum: ['income', 'expense'] })
  type?: string | null;

  @Prop({ type: Number })
  amount?: number | null;

  @Prop({ type: String })
  currency?: string | null;

  @Prop({ type: String })
  category?: string | null;

  @Prop({ type: String })
  categoryId?: string | null;

  @Prop({ type: String })
  date?: string | null;

  @Prop({ type: String })
  description?: string | null;

  @Prop({ type: String })
  customer?: string | null;

  @Prop({ type: String })
  customerId?: string | null;

  @Prop({ type: String })
  paymentMethod?: string | null;
}

export const ProposalParsedDataSchema = SchemaFactory.createForClass(ProposalParsedData);

@Schema({ _id: false })
export class ProposalRevision {
  @Prop({ type: Date, required: true })
  timestamp: Date;

  @Prop({ type: Object })
  previousData: Record<string, unknown>;

  @Prop({ type: Object })
  updatedData: Record<string, unknown>;

  @Prop({ type: String, required: true })
  sourceText: string;
}

export const ProposalRevisionSchema = SchemaFactory.createForClass(ProposalRevision);

@Schema({
  timestamps: true,
  collection: 'ai_proposals',
})
export class AiProposal {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MessageEvent', required: true })
  messageEventId: Types.ObjectId;

  @Prop({ type: String, enum: AiIntent, required: true })
  intent: AiIntent;

  @Prop({ type: String, required: true })
  originalText: string;

  @Prop({ type: String, enum: ['whatsapp_text', 'whatsapp_voice', 'dashboard'], default: 'whatsapp_text' })
  inputSource?: string;

  @Prop({ type: String })
  transcript?: string;

  @Prop({ type: Number })
  speechConfidence?: number;

  @Prop({ type: ProposalParsedDataSchema, required: true })
  parsedData: ProposalParsedData;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  confidence: number;

  @Prop({ type: String, enum: AiProposalStatus, default: AiProposalStatus.PENDING })
  status: AiProposalStatus;

  @Prop({ type: [String], default: [] })
  validationErrors: string[];

  @Prop({ type: String })
  clarificationQuestion?: string;

  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  confirmedTransactionId?: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  rejectedAt?: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: [ProposalRevisionSchema], default: [] })
  revisionHistory: Array<{
    timestamp: Date;
    previousData: Record<string, unknown>;
    updatedData: Record<string, unknown>;
    sourceText: string;
  }>;
}

export const AiProposalSchema = SchemaFactory.createForClass(AiProposal);

AiProposalSchema.index({ businessId: 1, status: 1 });
AiProposalSchema.index({ businessId: 1, userId: 1, status: 1 });
AiProposalSchema.index({ messageEventId: 1 });
AiProposalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AiProposalSchema.index({ businessId: 1, createdAt: -1 });
AiProposalSchema.index({ businessId: 1, intent: 1, messageEventId: 1 });
