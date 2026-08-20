import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { BetaEnrollmentStatus } from '../enums/beta-enrollment-status.enum';

export type BetaEnrollmentDocument = HydratedDocument<BetaEnrollment>;

@Schema({ timestamps: true, collection: 'beta_enrollments' })
export class BetaEnrollment {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  })
  businessId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'BetaInvite' })
  inviteId?: mongoose.Types.ObjectId;

  @Prop({ trim: true })
  cohort?: string;

  @Prop({
    type: String,
    enum: BetaEnrollmentStatus,
    default: BetaEnrollmentStatus.INVITED,
  })
  status: BetaEnrollmentStatus;

  @Prop()
  startedAt?: Date;

  @Prop()
  activatedAt?: Date;

  @Prop()
  pausedAt?: Date;

  @Prop()
  exitedAt?: Date;

  @Prop()
  firstMeaningfulActivityAt?: Date;

  @Prop({ trim: true })
  notes?: string;
}

export const BetaEnrollmentSchema =
  SchemaFactory.createForClass(BetaEnrollment);

BetaEnrollmentSchema.index({ businessId: 1 }, { unique: true });
BetaEnrollmentSchema.index({ status: 1 });
BetaEnrollmentSchema.index({ cohort: 1 });
