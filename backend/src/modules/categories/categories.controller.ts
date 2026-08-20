import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import type { AuthenticatedUser, BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryType } from '../../common/enums/category-type.enum';

@Controller('categories')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('type') type?: CategoryType,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    return this.categoriesService
      .findAll(business.businessId, type)
      .then((categories) => ({
        success: true,
        message: 'Categories retrieved successfully',
        data: categories,
      }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: CreateCategoryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const category = await this.categoriesService.create(
      business.businessId,
      user.userId,
      dto,
    );
    return {
      success: true,
      message: 'Category created successfully',
      data: category,
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
    const category = await this.categoriesService.findOne(
      business.businessId,
      id,
    );
    return {
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const category = await this.categoriesService.update(
      business.businessId,
      id,
      dto,
    );
    return {
      success: true,
      message: 'Category updated successfully',
      data: category,
    };
  }

  @Delete(':id')
  async deactivate(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.categoriesService.deactivate(
      business.businessId,
      id,
    );
    return {
      success: true,
      message: result.message,
    };
  }
}
