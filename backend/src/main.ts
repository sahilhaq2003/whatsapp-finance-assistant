import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import type { Server } from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { getCorsOptions } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const trustProxy = configService.get<string>('TRUST_PROXY', 'false');

  if (trustProxy === 'true' || nodeEnv === 'production') {
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));

  app.setGlobalPrefix('api');

  app.enableCors(getCorsOptions(frontendUrl || ''));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableShutdownHooks();

  const server = (await app.listen(port ?? 5000)) as Server;
  Logger.log(
    `Salligo API running on http://localhost:${port ?? 5000}/api [${nodeEnv}]`,
    'Bootstrap',
  );

  const shutdown = async (signal: string) => {
    Logger.log(`${signal} received. Starting graceful shutdown...`, 'Shutdown');
    await app.close();
    server.close(() => {
      Logger.log('Server closed cleanly.', 'Shutdown');
      process.exit(0);
    });
    setTimeout(() => {
      Logger.error(
        'Graceful shutdown timed out. Forcing exit.',
        '',
        'Shutdown',
      );
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

bootstrap().catch((err: unknown) => {
  Logger.error(
    'Failed to start application',
    err instanceof Error ? err.stack : String(err),
    'Bootstrap',
  );
  process.exit(1);
});
