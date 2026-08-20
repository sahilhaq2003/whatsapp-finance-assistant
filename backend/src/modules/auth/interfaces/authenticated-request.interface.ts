import { Request } from 'express';
import { Types } from 'mongoose';
import { BusinessRole } from '../../../common/enums/business-role.enum';

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}

export interface BusinessContext {
  businessId: string;
  role: BusinessRole;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  businessContext?: BusinessContext;
}
