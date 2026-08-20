import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { QueueHealthService } from './services/queue-health.service';

@Global()
@Module({
  providers: [QueueHealthService],
  exports: [QueueHealthService],
})
export class QueueModule implements OnModuleInit {
  private readonly logger = new Logger(QueueModule.name);
  private redisAvailable = false;

  constructor(private readonly queueHealthService: QueueHealthService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queueHealthService.initializeConnection();
      this.redisAvailable = await this.queueHealthService.checkRedisHealth();
      if (this.redisAvailable) {
        this.logger.log('Redis connection established successfully');
      } else {
        this.logger.warn('Redis not available - background jobs will not run');
      }
    } catch (error) {
      this.logger.warn(`Failed to connect to Redis: ${error}. Background jobs disabled.`);
      this.redisAvailable = false;
    }
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }
}
