import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { UsageService } from './services/usage.service';

@Controller('usage')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async getUsage(@Req() req: any) {
    const businessId = req.headers['x-business-id'];
    const counters = await this.usageService.getUsage(businessId);
    const periodKey = this.usageService.getPeriodKey();
    return { periodKey, counters };
  }
}
