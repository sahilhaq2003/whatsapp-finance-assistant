import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AiReplyDraftDocument = HydratedDocument<AiReplyDraft>;
export type AiDraftStatus =
  'generating' | 'waiting_for_approval' | 'approved' | 'rejected' | 'failed';

@Schema({ timestamps: true, collection: 'whatsapp_ai_reply_drafts' })
export class AiReplyDraft {
  @Prop({ type: 'ObjectId', ref: 'Business', required: true })
  businessId: Types.ObjectId;
  @Prop({ type: 'ObjectId', ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;
  @Prop({ type: 'ObjectId', ref: 'MessageEvent', required: true })
  sourceMessageId: Types.ObjectId;
  @Prop({
    required: true,
    enum: [
      'generating',
      'waiting_for_approval',
      'approved',
      'rejected',
      'failed',
    ],
  })
  status: AiDraftStatus;
  @Prop({ default: true }) active: boolean;
  @Prop() originalText?: string;
  @Prop() finalText?: string;
  @Prop() generationError?: string;
  @Prop({ default: false }) humanEdited: boolean;
  @Prop({ type: 'ObjectId', ref: 'User' })
  reviewedByUserId?: Types.ObjectId;
  @Prop() generatedAt?: Date;
  @Prop() reviewedAt?: Date;
  @Prop() sentAt?: Date;
  @Prop({ type: 'ObjectId', ref: 'MessageEvent' })
  outgoingMessageId?: Types.ObjectId;
}

export const AiReplyDraftSchema = SchemaFactory.createForClass(AiReplyDraft);
AiReplyDraftSchema.index({ businessId: 1, conversationId: 1, createdAt: -1 });
AiReplyDraftSchema.index(
  { sourceMessageId: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
