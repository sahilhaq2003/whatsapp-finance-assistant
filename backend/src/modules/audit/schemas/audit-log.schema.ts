import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: Object })
  oldValues?: Record<string, unknown>;

  @Prop({ type: Object })
  newValues?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ businessId: 1, createdAt: -1 });
AuditLogSchema.index({ businessId: 1, entityType: 1, entityId: 1 });
