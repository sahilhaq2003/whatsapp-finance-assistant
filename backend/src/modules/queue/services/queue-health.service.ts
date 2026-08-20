import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  DEFAULT_QUEUE_CONNECTION,
} from '../queue.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Redis = require('ioredis');

@Injectable()
export class QueueHealthService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueHealthService.name);
  private redisConnection: any = null;

  async onModuleDestroy(): Promise<void> {
    if (this.redisConnection) {
      await this.redisConnection.quit().catch(() => {});
    }
  }

  async checkRedisHealth(): Promise<boolean> {
    let client: any;
    try {
      client = new Redis({ ...DEFAULT_QUEUE_CONNECTION, connectTimeout: 3000, maxRetriesPerRequest: 0 });
      client.on('error', () => {});
      const result = await client.ping();
      await client.quit();
      return result === 'PONG';
    } catch (error) {
      this.logger.warn(`Redis health check failed: ${error}`);
      return false;
    } finally {
      if (client) {
        client.disconnect();
      }
    }
  }

  getRedisConnection(): any {
    if (!this.redisConnection) {
      throw new Error('Redis connection not initialized. Call initializeConnection first.');
    }
    return this.redisConnection;
  }

  async initializeConnection(): Promise<void> {
    this.redisConnection = new Redis({ ...DEFAULT_QUEUE_CONNECTION, connectTimeout: 5000, maxRetriesPerRequest: 0, enableOfflineQueue: false });
    this.redisConnection.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
    this.redisConnection.on('ready', () => {
      this.logger.log('Redis connection ready');
    });
    this.redisConnection.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }
}
