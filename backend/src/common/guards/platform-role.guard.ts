import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlatformRole } from '../enums/platform-role.enum.js';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator.js';

@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.platformRole) {
      throw new ForbiddenException('Insufficient platform permissions');
    }

    const hasRole = requiredRoles.includes(user.platformRole);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient platform permissions');
    }

    return true;
  }
}
