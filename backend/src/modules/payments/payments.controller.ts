import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Body() dto: CreatePaymentDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.paymentsService.create(
      business.businessId,
      user.userId,
      dto,
    );
    return {
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: PaymentQueryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.paymentsService.findAll(
      business.businessId,
      query,
    );
    return { success: true, data: result };
  }

  @Post(':id/void')
  async void(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const payment = await this.paymentsService.void(
      business.businessId,
      user.userId,
      id,
      dto.reason,
    );
    return {
      success: true,
      message: 'Payment voided successfully',
      data: payment,
    };
  }
}
