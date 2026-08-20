import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SummaryPreference, SummaryPreferenceDocument } from '../schemas/summary-preference.schema';
import { UpdateSummaryPreferencesDto } from '../dto/update-summary-preferences.dto';

@Injectable()
export class SummaryPreferencesService {
  private readonly logger = new Logger(SummaryPreferencesService.name);

  constructor(
    @InjectModel(SummaryPreference.name)
    private prefModel: Model<SummaryPreferenceDocument>,
  ) {}

  async getOrCreate(businessId: string): Promise<SummaryPreferenceDocument> {
    let pref = await this.prefModel.findOne({
      businessId: new Types.ObjectId(businessId),
    });
    if (!pref) {
      pref = await this.prefModel.create({
        businessId: new Types.ObjectId(businessId),
        dailyEnabled: false,
        weeklyEnabled: false,
        timezone: 'Asia/Colombo',
        channel: 'whatsapp',
        includeIncome: true,
        includeExpenses: true,
        includeNetCashFlow: true,
        includeTransactionCount: true,
        includeOutstandingInvoices: true,
        includeTopCategories: false,
        includeOverdueInvoices: true,
      } as any);
    }
    return pref;
  }

  async getPreferences(businessId: string): Promise<SummaryPreferenceDocument> {
    return this.getOrCreate(businessId);
  }

  async updatePreferences(
    businessId: string,
    dto: UpdateSummaryPreferencesDto,
    userId: string,
  ): Promise<SummaryPreferenceDocument> {
    const pref = await this.getOrCreate(businessId);

    const updateData: Record<string, unknown> = { ...dto };
    updateData.updatedByUserId = new Types.ObjectId(userId);

    const updated = await this.prefModel.findOneAndUpdate(
      { businessId: new Types.ObjectId(businessId) },
      { $set: updateData },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Preferences not found');
    }
    return updated;
  }

  async getEnabledBusinesses(frequency: 'daily' | 'weekly'): Promise<SummaryPreferenceDocument[]> {
    const filter: Record<string, unknown> = {};
    if (frequency === 'daily') {
      filter.dailyEnabled = true;
    } else {
      filter.weeklyEnabled = true;
    }
    return this.prefModel.find(filter);
  }
}
