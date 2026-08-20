import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { CategoryType } from '../../../common/enums/category-type.enum';
import { CustomerStatus } from '../../../common/enums/customer-status.enum';
import type { ParsedTransactionProposal } from '../interfaces/financial-extraction.interface';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  resolvedCategoryId: string | null;
  resolvedCustomerId: string | null;
  normalizedData: ParsedTransactionProposal;
}

@Injectable()
export class AiValidationService {
  private readonly logger = new Logger(AiValidationService.name);

  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  async validate(
    businessId: string,
    parsedData: Partial<ParsedTransactionProposal>,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    let resolvedCategoryId: string | null = null;
    let resolvedCustomerId: string | null = null;

    if (!parsedData.type || !['income', 'expense'].includes(parsedData.type)) {
      errors.push('Invalid transaction type');
    }

    if (parsedData.amount == null || parsedData.amount <= 0 || !Number.isFinite(parsedData.amount)) {
      errors.push('Amount must be a positive number');
    }

    const parsedDate = parsedData.date ? new Date(parsedData.date) : null;
    if (parsedData.date && parsedDate && isNaN(parsedDate.getTime())) {
      errors.push('Invalid date');
    }

    if (parsedData.paymentMethod && !['cash', 'bank_transfer', 'card', 'mobile_payment', 'other'].includes(parsedData.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    if (parsedData.type && parsedData.category) {
      const categoryType = parsedData.type === 'expense' ? CategoryType.EXPENSE : CategoryType.INCOME;
      const matched = await this.categoryModel.findOne({
        businessId: new Types.ObjectId(businessId),
        name: { $regex: new RegExp(`^${this.escapeRegex(parsedData.category)}$`, 'i') },
        type: categoryType,
        isActive: true,
      });

      if (matched) {
        resolvedCategoryId = matched._id.toString();
      } else {
        const fallback = await this.categoryModel.findOne({
          businessId: new Types.ObjectId(businessId),
          name: { $regex: new RegExp(`^other ${parsedData.type}$`, 'i') },
          isActive: true,
        });

        if (fallback) {
          resolvedCategoryId = fallback._id.toString();
        } else {
          errors.push(`Category "${parsedData.category}" not found for ${parsedData.type}`);
        }
      }
    } else if (!parsedData.category) {
      errors.push('Category is required');
    }

    if (parsedData.customer) {
      const matchedCustomers = await this.customerModel.find({
        businessId: new Types.ObjectId(businessId),
        name: { $regex: new RegExp(this.escapeRegex(parsedData.customer), 'i') },
        status: CustomerStatus.ACTIVE,
      });

      if (matchedCustomers.length === 1) {
        resolvedCustomerId = matchedCustomers[0]._id.toString();
      } else if (matchedCustomers.length > 1) {
        this.logger.log(
          `Ambiguous customer "${parsedData.customer}": ${matchedCustomers.map((c) => c.name).join(', ')}`,
        );
        // Don't resolve - let proposal handle clarification
      }
    }

    const normalizedData: ParsedTransactionProposal = {
      ...parsedData,
      categoryId: resolvedCategoryId,
      customerId: resolvedCustomerId,
    } as ParsedTransactionProposal;

    return {
      isValid: errors.length === 0,
      errors,
      resolvedCategoryId,
      resolvedCustomerId,
      normalizedData,
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
