import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { StringValue } from 'ms';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Business, BusinessDocument } from '../businesses/schemas/business.schema';
import {
  BusinessMember,
  BusinessMemberDocument,
} from '../businesses/schemas/business-member.schema';
import {
  AuthSession,
  AuthSessionDocument,
} from './schemas/auth-session.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserStatus } from '../../common/enums/user-status.enum';
import { BusinessRole } from '../../common/enums/business-role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuthSession.name)
    private authSessionModel: Model<AuthSessionDocument>,
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
    @InjectModel(BusinessMember.name)
    private businessMemberModel: Model<BusinessMemberDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async register(registerDto: RegisterDto): Promise<{
    user: Partial<UserDocument>;
    accessToken: string;
    refreshToken: string;
  }> {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email.toLowerCase(),
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const existingPhone = await this.userModel.findOne({
      phone: registerDto.phone,
    });
    if (existingPhone) {
      throw new ConflictException(
        'An account with this phone number already exists',
      );
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const businessName = registerDto.businessName.trim();
    const slug = this.toSlug(businessName);
    const existingSlug = await this.businessModel.findOne({ slug });
    if (existingSlug) {
      throw new ConflictException('A business with this name already exists');
    }

    const session = await this.userModel.db.startSession();
    session.startTransaction();

    let savedUser: UserDocument;

    try {
      const user = new this.userModel({
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email.toLowerCase(),
        phone: registerDto.phone,
        passwordHash,
        preferredLanguage: registerDto.preferredLanguage || 'en',
        timezone: registerDto.timezone || 'Asia/Colombo',
      });

      savedUser = await user.save({ session });

      const business = new this.businessModel({
        name: businessName,
        slug,
        businessType: registerDto.businessType || 'retail',
        country: 'LK',
        baseCurrency: 'LKR',
        timezone: registerDto.timezone || 'Asia/Colombo',
        defaultLanguage: registerDto.preferredLanguage || 'en',
        phone: registerDto.phone,
        email: registerDto.email.toLowerCase(),
      });
      await business.save({ session });

      const membership = new this.businessMemberModel({
        userId: savedUser._id,
        businessId: business._id,
        role: BusinessRole.OWNER,
      });
      await membership.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    const { accessToken, refreshToken } =
      await this.generateTokensAndSession(savedUser._id.toString());

    const userObj = savedUser.toObject();
    const { passwordHash: _, ...safeUser } = userObj;

    return {
      user: safeUser as Partial<UserDocument>,
      accessToken,
      refreshToken,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{
    user: Partial<UserDocument>;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userModel
      .findOne({ email: loginDto.email.toLowerCase() })
      .select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken, refreshToken } = await this.generateTokensAndSession(
      user._id.toString(),
    );

    await this.userModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
    });

    const userObj = user.toObject();
    const { passwordHash, ...safeUser } = userObj;

    return {
      user: safeUser as Partial<UserDocument>,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const tokenHash = this.hashToken(refreshToken);

    const session = await this.authSessionModel.findOne({
      tokenHash,
      revokedAt: null,
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userModel.findById(session.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.authSessionModel.findByIdAndUpdate(session._id, {
      revokedAt: new Date(),
    });

    const newTokens = await this.generateTokensAndSession(
      user._id.toString(),
    );

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.authSessionModel.findByIdAndUpdate(sessionId, {
      revokedAt: new Date(),
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authSessionModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async getCurrentUser(
    userId: string,
  ): Promise<{ user: Partial<UserDocument>; businesses: unknown[] }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...safeUser } = user.toObject();

    const BusinessMember = this.authSessionModel.db.model('BusinessMember');
    const memberships = await BusinessMember.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    }).populate('businessId', 'name slug baseCurrency status businessType');

    const businesses = memberships.map(
      (m: { businessId: unknown; role: string }) => {
        const business =
          typeof (m.businessId as { toObject?: () => Record<string, unknown> })
            .toObject === 'function'
            ? (m.businessId as { toObject: () => Record<string, unknown> })
                .toObject()
            : (m.businessId as Record<string, unknown>);

        return {
          ...business,
          _id:
            business._id && typeof business._id === 'object'
              ? business._id.toString()
              : business._id,
          role: m.role,
        };
      },
    );

    return {
      user: safeUser as Partial<UserDocument>,
      businesses,
    };
  }

  private async generateTokensAndSession(userId: string) {
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const refreshMs = this.parseDurationToMs(refreshExpiresIn);

    const session = new this.authSessionModel({
      userId: new Types.ObjectId(userId),
      expiresAt: new Date(Date.now() + refreshMs),
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    session.tokenHash = this.hashToken(refreshToken);

    const savedSession = await session.save();

    const accessPayload: JwtPayload = {
      sub: userId,
      sessionId: savedSession._id.toString(),
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as StringValue,
    });

    return {
      accessToken,
      refreshToken,
      session: savedSession,
    };
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? 24 * 60 * 60 * 1000);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
