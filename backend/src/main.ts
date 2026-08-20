import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { getCorsOptions } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const trustProxy = configService.get<string>('TRUST_PROXY', 'false');

  if (trustProxy === 'true' || nodeEnv === 'production') {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);
  }

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cookieParser());

  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));

  const rawBodyBuffer = express.raw({
    type: 'application/json',
    limit: '1mb',
    verify: (
      req: express.Request & { rawBody?: Buffer },
      _res,
      buf: Buffer,
    ) => {
      req.rawBody = buf;
    },
  });

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (
      req.path === '/api/whatsapp/webhook' &&
      req.method === 'POST'
    ) {
      rawBodyBuffer(req, res, (err?: express.Errback) => {
        if (err) return next(err);
        next();
      });
    } else {
      next();
    }
  });

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

  const server = await app.listen(port ?? 5000);
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
      Logger.error('Graceful shutdown timed out. Forcing exit.', '', 'Shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  Logger.error('Failed to start application', err.stack, 'Bootstrap');
  process.exit(1);
});
