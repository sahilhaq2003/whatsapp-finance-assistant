import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import type { AuthenticatedUser, BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { TransactionType } from '../../common/enums/transaction-type.enum';

@Controller('transactions')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: CreateTransactionDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const transaction = await this.transactionsService.create(
      business.businessId,
      user.userId,
      dto,
    );

    return {
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Query() query: TransactionQueryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.transactionsService.findAll(
      business.businessId,
      query,
    );

    return {
      success: true,
      message: 'Transactions retrieved successfully',
      data: result,
    };
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const summary = await this.transactionsService.getSummary(
      business.businessId,
      dateFrom,
      dateTo,
    );

    return {
      success: true,
      message: 'Transaction summary retrieved successfully',
      data: summary,
    };
  }

  @Get('summary/categories')
  async getCategorySummary(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Query('type') type?: TransactionType,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const summary = await this.transactionsService.getCategorySummary(
      business.businessId,
      type,
      dateFrom,
      dateTo,
    );

    return {
      success: true,
      message: 'Category summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const transaction = await this.transactionsService.findOne(
      business.businessId,
      id,
    );

    return {
      success: true,
      message: 'Transaction retrieved successfully',
      data: transaction,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const transaction = await this.transactionsService.update(
      business.businessId,
      id,
      dto,
    );

    return {
      success: true,
      message: 'Transaction updated successfully',
      data: transaction,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async void(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Body() dto: VoidTransactionDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    await this.transactionsService.void(
      business.businessId,
      id,
      user.userId,
      dto,
    );

    return {
      success: true,
      message: 'Transaction voided successfully',
    };
  }
}
