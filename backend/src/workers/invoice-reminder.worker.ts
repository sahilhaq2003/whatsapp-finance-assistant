import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import databaseConfig from '../config/database.config';
import { validate } from '../config/env.validation';
import { RemindersModule } from '../modules/reminders/reminders.module';
import { RemindersService } from '../modules/reminders/services/reminders.service';
import { ReminderSchedulerService } from '../modules/reminders/services/reminder-scheduler.service';
import { ReminderDeliveryService } from '../modules/reminders/services/reminder-delivery.service';

let remindersService: RemindersService | null = null;

async function getApp() {
  const app = await NestFactory.createApplicationContext(
    {
      module: RemindersModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
          validate,
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get<string>('MONGODB_URI'),
            serverSelectionTimeoutMS: 5000,
          }),
          inject: [ConfigService],
        }),
        RemindersModule,
      ],
    },
    { logger: ['error', 'warn', 'log'] },
  );

  remindersService = app.get(RemindersService);
  return app;
}

export async function reminderProcessor(job: Job) {
  const logger = new Logger('ReminderWorker');

  try {
    if (!remindersService) {
      await getApp();
    }

    if (!remindersService) {
      throw new Error('Failed to initialize reminders service');
    }

    await remindersService.processScheduledReminders();

    logger.log(`Reminder job ${job.id} completed`);
  } catch (error) {
    logger.error(`Reminder job ${job.id} failed: ${error}`);
    throw error;
  }
}

export async function checkDueInvoicesProcessor(job: Job) {
  const logger = new Logger('ReminderWorker');

  try {
    if (!remindersService) {
      await getApp();
    }

    if (!remindersService) {
      throw new Error('Failed to initialize reminders service');
    }

    const result = await remindersService.scanDueInvoices();
    logger.log(`Check due invoices job ${job.id} completed: ${JSON.stringify(result)}`);
  } catch (error) {
    logger.error(`Check due invoices job ${job.id} failed: ${error}`);
    throw error;
  }
}
