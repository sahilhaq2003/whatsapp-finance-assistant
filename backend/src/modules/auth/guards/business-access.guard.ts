import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BusinessMember,
  BusinessMemberDocument,
} from '../../businesses/schemas/business-member.schema';

@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(
    @InjectModel(BusinessMember.name)
    private businessMemberModel: Model<BusinessMemberDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const businessId = request.headers['x-business-id'];

    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }

    if (!Types.ObjectId.isValid(businessId)) {
      throw new BadRequestException('Invalid business ID');
    }

    const membership = await this.businessMemberModel.findOne({
      userId: new Types.ObjectId(user.userId),
      businessId: new Types.ObjectId(businessId),
      isActive: true,
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this business',
      );
    }

    request.businessContext = {
      businessId: membership.businessId.toString(),
      role: membership.role,
    };

    return true;
  }
}
