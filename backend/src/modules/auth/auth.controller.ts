import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-request.interface';
import { getCookieOptions } from './utils/auth-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isSecure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const accessExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    res.cookie(
      'dp_access_token',
      accessToken,
      getCookieOptions(accessExpiry, isSecure),
    );
    res.cookie(
      'dp_refresh_token',
      refreshToken,
      getCookieOptions(refreshExpiry, isSecure),
    );
  }

  private clearTokenCookies(res: Response) {
    const isSecure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const clearOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('dp_access_token', clearOptions);
    res.clearCookie('dp_refresh_token', clearOptions);
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      message: 'Registration successful',
      data: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      message: 'Login successful',
      data: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.dp_refresh_token;

    const result = await this.authService.refresh(refreshToken);

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!user) throw new UnauthorizedException();
    await this.authService.logout(user.sessionId);

    this.clearTokenCookies(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!user) throw new UnauthorizedException();
    await this.authService.logoutAll(user.userId);

    this.clearTokenCookies(res);

    return {
      success: true,
      message: 'Logged out from all devices',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser | null) {
    if (!user) throw new UnauthorizedException();
    const result = await this.authService.getCurrentUser(user.userId);

    return {
      success: true,
      message: 'Current user retrieved successfully',
      data: result,
    };
  }
}
