import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check();
  }

  @Get('live')
  liveness() {
    return this.healthService.liveness();
  }

  @Get('ready')
  async readiness() {
    return this.healthService.readiness();
  }
}
