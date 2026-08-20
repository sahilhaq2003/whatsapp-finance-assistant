export interface ProductionConfig {
  trustProxy: boolean;
  rateLimitEnabled: boolean;
  rateLimitTtl: number;
  rateLimitMax: number;
  requestBodyLimit: string;
  helmetEnabled: boolean;
  cookieSecure: boolean;
  corsCredentials: boolean;
  logLevel: string;
  gracefulShutdownTimeoutMs: number;
}

export function getProductionConfig(configService: { get: (key: string, defaultValue?: any) => any }): ProductionConfig {
  const nodeEnv = configService.get('NODE_ENV', 'development');
  return {
    trustProxy: configService.get('TRUST_PROXY', nodeEnv === 'production' ? 'true' : 'false') === 'true',
    rateLimitEnabled: configService.get('THROTTLE_LIMIT', '60') !== '0',
    rateLimitTtl: parseInt(configService.get('THROTTLE_TTL', '60000'), 10),
    rateLimitMax: parseInt(configService.get('THROTTLE_LIMIT', '60'), 10),
    requestBodyLimit: configService.get('REQUEST_BODY_LIMIT', '1mb'),
    helmetEnabled: configService.get('HELMET_ENABLED', 'true') === 'true',
    cookieSecure: configService.get('COOKIE_SECURE', nodeEnv === 'production' ? 'true' : 'false') === 'true',
    corsCredentials: true,
    logLevel: configService.get('LOG_LEVEL', nodeEnv === 'production' ? 'info' : 'debug'),
    gracefulShutdownTimeoutMs: parseInt(configService.get('SHUTDOWN_TIMEOUT_MS', '10000'), 10),
  };
}
