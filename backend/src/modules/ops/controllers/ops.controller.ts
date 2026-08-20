import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator';
import { PlatformRole } from '../../../common/enums/platform-role.enum';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import { OpsService } from '../services/ops.service';

@Controller('ops')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
@PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get('dashboard')
  async getDashboard() {
    const data = await this.opsService.getOpsDashboard();
    return { success: true, data };
  }

  @Get('beta/businesses')
  async getBetaBusinessList(@Query('cohort') cohort?: string) {
    const data = await this.opsService.getBetaBusinessList(cohort);
    return { success: true, data };
  }

  @Get('beta/businesses/:businessId/health')
  async getAccountHealth(@Param('businessId') businessId: string) {
    const data = await this.opsService.getAccountHealth(businessId);
    return { success: true, data };
  }
}
