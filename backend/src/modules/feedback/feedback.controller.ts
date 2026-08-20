import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { PlatformRoleGuard } from '../../common/guards/platform-role.guard';
import { PlatformRoles } from '../../common/decorators/platform-roles.decorator';
import { PlatformRole } from '../../common/enums/platform-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import type {
  AuthenticatedUser,
  BusinessContext,
} from '../auth/interfaces/authenticated-request.interface';
import { FeedbackService } from './services/feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { FeedbackType } from './enums/feedback-type.enum';
import { FeedbackStatus } from './enums/feedback-status.enum';

@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('feedback')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: CreateFeedbackDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const feedback = await this.feedbackService.createFeedback(
      user.userId,
      business.businessId,
      dto,
    );

    return {
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    };
  }

  @Get('ops/feedback')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
  async list(
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.feedbackService.getFeedback({
      type,
      status,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return { success: true, data: result };
  }

  @Get('ops/feedback/stats')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
  async stats() {
    const data = await this.feedbackService.getFeedbackStats();
    return { success: true, data };
  }

  @Patch('ops/feedback/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    const feedback = await this.feedbackService.updateFeedbackStatus(
      id,
      dto.status,
    );

    if (!feedback) {
      return { success: false, message: 'Feedback not found' };
    }

    return {
      success: true,
      message: 'Feedback status updated',
      data: feedback,
    };
  }
}
