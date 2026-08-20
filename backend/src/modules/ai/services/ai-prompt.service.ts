import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { CategoryType } from '../../../common/enums/category-type.enum';
import type { AiExtractionContext } from '../interfaces/ai-extraction-context.interface';

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);

  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
  ) {}

  async buildExtractionContext(
    businessId: string,
    userId: string,
    messageEventId: string,
    senderPhone: string,
    originalText: string,
  ): Promise<AiExtractionContext> {
    const business = await this.businessModel.findById(businessId);
    if (!business) {
      throw new Error('Business not found for AI context');
    }

    const categories = await this.categoryModel.find({
      businessId: business._id,
      isActive: true,
    });

    const expenseCategories = categories
      .filter((c) => c.type === CategoryType.EXPENSE)
      .map((c) => ({ _id: c._id.toString(), name: c.name }));

    const incomeCategories = categories
      .filter((c) => c.type === CategoryType.INCOME)
      .map((c) => ({ _id: c._id.toString(), name: c.name }));

    const now = new Date();
    const tz = business.timezone || 'Asia/Colombo';
    const currentLocalDate = this.getLocalDate(now, tz);

    return {
      businessId,
      userId,
      messageEventId,
      senderPhone,
      originalText,
      businessTimezone: tz,
      businessCurrency: business.baseCurrency || 'LKR',
      currentLocalDate,
      expenseCategories,
      incomeCategories,
    };
  }

  formatProposalConfirmation(parsed: {
    type?: string;
    amount?: number;
    currency?: string;
    category?: string;
    date?: string;
    description?: string;
    customer?: string;
  }): string {
    const lines: string[] = [];

    if (parsed.type) {
      lines.push(parsed.type === 'expense' ? 'Expense' : 'Income');
    }
    if (parsed.amount != null && parsed.currency) {
      lines.push(`${parsed.currency} ${parsed.amount.toLocaleString()}`);
    } else if (parsed.amount != null) {
      lines.push(`LKR ${parsed.amount.toLocaleString()}`);
    }
    if (parsed.category) {
      lines.push(parsed.category);
    }
    if (parsed.date) {
      lines.push(this.formatDisplayDate(parsed.date));
    }
    if (parsed.description) {
      lines.push(parsed.description);
    }
    if (parsed.customer) {
      lines.push(`Customer: ${parsed.customer}`);
    }

    return lines.join('\n');
  }

  private getLocalDate(date: Date, timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
    } catch {
      return new Intl.DateTimeFormat('en-CA').format(date);
    }
  }

  private formatDisplayDate(dateStr: string): string {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}
