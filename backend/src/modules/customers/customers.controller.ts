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
import type {
  AuthenticatedUser,
  BusinessContext,
} from '../auth/interfaces/authenticated-request.interface';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: CreateCustomerDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const customer = await this.customersService.create(
      business.businessId,
      user.userId,
      dto,
    );

    return {
      success: true,
      message: 'Customer created successfully',
      data: customer,
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Query() query: CustomerQueryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.customersService.findAll(
      business.businessId,
      query,
    );

    return {
      success: true,
      message: 'Customers retrieved successfully',
      data: result,
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

    const customer = await this.customersService.findById(
      business.businessId,
      id,
    );

    return {
      success: true,
      message: 'Customer retrieved successfully',
      data: customer,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const customer = await this.customersService.update(
      business.businessId,
      id,
      dto,
    );

    return {
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async archive(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.customersService.archive(
      business.businessId,
      id,
      user.userId,
    );

    return {
      success: true,
      message: result.message,
    };
  }

  @Patch(':id/restore')
  async restore(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const customer = await this.customersService.restore(
      business.businessId,
      id,
      user.userId,
    );

    return {
      success: true,
      message: 'Customer restored successfully',
      data: customer,
    };
  }

  @Get(':id/transactions')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.customersService.getTransactions(
      business.businessId,
      id,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        dateFrom,
        dateTo,
        type,
      },
    );

    return {
      success: true,
      message: 'Customer transactions retrieved successfully',
      data: result,
    };
  }

  @Get(':id/summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const summary = await this.customersService.getFinancialSummaryWithInvoices(
      business.businessId,
      id,
    );

    return {
      success: true,
      message: 'Customer summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id/invoices')
  async getInvoices(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.customersService.getCustomerInvoices(
      business.businessId,
      id,
      {
        status,
        paymentStatus,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    );

    return {
      success: true,
      message: 'Customer invoices retrieved successfully',
      data: result,
    };
  }

  @Get(':id/payments')
  async getPayments(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.customersService.getCustomerPayments(
      business.businessId,
      id,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    );

    return {
      success: true,
      message: 'Customer payments retrieved successfully',
      data: result,
    };
  }
}
