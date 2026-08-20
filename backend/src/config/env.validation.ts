import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsOptional, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  MONGODB_URI: string;

  @IsString()
  FRONTEND_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsString()
  COOKIE_SECURE: string;

  @IsNumber()
  BCRYPT_SALT_ROUNDS: number;

  @IsNumber()
  THROTTLE_TTL: number;

  @IsNumber()
  THROTTLE_LIMIT: number;

  @IsString()
  FILE_STORAGE_DRIVER: string;

  @IsString()
  LOCAL_STORAGE_PATH: string;

  @IsOptional()
  @IsString()
  WHATSAPP_VERIFY_TOKEN?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_ACCESS_TOKEN?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_APP_SECRET?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_GRAPH_BASE_URL?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_API_VERSION?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_WEBHOOK_ENABLED?: string;

  @IsOptional()
  @IsString()
  AI_ENABLED?: string;

  @IsOptional()
  @IsString()
  AI_API_KEY?: string;

  @IsOptional()
  @IsString()
  AI_MODEL?: string;

  @IsOptional()
  @IsNumber()
  AI_REQUEST_TIMEOUT_MS?: number;

  @IsOptional()
  @IsNumber()
  AI_MIN_CONFIDENCE?: number;

  @IsOptional()
  @IsNumber()
  AI_PROPOSAL_EXPIRY_MINUTES?: number;

  @IsOptional()
  @IsString()
  SPEECH_ENABLED?: string;

  @IsOptional()
  @IsString()
  SPEECH_PROVIDER?: string;

  @IsOptional()
  @IsString()
  SPEECH_API_KEY?: string;

  @IsOptional()
  @IsString()
  SPEECH_MODEL?: string;

  @IsOptional()
  @IsNumber()
  SPEECH_REQUEST_TIMEOUT_MS?: number;

  @IsOptional()
  @IsNumber()
  VOICE_MAX_DURATION_SECONDS?: number;

  @IsOptional()
  @IsNumber()
  VOICE_MAX_FILE_SIZE_MB?: number;

  @IsOptional()
  @IsString()
  VOICE_TEMP_STORAGE_PATH?: string;

  @IsOptional()
  @IsString()
  VOICE_DELETE_AFTER_PROCESSING?: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsNumber()
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_TLS?: string;

  @IsOptional()
  @IsNumber()
  REMINDER_SCAN_INTERVAL_MS?: number;

  @IsOptional()
  @IsNumber()
  REMINDER_DUE_DATE_DEFAULT_DAYS?: number;

  @IsOptional()
  @IsNumber()
  REMINDER_POST_DUE_DEFAULT_DAYS?: number;

  @IsOptional()
  @IsNumber()
  REMINDER_MAX_REMINDS_PER_INVOICE?: number;

  @IsOptional()
  @IsNumber()
  REMINDER_MANUAL_COOLDOWN_MINUTES?: number;

  @IsOptional()
  @IsString()
  WHATSAPP_TEMPLATE_NAMESPACE?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_TEMPLATE_LANGUAGE?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_TEMPLATE_NAME_REMINDER?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_TEMPLATE_NAME_OVERDUE?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_DAILY_SUMMARY_TEMPLATE_NAME?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_WEEKLY_SUMMARY_TEMPLATE_NAME?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_SUMMARY_TEMPLATE_LANGUAGE?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
