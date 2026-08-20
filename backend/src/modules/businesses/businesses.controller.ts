import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateBusinessDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { business, membership } =
      await this.businessesService.createBusinessForOwner(
        user.userId,
        dto,
      );

    return {
      success: true,
      message: 'Business created successfully',
      data: {
        business,
        membership: {
          userId: membership.userId,
          businessId: membership.businessId,
          role: membership.role,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
        },
      },
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyBusinesses(@CurrentUser() user: AuthenticatedUser) {
    const businesses = await this.businessesService.findUserBusinesses(
      user.userId,
    );
    return {
      success: true,
      message: 'Businesses retrieved successfully',
      data: businesses,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async findOne(@Param('id') id: string) {
    const business = await this.businessesService.findBusinessById(id);
    return {
      success: true,
      message: 'Business retrieved successfully',
      data: business,
    };
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async findMembers(@Param('id') id: string) {
    const members = await this.businessesService.findBusinessMembers(id);
    return {
      success: true,
      message: 'Business members retrieved successfully',
      data: members,
    };
  }
}
