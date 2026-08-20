import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SenderStatus } from '../../../common/enums/sender-status.enum';

export type WhatsAppAuthorizedSenderDocument = HydratedDocument<WhatsAppAuthorizedSender>;

@Schema({
  timestamps: true,
  collection: 'whatsapp_authorized_senders',
})
export class WhatsAppAuthorizedSender {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WhatsAppConnection', required: true })
  whatsappConnectionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  phoneE164: string;

  @Prop({ type: String, enum: SenderStatus, default: SenderStatus.PENDING })
  status: SenderStatus;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: Date })
  revokedAt?: Date;
}

export const WhatsAppAuthorizedSenderSchema = SchemaFactory.createForClass(WhatsAppAuthorizedSender);

WhatsAppAuthorizedSenderSchema.index({ businessId: 1 });
WhatsAppAuthorizedSenderSchema.index({ businessId: 1, userId: 1 });
WhatsAppAuthorizedSenderSchema.index({ whatsappConnectionId: 1, phoneE164: 1 });
WhatsAppAuthorizedSenderSchema.index({ businessId: 1, phoneE164: 1 });
WhatsAppAuthorizedSenderSchema.index({ status: 1 });
