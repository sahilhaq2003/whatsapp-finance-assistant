import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuthSessionDocument = HydratedDocument<AuthSession>;

@Schema({
  timestamps: true,
  collection: 'auth_sessions',
})
export class AuthSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  tokenHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  ipAddress?: string;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
