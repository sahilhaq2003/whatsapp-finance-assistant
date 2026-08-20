import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WhatsAppProvider } from '../../../common/enums/whatsapp-provider.enum';
import { WhatsAppConnectionStatus } from '../../../common/enums/whatsapp-connection-status.enum';

export type WhatsAppConnectionDocument = HydratedDocument<WhatsAppConnection>;

@Schema({
  timestamps: true,
  collection: 'whatsapp_connections',
})
export class WhatsAppConnection {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, enum: WhatsAppProvider, default: WhatsAppProvider.META_CLOUD })
  provider: WhatsAppProvider;

  @Prop({ type: String, required: true })
  wabaId: string;

  @Prop({ type: String, required: true, unique: true })
  phoneNumberId: string;

  @Prop({ type: String, required: true })
  displayPhoneNumber: string;

  @Prop({ type: String, required: true })
  businessPhoneE164: string;

  @Prop({ type: String, enum: WhatsAppConnectionStatus, default: WhatsAppConnectionStatus.PENDING })
  status: WhatsAppConnectionStatus;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  connectedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  connectedByUserId?: Types.ObjectId;
}

export const WhatsAppConnectionSchema = SchemaFactory.createForClass(WhatsAppConnection);

WhatsAppConnectionSchema.index({ businessId: 1 });
WhatsAppConnectionSchema.index({ phoneNumberId: 1 }, { unique: true });
WhatsAppConnectionSchema.index({ wabaId: 1 });
WhatsAppConnectionSchema.index({ status: 1 });
WhatsAppConnectionSchema.index({ businessId: 1, isActive: 1 });
