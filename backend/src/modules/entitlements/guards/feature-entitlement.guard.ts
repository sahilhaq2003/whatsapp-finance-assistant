import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementsService } from '../services/entitlements.service';
import { REQUIRES_FEATURE_KEY } from '../decorators/requires-feature.decorator';
import { FeatureKey } from '../enums/feature-key.enum';

@Injectable()
export class FeatureEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<FeatureKey>(
      REQUIRES_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const businessId = request.headers['x-business-id'];

    if (!businessId) {
      throw new ForbiddenException('Business ID is required');
    }

    const isEnabled = await this.entitlementsService.isFeatureEnabled(
      businessId,
      requiredFeature,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        'This feature is not available on your current plan',
      );
    }

    return true;
  }
}
