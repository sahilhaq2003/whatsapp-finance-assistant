import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import { AuthenticatedUser, BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { SummariesService } from './summaries.service';
import { SummaryPreferencesService } from './services/summary-preferences.service';
import { SummarySchedulerService } from './services/summary-scheduler.service';
import { SummaryDeliveryService } from './services/summary-delivery.service';
import { UpdateSummaryPreferencesDto } from './dto/update-summary-preferences.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { SummaryFrequency } from './enums/summary-frequency.enum';

@Controller('summaries')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class SummariesController {
  private readonly logger = new Logger(SummariesController.name);

  constructor(
    private readonly summariesService: SummariesService,
    private readonly preferencesService: SummaryPreferencesService,
    private readonly schedulerService: SummarySchedulerService,
    private readonly deliveryService: SummaryDeliveryService,
  ) {}

  @Get('preferences')
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const prefs = await this.preferencesService.getPreferences(business.businessId);
    return { success: true, data: prefs };
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Body() dto: UpdateSummaryPreferencesDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const prefs = await this.preferencesService.updatePreferences(
      business.businessId, dto, user.userId,
    );
    return { success: true, data: prefs };
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: SummaryQueryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.summariesService.findAll(business.businessId, query);
    return { success: true, data: result };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const summary = await this.summariesService.findById(business.businessId, id);
    return { success: true, data: summary };
  }

  @Post('preview')
  async preview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Body('frequency') frequency: SummaryFrequency,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.schedulerService.generatePreview(
      business.businessId, frequency || SummaryFrequency.DAILY,
    );
    return { success: true, data: result };
  }

  @Post('generate')
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Body('frequency') frequency: SummaryFrequency,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.summariesService.generateManual(
      business.businessId, frequency || SummaryFrequency.DAILY,
    );
    return { success: true, data: result };
  }

  @Post(':id/send')
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    try {
      await this.deliveryService.processSummary(id);
      return { success: true, message: 'Summary sent' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send summary',
      };
    }
  }
}
