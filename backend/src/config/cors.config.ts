import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getCorsOptions(frontendUrl: string): CorsOptions {
  const allowedOrigins = [frontendUrl].filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Business-Id',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  };
}
