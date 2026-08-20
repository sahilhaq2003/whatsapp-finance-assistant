import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  check() {
    return {
      success: true,
      message: 'Salligo API is running',
      timestamp: new Date().toISOString(),
    };
  }

  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const mongoReady = this.mongoConnection.readyState === 1;

    return {
      status: mongoReady ? 'ok' : 'degraded',
      services: {
        api: { status: 'ok' },
        mongodb: {
          status: mongoReady ? 'ok' : 'unavailable',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
