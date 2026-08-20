import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from './schemas/audit-log.schema';

export interface CreateAuditEntry {
  businessId: string;
  userId: string;
  entityType: string;
  entityId?: string;
  action: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: CreateAuditEntry): Promise<AuditLogDocument> {
    const doc = new this.auditLogModel({
      businessId: new Types.ObjectId(entry.businessId),
      userId: new Types.ObjectId(entry.userId),
      entityType: entry.entityType,
      entityId: entry.entityId
        ? new Types.ObjectId(entry.entityId)
        : undefined,
      action: entry.action,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
    });

    return doc.save();
  }
}
