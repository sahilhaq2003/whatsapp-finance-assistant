import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ReminderRule,
  ReminderRuleDocument,
} from '../schemas/reminder-rule.schema';
import { CreateReminderRuleDto } from '../dto/create-reminder-rule.dto';
import { UpdateReminderRuleDto } from '../dto/update-reminder-rule.dto';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';

@Injectable()
export class ReminderRulesService {
  private readonly logger = new Logger(ReminderRulesService.name);

  constructor(
    @InjectModel(ReminderRule.name)
    private ruleModel: Model<ReminderRuleDocument>,
  ) {}

  async getOrCreateRules(businessId: string): Promise<ReminderRuleDocument[]> {
    const triggers: ReminderTrigger[] = [ReminderTrigger.DUE_DATE, ReminderTrigger.POST_DUE];

    for (const trigger of triggers) {
      const existing = await this.ruleModel.findOne({
        businessId: new Types.ObjectId(businessId),
        trigger: trigger as ReminderTrigger,
      });
      if (!existing) {
        const defaults: Record<string, { offsetDays: number; hourOfDay: number; minuteOfHour: number }> = {
          [ReminderTrigger.DUE_DATE]: { offsetDays: 3, hourOfDay: 9, minuteOfHour: 0 },
          [ReminderTrigger.POST_DUE]: { offsetDays: 3, hourOfDay: 9, minuteOfHour: 0 },
        };
        const d = defaults[trigger];
        await this.ruleModel.create({
          businessId: new Types.ObjectId(businessId),
          trigger: trigger as ReminderTrigger,
          channel: 'whatsapp' as any,
          isEnabled: false,
          offsetDays: d.offsetDays,
          hourOfDay: d.hourOfDay,
          minuteOfHour: d.minuteOfHour,
          maxRemindsPerInvoice: 5,
          manualCooldownMinutes: 60,
        });
      }
    }

    return this.ruleModel.find({
      businessId: new Types.ObjectId(businessId),
    });
  }

  async getRules(businessId: string): Promise<ReminderRuleDocument[]> {
    return this.getOrCreateRules(businessId);
  }

  async getRuleByTrigger(
    businessId: string,
    trigger: string,
  ): Promise<ReminderRuleDocument> {
    const rule = await this.ruleModel.findOne({
      businessId: new Types.ObjectId(businessId),
      trigger: trigger as ReminderTrigger,
    });
    if (!rule) {
      throw new NotFoundException(`Reminder rule not found for trigger: ${trigger}`);
    }
    return rule;
  }

  async updateRule(
    businessId: string,
    ruleId: string,
    dto: UpdateReminderRuleDto,
  ): Promise<ReminderRuleDocument> {
    const rule = await this.ruleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(ruleId),
        businessId: new Types.ObjectId(businessId),
      },
      { $set: dto },
      { new: true },
    );
    if (!rule) {
      throw new NotFoundException('Reminder rule not found');
    }
    return rule;
  }

  async upsertRule(
    businessId: string,
    dto: CreateReminderRuleDto,
  ): Promise<ReminderRuleDocument> {
    const rule = await this.ruleModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(businessId),
        trigger: dto.trigger as ReminderTrigger,
        channel: (dto.channel || 'whatsapp') as any,
      },
      { $set: dto as any },
      { new: true, upsert: true },
    );
    return rule as ReminderRuleDocument;
  }
}
