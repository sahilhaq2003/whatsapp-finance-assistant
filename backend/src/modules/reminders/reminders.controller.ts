import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { RemindersService } from './services/reminders.service';
import { ReminderQueryDto } from './dto/reminder-query.dto';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@Controller('reminders')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class RemindersController {
  private readonly logger = new Logger(RemindersController.name);

  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: ReminderQueryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.remindersService.findAll(
      business.businessId,
      query,
    );
    return { success: true, data: result };
  }

  @Get('stats')
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const stats = await this.remindersService.getStats(business.businessId);
    return { success: true, data: stats };
  }

  @Get('rules')
  async getRules(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const rules = await this.remindersService.getRules(business.businessId);
    return { success: true, data: rules };
  }

  @Patch('rules/:ruleId')
  async updateRule(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateReminderRuleDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const rule = await this.remindersService.updateRule(
      business.businessId,
      ruleId,
      dto,
    );
    return { success: true, data: rule };
  }

  @Post('scan')
  async triggerScan(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.remindersService.scanDueInvoices();
    return { success: true, data: result };
  }

  @Post('invoice/:invoiceId/send')
  async sendManualReminder(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('invoiceId') invoiceId: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    try {
      const reminder = await this.remindersService.sendManualReminder(
        business.businessId,
        invoiceId,
        user.userId,
      );
      return { success: true, data: reminder };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send reminder',
      };
    }
  }

  @Post('invoice/:invoiceId/cancel')
  async cancelFutureReminders(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('invoiceId') invoiceId: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const cancelled = await this.remindersService.cancelFutureReminders(
      business.businessId,
      invoiceId,
    );
    return { success: true, data: { cancelled } };
  }

  @Get('invoice/:invoiceId')
  async getRemindersForInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('invoiceId') invoiceId: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const reminders = await this.remindersService.getRemindersForInvoice(
      business.businessId,
      invoiceId,
    );
    return { success: true, data: reminders };
  }
}
