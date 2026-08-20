import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';
import { ReminderRule, ReminderRuleDocument } from '../schemas/reminder-rule.schema';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';
import { ReminderStatus } from '../enums/reminder-status.enum';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(ReminderRule.name) private ruleModel: Model<ReminderRuleDocument>,
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
  ) {}

  async scanForDueInvoices(): Promise<{
    scanned: number;
    remindersCreated: number;
    skipped: number;
    errors: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const issuedInvoices = await this.invoiceModel.find({
      status: InvoiceStatus.ISSUED,
      paymentStatus: { $ne: InvoicePaymentStatus.PAID },
      dueDate: { $exists: true, $ne: null },
    });

    let remindersCreated = 0;
    let skipped = 0;
    let errors = 0;

    for (const invoice of issuedInvoices) {
      try {
        const businessId = invoice.businessId.toString();
        const rules = await this.ruleModel.find({
          businessId: new Types.ObjectId(businessId),
          isEnabled: true,
        });

        for (const rule of rules) {
          const shouldRemind = this.shouldCreateReminder(
            rule,
            invoice,
            today,
          );

          if (!shouldRemind) {
            skipped++;
            continue;
          }

          const scheduledDate = this.calculateScheduledDate(rule, invoice, today);

          const created = await this.createReminderIfNotExists(
            invoice,
            rule,
            scheduledDate,
          );
          if (created) {
            remindersCreated++;
          } else {
            skipped++;
          }
        }
      } catch (error) {
        errors++;
        this.logger.error(
          `Error processing invoice ${invoice._id} for reminders: ${error}`,
        );
      }
    }

    this.logger.log(
      `Reminder scan complete: ${issuedInvoices.length} invoices scanned, ${remindersCreated} reminders created, ${skipped} skipped, ${errors} errors`,
    );

    return {
      scanned: issuedInvoices.length,
      remindersCreated,
      skipped,
      errors,
    };
  }

  private shouldCreateReminder(
    rule: ReminderRuleDocument,
    invoice: InvoiceDocument,
    today: Date,
  ): boolean {
    if (!invoice.dueDate) return false;

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (rule.trigger === ReminderTrigger.DUE_DATE) {
      const targetDaysBefore = rule.offsetDays;
      return daysDiff === -targetDaysBefore;
    }

    if (rule.trigger === ReminderTrigger.POST_DUE) {
      return daysDiff === rule.offsetDays;
    }

    return false;
  }

  private calculateScheduledDate(
    rule: ReminderRuleDocument,
    invoice: InvoiceDocument,
    today: Date,
  ): Date {
    const scheduled = new Date(today);
    scheduled.setHours(rule.hourOfDay, rule.minuteOfHour, 0, 0);
    return scheduled;
  }

  async createReminderIfNotExists(
    invoice: InvoiceDocument,
    rule: ReminderRuleDocument,
    scheduledAt: Date,
  ): Promise<boolean> {
    const businessId = invoice.businessId.toString();
    const invoiceId = invoice._id.toString();
    const trigger = rule.trigger;
    const dateKey = scheduledAt.toISOString().split('T')[0];
    const deduplicationKey = `${businessId}:${invoiceId}:${trigger}:${dateKey}`;

    const existing = await this.reminderModel.findOne({
      deduplicationKey,
    });
    if (existing) {
      return false;
    }

    const reminderCount = await this.reminderModel.countDocuments({
      businessId: new Types.ObjectId(businessId),
      invoiceId: new Types.ObjectId(invoiceId),
      trigger,
      status: { $in: [ReminderStatus.SENT, ReminderStatus.DELIVERED, ReminderStatus.READ, ReminderStatus.SCHEDULED] },
    });

    if (reminderCount >= rule.maxRemindsPerInvoice) {
      return false;
    }

    await this.reminderModel.create({
      businessId: new Types.ObjectId(businessId),
      invoiceId: new Types.ObjectId(invoiceId),
      customerId: invoice.customerId,
      trigger,
      channel: rule.channel,
      status: ReminderStatus.SCHEDULED,
      scheduledAt,
      deduplicationKey,
      snapshotInvoiceNumber: invoice.invoiceNumber,
      snapshotTotalMinor: invoice.totalMinor,
      snapshotDueDate: invoice.dueDate,
    });

    return true;
  }

  async cancelFutureRemindersForInvoice(
    businessId: string,
    invoiceId: string,
  ): Promise<number> {
    const result = await this.reminderModel.updateMany(
      {
        businessId: new Types.ObjectId(businessId),
        invoiceId: new Types.ObjectId(invoiceId),
        status: { $in: [ReminderStatus.PENDING, ReminderStatus.SCHEDULED] },
      },
      {
        $set: {
          status: ReminderStatus.CANCELLED,
        },
      },
    );
    return result.modifiedCount;
  }

  async getDueReminders(): Promise<ReminderDocument[]> {
    const now = new Date();
    return this.reminderModel.find({
      status: ReminderStatus.SCHEDULED,
      scheduledAt: { $lte: now },
    }).sort({ scheduledAt: 1 });
  }

  async getRemindersForInvoice(
    businessId: string,
    invoiceId: string,
  ): Promise<ReminderDocument[]> {
    return this.reminderModel.find({
      businessId: new Types.ObjectId(businessId),
      invoiceId: new Types.ObjectId(invoiceId),
    }).sort({ scheduledAt: -1 });
  }

  async getReminderStats(
    businessId: string,
  ): Promise<{
    total: number;
    scheduled: number;
    sent: number;
    delivered: number;
    failed: number;
    cancelled: number;
  }> {
    const counts = await this.reminderModel.aggregate([
      { $match: { businessId: new Types.ObjectId(businessId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      scheduled: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const c of counts) {
      stats.total += c.count;
      if (c._id in stats) {
        (stats as Record<string, number>)[c._id] = c.count;
      }
    }

    return stats;
  }
}
