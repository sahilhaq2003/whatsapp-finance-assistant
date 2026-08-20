import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = { userId: string; sessionId: string } | null>(
    err: Error | null,
    user: TUser,
  ): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
