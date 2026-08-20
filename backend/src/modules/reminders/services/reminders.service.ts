import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';
import { ReminderStatus } from '../enums/reminder-status.enum';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';
import { ReminderQueryDto } from '../dto/reminder-query.dto';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderDeliveryService } from './reminder-delivery.service';
import { ReminderRulesService } from './reminder-rules.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    private readonly schedulerService: ReminderSchedulerService,
    private readonly deliveryService: ReminderDeliveryService,
    private readonly rulesService: ReminderRulesService,
  ) {}

  async findAll(
    businessId: string,
    query: ReminderQueryDto,
  ): Promise<{
    items: ReminderDocument[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (query.invoiceId) {
      filter.invoiceId = new Types.ObjectId(query.invoiceId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.trigger) {
      filter.trigger = query.trigger;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reminderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId', 'invoiceNumber')
        .populate('customerId', 'name phone')
        .exec(),
      this.reminderModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRemindersForInvoice(
    businessId: string,
    invoiceId: string,
  ): Promise<ReminderDocument[]> {
    return this.schedulerService.getRemindersForInvoice(businessId, invoiceId);
  }

  async getStats(businessId: string) {
    return this.schedulerService.getReminderStats(businessId);
  }

  async scanDueInvoices() {
    return this.schedulerService.scanForDueInvoices();
  }

  async sendManualReminder(
    businessId: string,
    invoiceId: string,
    userId?: string,
  ): Promise<ReminderDocument> {
    const rule = await this.rulesService.getRuleByTrigger(businessId, 'manual');

    const recentManualReminder = await this.reminderModel.findOne({
      businessId: new Types.ObjectId(businessId),
      invoiceId: new Types.ObjectId(invoiceId),
      trigger: ReminderTrigger.MANUAL,
      createdAt: {
        $gte: new Date(Date.now() - rule.manualCooldownMinutes * 60 * 1000),
      },
      status: {
        $in: [ReminderStatus.SENT, ReminderStatus.DELIVERED, ReminderStatus.READ, ReminderStatus.SENDING],
      },
    });

    if (recentManualReminder) {
      throw new Error(
        `A manual reminder was sent recently. Please wait ${rule.manualCooldownMinutes} minutes between manual reminders.`,
      );
    }

    return this.deliveryService.processManualReminder(businessId, invoiceId, userId);
  }

  async cancelFutureReminders(
    businessId: string,
    invoiceId: string,
  ): Promise<number> {
    return this.schedulerService.cancelFutureRemindersForInvoice(businessId, invoiceId);
  }

  async getRules(businessId: string) {
    return this.rulesService.getRules(businessId);
  }

  async updateRule(businessId: string, ruleId: string, dto: unknown) {
    return this.rulesService.updateRule(businessId, ruleId, dto as any);
  }

  async processScheduledReminders(): Promise<void> {
    const dueReminders = await this.schedulerService.getDueReminders();
    this.logger.log(`Processing ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      try {
        await this.deliveryService.processReminder(reminder);
      } catch (error) {
        this.logger.error(`Error processing reminder ${reminder._id}: ${error}`);
      }
    }
  }

  async updateDeliveryStatus(
    providerMessageId: string,
    status: string,
    timestamp: Date,
  ): Promise<void> {
    return this.deliveryService.updateDeliveryStatus(providerMessageId, status, timestamp);
  }
}
