import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { BetaService } from './services/beta.service';
import type { CreateBetaInviteDto } from './dto/create-beta-invite.dto';
import type { UpdateBetaEnrollmentDto } from './dto/update-beta-enrollment.dto';

@Controller('beta')
export class BetaController {
  constructor(private readonly betaService: BetaService) {}

  @Post('invites')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async createInvite(
    @Body() dto: CreateBetaInviteDto,
    @Req() req: { user: { userId: string } },
  ) {
    const { invite, plaintextCode } = await this.betaService.createInvite(
      dto,
      req.user.userId,
    );

    return {
      success: true,
      data: {
        invite: {
          _id: invite._id,
          email: invite.email,
          status: invite.status,
          expiresAt: invite.expiresAt,
          maxUses: invite.maxUses,
          usedCount: invite.usedCount,
          cohort: invite.cohort,
          notes: invite.notes,
        },
        plaintextCode,
      },
    };
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async getInvites() {
    const invites = await this.betaService.getInvites();
    return { success: true, data: invites };
  }

  @Patch('invites/:id/revoke')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async revokeInvite(@Param('id') id: string) {
    const invite = await this.betaService.revokeInvite(id);
    return { success: true, data: invite };
  }

  @Post('enrollments')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async createEnrollment(
    @Body()
    body: {
      businessId: string;
      userId: string;
      inviteId?: string;
      cohort?: string;
    },
    @Req()
    req: { user: { userId: string }; businessContext: { businessId: string } },
  ) {
    const businessId = body.businessId || req.businessContext.businessId;
    const userId = body.userId || req.user.userId;

    const enrollment = await this.betaService.createEnrollment(
      businessId,
      userId,
      body.inviteId,
      body.cohort,
    );

    return { success: true, data: enrollment };
  }

  @Get('enrollments')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async listEnrollments(@Query('cohort') cohort?: string) {
    const enrollments = await this.betaService.listEnrollments(cohort);
    return { success: true, data: enrollments };
  }

  @Get('enrollments/:businessId')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async getEnrollment(@Param('businessId') businessId: string) {
    const enrollment = await this.betaService.getEnrollment(businessId);
    return { success: true, data: enrollment };
  }

  @Patch('enrollments/:businessId')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async updateEnrollment(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBetaEnrollmentDto,
  ) {
    const enrollment = await this.betaService.updateEnrollment(businessId, dto);
    return { success: true, data: enrollment };
  }

  @Post('check')
  @UseGuards(JwtAuthGuard)
  async checkBetaAccess(@Req() req: { user: { userId: string } }) {
    const result = await this.betaService.checkBetaAccess(req.user.userId);
    return { success: true, data: result };
  }
}
