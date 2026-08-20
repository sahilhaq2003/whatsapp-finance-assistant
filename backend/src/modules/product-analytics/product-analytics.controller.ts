import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformRoleGuard } from '../../common/guards/platform-role.guard';
import { PlatformRoles } from '../../common/decorators/platform-roles.decorator';
import { PlatformRole } from '../../common/enums/platform-role.enum';
import { ProductMetricsService } from './services/product-metrics.service';
import { BetaMetricsResponse } from './interfaces/metrics.interface';

@Controller('product-analytics')
export class ProductAnalyticsController {
  constructor(private readonly productMetricsService: ProductMetricsService) {}

  @Get('beta-metrics')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
  async getBetaMetrics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cohort') cohort?: string,
  ): Promise<{ success: boolean; data: BetaMetricsResponse }> {
    const data = await this.productMetricsService.getBetaMetrics(
      dateFrom,
      dateTo,
      cohort,
    );
    return { success: true, data };
  }
}
