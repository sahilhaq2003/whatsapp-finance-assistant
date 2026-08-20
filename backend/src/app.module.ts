import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import databaseConfig from './config/database.config';
import { validate } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuditModule } from './modules/audit/audit.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FilesModule } from './modules/files/files.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiModule } from './modules/ai/ai.module';
import { QueueModule } from './modules/queue/queue.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WorkersModule } from './workers/workers.module';
import { BetaModule } from './modules/beta/beta.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { UsageModule } from './modules/usage/usage.module';
import { ProductAnalyticsModule } from './modules/product-analytics/product-analytics.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { DataRequestsModule } from './modules/data-requests/data-requests.module';
import { OpsModule } from './modules/ops/ops.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60000),
            limit: configService.get<number>('THROTTLE_LIMIT', 60),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('[Database] MongoDB connected successfully');
            });
            connection.on('error', (error: Error) => {
              console.error('[Database] MongoDB connection error:', error.message);
            });
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    HealthModule,
    UsersModule,
    BusinessesModule,
    AuthModule,
    AuditModule,
    CategoriesModule,
    TransactionsModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    FilesModule,
    WhatsappModule,
    AiModule,
    QueueModule,
    RemindersModule,
    SummariesModule,
    ReportsModule,
    WorkersModule,
    BetaModule,
    EntitlementsModule,
    UsageModule,
    ProductAnalyticsModule,
    FeedbackModule,
    DataRequestsModule,
    OpsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
