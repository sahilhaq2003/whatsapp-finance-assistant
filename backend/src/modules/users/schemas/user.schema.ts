import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { PlatformRole } from '../../../common/enums/platform-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ required: true, trim: true, unique: true })
  phone: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ type: String, default: 'en' })
  preferredLanguage: string;

  @Prop({ type: String, default: 'Asia/Colombo' })
  timezone: string;

  @Prop({ type: Boolean, default: false })
  isEmailVerified: boolean;

  @Prop({ type: Boolean, default: false })
  isPhoneVerified: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: String, enum: PlatformRole, default: PlatformRole.USER })
  platformRole: PlatformRole;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ status: 1 });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
