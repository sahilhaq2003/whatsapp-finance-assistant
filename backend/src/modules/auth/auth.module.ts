import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  AuthSession,
  AuthSessionSchema,
} from './schemas/auth-session.schema';
import {
  BusinessMember,
  BusinessMemberSchema,
} from '../businesses/schemas/business-member.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: BusinessMember.name, schema: BusinessMemberSchema },
    ]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, MongooseModule],
})
export class AuthModule {}
