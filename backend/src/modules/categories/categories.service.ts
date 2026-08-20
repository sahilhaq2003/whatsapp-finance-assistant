import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryType } from '../../common/enums/category-type.enum';
import { AuditService } from '../audit/audit.service';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Delivery',
  'Transport',
  'Rent',
  'Utilities',
  'Marketing',
  'Supplies',
  'Other Expense',
];

const DEFAULT_INCOME_CATEGORIES = ['Sales', 'Services', 'Other Income'];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    private readonly auditService: AuditService,
  ) {}

  async ensureDefaultCategories(
    businessId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.categoryModel.find({
      businessId: new Types.ObjectId(businessId),
      isActive: true,
    });

    if (existing.length > 0) return;

    const docs: Partial<Category>[] = [];

    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      docs.push({
        businessId: new Types.ObjectId(businessId),
        name,
        type: CategoryType.EXPENSE,
        isSystem: true,
        isActive: true,
        createdByUserId: new Types.ObjectId(userId),
      });
    }

    for (const name of DEFAULT_INCOME_CATEGORIES) {
      docs.push({
        businessId: new Types.ObjectId(businessId),
        name,
        type: CategoryType.INCOME,
        isSystem: true,
        isActive: true,
        createdByUserId: new Types.ObjectId(userId),
      });
    }

    await this.categoryModel.insertMany(docs);
  }

  async findAll(
    businessId: string,
    type?: CategoryType,
  ): Promise<CategoryDocument[]> {
    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      isActive: true,
    };
    if (type) {
      query.type = type;
    }
    return this.categoryModel.find(query).sort({ type: 1, name: 1 }).exec();
  }

  async findOne(businessId: string, categoryId: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      businessId: new Types.ObjectId(businessId),
    });

    if (!category) {
      throw new NotFoundException('Category not found in this business');
    }

    return category;
  }

  async create(
    businessId: string,
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    const normalizedName = dto.name.toLowerCase().trim();

    const existing = await this.categoryModel.findOne({
      businessId: new Types.ObjectId(businessId),
      name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      type: dto.type,
      isActive: true,
    });

    if (existing) {
      throw new ConflictException(
        `A ${dto.type} category with this name already exists`,
      );
    }

    const category = new this.categoryModel({
      businessId: new Types.ObjectId(businessId),
      name: dto.name.trim(),
      type: dto.type,
      isSystem: false,
      isActive: true,
      createdByUserId: new Types.ObjectId(userId),
    });

    const saved = await category.save();

    await this.auditService.log({
      businessId,
      userId,
      entityType: 'Category',
      entityId: (saved._id as Types.ObjectId).toString(),
      action: 'CATEGORY_CREATED',
      newValues: { name: saved.name, type: saved.type },
    });

    return saved;
  }

  async update(
    businessId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    const category = await this.findOne(businessId, categoryId);
    const oldName = category.name;

    if (dto.name && dto.name !== category.name) {
      const normalizedName = dto.name.toLowerCase().trim();
      const existing = await this.categoryModel.findOne({
        businessId: new Types.ObjectId(businessId),
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        type: category.type,
        isActive: true,
        _id: { $ne: category._id },
      });

      if (existing) {
        throw new ConflictException(
          `A ${category.type} category with this name already exists`,
        );
      }
    }

    category.name = dto.name?.trim() ?? category.name;
    const updated = await category.save();

    await this.auditService.log({
      businessId,
      userId: category.createdByUserId.toString(),
      entityType: 'Category',
      entityId: category._id.toString(),
      action: 'CATEGORY_UPDATED',
      oldValues: { name: oldName },
      newValues: { name: updated.name },
    });

    return updated;
  }

  async deactivate(
    businessId: string,
    categoryId: string,
  ): Promise<{ message: string }> {
    const category = await this.findOne(businessId, categoryId);
    category.isActive = false;
    await category.save();

    await this.auditService.log({
      businessId,
      userId: category.createdByUserId.toString(),
      entityType: 'Category',
      entityId: category._id.toString(),
      action: 'CATEGORY_DEACTIVATED',
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return { message: `Category "${category.name}" has been deactivated` };
  }
}
