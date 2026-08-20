import { getCookieOptions } from '../utils/auth-cookie.util';
import { ConfigService } from '@nestjs/config';

export function getTokenCookies(
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
  accessExpiry: Date,
  refreshExpiry: Date,
) {
  const isSecure = configService.get<string>('COOKIE_SECURE') === 'true';

  return [
    {
      name: 'dp_access_token',
      value: accessToken,
      options: getCookieOptions(accessExpiry, isSecure),
    },
    {
      name: 'dp_refresh_token',
      value: refreshToken,
      options: getCookieOptions(refreshExpiry, isSecure),
    },
  ];
}

export function getClearCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
  };
}
