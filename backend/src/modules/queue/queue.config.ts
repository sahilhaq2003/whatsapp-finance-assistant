import { QueueOptions, ConnectionOptions } from 'bullmq';

export const DEFAULT_QUEUE_CONNECTION: ConnectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  connection: DEFAULT_QUEUE_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400,
      count: 200,
    },
    removeOnFail: {
      age: 604800,
      count: 100,
    },
  },
};
