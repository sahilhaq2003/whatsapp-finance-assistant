import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BusinessRole } from '../../../common/enums/business-role.enum';

export type BusinessMemberDocument = HydratedDocument<BusinessMember>;

@Schema({
  timestamps: true,
  collection: 'business_members',
})
export class BusinessMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: String, enum: BusinessRole, default: BusinessRole.MEMBER })
  role: BusinessRole;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

export const BusinessMemberSchema =
  SchemaFactory.createForClass(BusinessMember);

BusinessMemberSchema.index({ userId: 1, businessId: 1 }, { unique: true });
BusinessMemberSchema.index({ businessId: 1 });
BusinessMemberSchema.index({ userId: 1 });
BusinessMemberSchema.index({ role: 1 });
