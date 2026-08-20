import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  AuthSession,
  AuthSessionDocument,
} from '../schemas/auth-session.schema';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserStatus } from '../../../common/enums/user-status.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuthSession.name)
    private authSessionModel: Model<AuthSessionDocument>,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          return request?.cookies?.dp_access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<{
    userId: string;
    sessionId: string;
  }> {
    const user = await this.userModel.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const session = await this.authSessionModel.findById(payload.sessionId);

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session revoked');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired');
    }

    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
    };
  }
}
