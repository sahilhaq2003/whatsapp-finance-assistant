export function getCookieOptions(
  expires: Date,
  isSecure: boolean,
): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  expires: Date;
  path: string;
} {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    expires,
    path: '/',
  };
}
