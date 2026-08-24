import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WhatsAppProvider } from '../../../common/enums/whatsapp-provider.enum';
import { MessageDirection } from '../../../common/enums/message-direction.enum';
import { MessageType } from '../../../common/enums/message-type.enum';
import { MessageProcessingStatus } from '../../../common/enums/message-processing-status.enum';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';

export type MessageEventDocument = HydratedDocument<MessageEvent>;

@Schema({ _id: false })
export class MessageEventMetadata {
  @Prop({ type: String })
  rawEventType?: string;

  @Prop({ type: String })
  rawEventId?: string;

  @Prop({ type: String })
  mediaMimeType?: string;

  @Prop({ type: Number })
  mediaFileSize?: number;

  @Prop({ type: Number })
  voiceDurationSeconds?: number;

  @Prop({
    type: String,
    enum: ['not_required', 'pending', 'processing', 'completed', 'failed'],
    default: 'not_required',
  })
  transcriptionStatus?: string;

  @Prop({ type: String })
  transcriptionErrorCode?: string;
}

export const MessageEventMetadataSchema =
  SchemaFactory.createForClass(MessageEventMetadata);

@Schema({
  timestamps: true,
  collection: 'message_events',
})
export class MessageEvent {
  @Prop({ type: 'ObjectId', ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'WhatsAppConnection', required: true })
  whatsappConnectionId: Types.ObjectId;

  @Prop({ type: String, enum: WhatsAppProvider, required: true })
  provider: WhatsAppProvider;

  @Prop({ type: String, required: true })
  providerMessageId: string;

  @Prop({ type: String, enum: MessageDirection, required: true })
  direction: MessageDirection;

  @Prop({ type: String, required: true })
  senderPhone: string;

  @Prop({ type: String, required: true })
  recipientPhone: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.UNKNOWN })
  messageType: MessageType;

  @Prop({ type: String })
  text?: string;

  @Prop({ type: String })
  mediaId?: string;

  @Prop({ type: Date })
  providerTimestamp?: Date;

  @Prop({
    type: String,
    enum: MessageProcessingStatus,
    default: MessageProcessingStatus.RECEIVED,
  })
  processingStatus: MessageProcessingStatus;

  @Prop({ type: String })
  processingErrorCode?: string;

  @Prop({ type: String })
  replyToProviderMessageId?: string;

  @Prop({ type: String, enum: DeliveryStatus })
  deliveryStatus?: DeliveryStatus;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date })
  failedAt?: Date;

  @Prop({ type: String })
  failureCode?: string;

  @Prop({ type: MessageEventMetadataSchema })
  metadata?: MessageEventMetadata;

  @Prop({ type: String, enum: ['customer', 'human_agent', 'ai'] })
  senderType?: string;

  @Prop({ type: Boolean, default: false })
  originatedFromAi?: boolean;

  @Prop({ type: Boolean, default: false })
  humanEdited?: boolean;
}

export const MessageEventSchema = SchemaFactory.createForClass(MessageEvent);

MessageEventSchema.index(
  { provider: 1, providerMessageId: 1 },
  { unique: true },
);
MessageEventSchema.index({ businessId: 1 });
MessageEventSchema.index({ whatsappConnectionId: 1 });
MessageEventSchema.index({ businessId: 1, providerMessageId: 1 });
MessageEventSchema.index({ businessId: 1, direction: 1, createdAt: -1 });
MessageEventSchema.index({ processingStatus: 1 });
MessageEventSchema.index({ senderPhone: 1 });
MessageEventSchema.index({
  businessId: 1,
  conversationId: 1,
  providerTimestamp: 1,
  createdAt: 1,
});
