import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { BetaInviteStatus } from '../enums/beta-invite-status.enum';

export type BetaInviteDocument = HydratedDocument<BetaInvite>;

@Schema({ timestamps: true, collection: 'beta_invites' })
export class BetaInvite {
  @Prop({ required: true, unique: true })
  codeHash: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({
    type: String,
    enum: BetaInviteStatus,
    default: BetaInviteStatus.ACTIVE,
  })
  status: BetaInviteStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Number, default: 1 })
  maxUses: number;

  @Prop({ type: Number, default: 0 })
  usedCount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  createdByUserId?: mongoose.Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  cohort?: string;
}

export const BetaInviteSchema = SchemaFactory.createForClass(BetaInvite);

BetaInviteSchema.index({ codeHash: 1 }, { unique: true });
