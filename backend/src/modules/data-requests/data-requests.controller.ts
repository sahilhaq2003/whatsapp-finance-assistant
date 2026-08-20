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
import { DataRequestsService } from './services/data-requests.service';
import { CreateDataRequestDto } from './dto/create-data-request.dto';
import { DataRequestType } from './enums/data-request-type.enum';
import { DataRequestStatus } from './enums/data-request-status.enum';

@Controller()
export class DataRequestsController {
  constructor(private readonly dataRequestsService: DataRequestsService) {}

  @Post('data-requests/export')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  async createExport(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const request = await this.dataRequestsService.createExportRequest(
      user.userId,
      business.businessId,
    );

    return {
      success: true,
      message: 'Export request created successfully',
      data: request,
    };
  }

  @Post('data-requests/deletion')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDeletion(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: CreateDataRequestDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const request = await this.dataRequestsService.createDeletionRequest(
      user.userId,
      business.businessId,
      dto.confirmation || '',
    );

    return {
      success: true,
      message: 'Deletion request created. Awaiting admin review.',
      data: request,
    };
  }

  @Get('data-requests')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async listUserRequests(@CurrentUser() user: AuthenticatedUser | null) {
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const requests = await this.dataRequestsService.getUserRequests(
      user.userId,
    );
    return { success: true, data: requests };
  }

  @Get('ops/data-requests')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
  async listAll(
    @Query('type') type?: DataRequestType,
    @Query('status') status?: DataRequestStatus,
  ) {
    const requests = await this.dataRequestsService.listAllRequests(
      type,
      status,
    );
    return { success: true, data: requests };
  }

  @Patch('ops/data-requests/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.SUPPORT)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: DataRequestStatus; reviewNotes?: string },
  ) {
    const request = await this.dataRequestsService.updateRequestStatus(
      id,
      body.status,
      body.reviewNotes,
    );

    if (!request) {
      return { success: false, message: 'Request not found' };
    }

    return {
      success: true,
      message: 'Request status updated',
      data: request,
    };
  }
}
