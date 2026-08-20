import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntitlementsService } from './services/entitlements.service';
import { CreatePlanDefinitionDto } from './dto/create-plan-definition.dto';

@Controller('entitlements')
@UseGuards(JwtAuthGuard)
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get()
  async getEntitlements(@Req() req: any) {
    const businessId = req.headers['x-business-id'];
    const entitlements =
      await this.entitlementsService.getEffectiveEntitlements(businessId);
    return { success: true, data: entitlements };
  }

  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDefinitionDto) {
    return this.entitlementsService.createPlanDefinition(dto);
  }

  @Get('plans')
  async listPlans() {
    return this.entitlementsService.listPlans();
  }
}
