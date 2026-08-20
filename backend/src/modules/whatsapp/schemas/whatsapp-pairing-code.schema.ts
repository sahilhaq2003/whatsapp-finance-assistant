import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WhatsAppPairingCodeDocument = HydratedDocument<WhatsAppPairingCode>;

@Schema({
  timestamps: true,
  collection: 'whatsapp_pairing_codes',
})
export class WhatsAppPairingCode {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  codeHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'WhatsAppAuthorizedSender' })
  usedBySenderId?: Types.ObjectId;
}

export const WhatsAppPairingCodeSchema = SchemaFactory.createForClass(WhatsAppPairingCode);

WhatsAppPairingCodeSchema.index({ businessId: 1 });
WhatsAppPairingCodeSchema.index({ businessId: 1, userId: 1 });
WhatsAppPairingCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
WhatsAppPairingCodeSchema.index({ usedAt: 1 });
