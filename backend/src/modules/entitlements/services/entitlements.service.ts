import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlanDefinition,
  PlanDefinitionDocument,
} from '../schemas/plan-definition.schema';
import { CreatePlanDefinitionDto } from '../dto/create-plan-definition.dto';
import { FeatureKey } from '../enums/feature-key.enum';

export interface EffectiveEntitlements {
  features: Record<FeatureKey, boolean>;
  limits: {
    customersPerMonth: number;
    invoicesPerMonth: number;
    aiRequestsPerMonth: number;
    voiceMinutesPerMonth: number;
    remindersPerMonth: number;
    exportsPerMonth: number;
  };
  planCode: string;
}

@Injectable()
export class EntitlementsService {
  constructor(
    @InjectModel(PlanDefinition.name)
    private readonly planModel: Model<PlanDefinitionDocument>,
  ) {}

  async getEffectiveEntitlements(
    businessId: string,
  ): Promise<EffectiveEntitlements> {
    const business = await this.getBusiness(businessId);
    const planCode = business.planCode || 'free';

    const plan = await this.planModel
      .findOne({ code: planCode.toLowerCase() })
      .lean();
    if (!plan) {
      throw new NotFoundException(`Plan '${planCode}' not found`);
    }

    const defaultFeatures: Record<FeatureKey, boolean> = {
      [FeatureKey.VOICE_INPUT]: false,
      [FeatureKey.ADVANCED_AI_QUERIES]: false,
      [FeatureKey.AUTOMATED_REMINDERS]: false,
      [FeatureKey.SCHEDULED_SUMMARIES]: false,
      [FeatureKey.ADVANCED_REPORTS]: false,
      [FeatureKey.REPORT_EXPORT]: false,
      [FeatureKey.CUSTOM_CATEGORIES]: false,
      [FeatureKey.TEAM_ACCESS]: false,
    };

    for (const toggle of plan.features) {
      defaultFeatures[toggle.key] = toggle.enabled;
    }

    if (business.features && typeof business.features === 'object') {
      for (const [key, value] of Object.entries(business.features)) {
        if (key in defaultFeatures && typeof value === 'boolean') {
          defaultFeatures[key as FeatureKey] = value;
        }
      }
    }

    const defaultLimits = {
      customersPerMonth: 50,
      invoicesPerMonth: 100,
      aiRequestsPerMonth: 50,
      voiceMinutesPerMonth: 10,
      remindersPerMonth: 20,
      exportsPerMonth: 5,
    };

    const planLimits = plan.limits || {};
    const limits = { ...defaultLimits, ...planLimits };

    if (business.usageLimits && typeof business.usageLimits === 'object') {
      for (const [key, value] of Object.entries(business.usageLimits)) {
        if (key in limits && typeof value === 'number') {
          (limits as Record<string, number>)[key] = value;
        }
      }
    }

    return { features: defaultFeatures, limits, planCode };
  }

  async isFeatureEnabled(
    businessId: string,
    feature: FeatureKey,
  ): Promise<boolean> {
    const entitlements = await this.getEffectiveEntitlements(businessId);
    return entitlements.features[feature] ?? false;
  }

  async getLimits(businessId: string) {
    const entitlements = await this.getEffectiveEntitlements(businessId);
    return entitlements.limits;
  }

  async createPlanDefinition(
    dto: CreatePlanDefinitionDto,
  ): Promise<PlanDefinitionDocument> {
    return this.planModel.create(dto);
  }

  async listPlans(): Promise<PlanDefinitionDocument[]> {
    return this.planModel.find().sort({ code: 1 }).lean();
  }

  async getPlanByCode(code: string): Promise<PlanDefinitionDocument | null> {
    return this.planModel.findOne({ code: code.toLowerCase() }).lean();
  }

  private async getBusiness(businessId: string): Promise<{
    planCode: string;
    features?: Record<string, boolean>;
    usageLimits?: Record<string, number>;
  }> {
    const mongoose = this.planModel.db.db!;
    const businesses = mongoose.collection('businesses');
    const business = await businesses.findOne({
      _id: new (this.planModel.db as any).Types.ObjectId(businessId),
    });

    if (!business) {
      throw new NotFoundException(`Business '${businessId}' not found`);
    }

    return {
      planCode: business.planCode || 'free',
      features: business.features,
      usageLimits: business.usageLimits,
    };
  }
}
