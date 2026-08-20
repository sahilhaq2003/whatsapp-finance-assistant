import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import { validate } from './config/env.validation';
import { QueueModule } from './modules/queue/queue.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiModule } from './modules/ai/ai.module';
import { SpeechModule } from './modules/speech/speech.module';
import { FilesModule } from './modules/files/files.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validate,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    BusinessesModule,
    CategoriesModule,
    TransactionsModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    WhatsappModule,
    AiModule,
    SpeechModule,
    FilesModule,
    AuditModule,
    HealthModule,
    QueueModule,
    RemindersModule,
    SummariesModule,
  ],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  Logger.log(`Worker started [${nodeEnv}]`, 'Worker');

  const shutdown = async (signal: string) => {
    Logger.log(`${signal} received. Shutting down worker...`, 'Worker');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  Logger.error('Failed to start worker', err.stack, 'Worker');
  process.exit(1);
});
