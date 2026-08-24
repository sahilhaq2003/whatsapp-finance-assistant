import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true, collection: 'whatsapp_conversations' })
export class Conversation {
  @Prop({ type: 'ObjectId', ref: 'Business', required: true })
  businessId: Types.ObjectId;
  @Prop({ type: 'ObjectId', ref: 'WhatsAppConnection', required: true })
  whatsappConnectionId: Types.ObjectId;
  @Prop({ required: true, trim: true }) customerPhone: string;
  @Prop({ trim: true }) customerName?: string;
  @Prop({ default: 'open', enum: ['open', 'closed'] }) status: string;
  @Prop({ default: 0, min: 0 }) unreadCount: number;
  @Prop() latestMessagePreview?: string;
  @Prop() latestMessageAt?: Date;
  @Prop() lastCustomerMessageAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ businessId: 1, customerPhone: 1 }, { unique: true });
ConversationSchema.index({ businessId: 1, latestMessageAt: -1 });
