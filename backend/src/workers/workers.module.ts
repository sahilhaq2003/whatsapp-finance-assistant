import { Module, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { QueueModule } from '../modules/queue/queue.module';
import { RemindersModule } from '../modules/reminders/reminders.module';

@Module({
  imports: [QueueModule, RemindersModule],
  providers: [],
  exports: [],
})
export class WorkersModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkersModule.name);

  constructor() {}

  async onModuleInit(): Promise<void> {
    this.logger.log('WorkersModule initializing - background jobs via NestJS scheduler');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('WorkersModule destroyed');
  }
}
