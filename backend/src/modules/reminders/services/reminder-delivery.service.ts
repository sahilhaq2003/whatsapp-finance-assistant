import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';
import { ReminderStatus } from '../enums/reminder-status.enum';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';
import { MetaWhatsAppProviderService } from '../../whatsapp/services/whatsapp-provider.service';
import { WhatsAppBusinessResolverService } from '../../whatsapp/services/whatsapp-business-resolver.service';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';

@Injectable()
export class ReminderDeliveryService {
  private readonly logger = new Logger(ReminderDeliveryService.name);
  private readonly templateLanguage: string;

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private readonly whatsappProvider: MetaWhatsAppProviderService,
    private readonly businessResolver: WhatsAppBusinessResolverService,
    private readonly configService: ConfigService,
  ) {
    this.templateLanguage = this.configService.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') || 'en';
  }

  async processReminder(reminder: ReminderDocument): Promise<void> {
    try {
      await this.reminderModel.findByIdAndUpdate(reminder._id, {
        $set: { status: ReminderStatus.SENDING },
        $inc: { sendAttempts: 1 },
      });

      const invoice = await this.invoiceModel.findOne({
        _id: reminder.invoiceId,
        businessId: reminder.businessId,
      });
      if (!invoice) {
        await this.failReminder(reminder, 'Invoice not found');
        return;
      }

      if (invoice.status !== InvoiceStatus.ISSUED) {
        await this.skipReminder(reminder, `Invoice status is ${invoice.status}`);
        return;
      }

      if (invoice.paymentStatus === InvoicePaymentStatus.PAID) {
        await this.skipReminder(reminder, 'Invoice is fully paid');
        return;
      }

      const confirmedPayments = await this.paymentModel.find({
        invoiceId: invoice._id,
        businessId: reminder.businessId,
        status: PaymentStatus.CONFIRMED,
      });
      const confirmedPaidMinor = confirmedPayments.reduce(
        (sum, p) => sum + p.amountMinor,
        0,
      );
      const remainingMinor = Math.max(0, invoice.totalMinor - confirmedPaidMinor);

      if (remainingMinor <= 0) {
        await this.skipReminder(reminder, 'Invoice has no remaining balance');
        return;
      }

      let phone = '';
      if (invoice.customerSnapshot?.phone) {
        phone = invoice.customerSnapshot.phone;
      } else if (reminder.snapshotCustomerPhone) {
        phone = reminder.snapshotCustomerPhone;
      }

      if (!phone) {
        await this.failReminder(reminder, 'No customer phone number available');
        return;
      }

      const connection = await this.businessResolver.resolveByBusinessId(
        reminder.businessId.toString(),
      );
      if (!connection) {
        await this.failReminder(reminder, 'No WhatsApp connection for business');
        return;
      }

      const dueDateStr = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';

      const totalStr = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: invoice.currency || 'LKR',
      }).format(invoice.totalMinor / 100);

      const remainingStr = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: invoice.currency || 'LKR',
      }).format(remainingMinor / 100);

      const templateName = reminder.trigger === ReminderTrigger.POST_DUE
        ? (this.configService.get<string>('WHATSAPP_TEMPLATE_NAME_OVERDUE') || 'invoice_overdue_reminder')
        : (this.configService.get<string>('WHATSAPP_TEMPLATE_NAME_REMINDER') || 'invoice_payment_reminder');

      const result = await this.whatsappProvider.sendTemplateMessage({
        phoneNumberId: connection.phoneNumberId,
        recipientPhone: phone,
        templateName,
        templateLanguage: this.templateLanguage,
        templateComponents: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: invoice.customerSnapshot?.name || 'Customer' },
              { type: 'text', text: invoice.invoiceNumber },
              { type: 'text', text: totalStr },
              { type: 'text', text: remainingStr },
              { type: 'text', text: dueDateStr },
            ],
          },
        ],
      });

      await this.reminderModel.findByIdAndUpdate(reminder._id, {
        $set: {
          status: ReminderStatus.SENT,
          sentAt: result.sentAt,
          providerMessageId: result.providerMessageId,
          snapshotRemainingMinor: remainingMinor,
          snapshotTotalMinor: invoice.totalMinor,
          snapshotCustomerPhone: phone,
          snapshotCustomerName: invoice.customerSnapshot?.name,
        },
      });

      this.logger.log(
        `Reminder ${reminder._id} sent for invoice ${invoice.invoiceNumber}`,
      );
    } catch (error) {
      this.logger.error(`Error processing reminder ${reminder._id}: ${error}`);
      await this.failReminder(reminder, `Delivery failed: ${error}`);
    }
  }

  async processManualReminder(
    businessId: string,
    invoiceId: string,
    userId?: string,
  ): Promise<ReminderDocument> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      businessId: new Types.ObjectId(businessId),
    });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new Error('Can only send reminders for issued invoices');
    }

    if (invoice.paymentStatus === InvoicePaymentStatus.PAID) {
      throw new Error('Invoice is fully paid, no reminder needed');
    }

    const connection = await this.businessResolver.resolveByBusinessId(businessId);
    if (!connection) {
      throw new Error('No WhatsApp connection configured for this business');
    }

    const confirmedPayments = await this.paymentModel.find({
      invoiceId: invoice._id,
      businessId: new Types.ObjectId(businessId),
      status: PaymentStatus.CONFIRMED,
    });
    const confirmedPaidMinor = confirmedPayments.reduce(
      (sum, p) => sum + p.amountMinor,
      0,
    );
    const remainingMinor = Math.max(0, invoice.totalMinor - confirmedPaidMinor);

    const phone = invoice.customerSnapshot?.phone;
    if (!phone) {
      throw new Error('No customer phone number available');
    }

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const deduplicationKey = `${businessId}:${invoiceId}:manual:${dateKey}:t${now.getTime()}`;

    const reminder = await this.reminderModel.create({
      businessId: new Types.ObjectId(businessId),
      invoiceId: new Types.ObjectId(invoiceId),
      customerId: invoice.customerId,
      trigger: ReminderTrigger.MANUAL,
      channel: 'whatsapp' as any,
      status: ReminderStatus.PENDING,
      scheduledAt: now,
      deduplicationKey,
      snapshotInvoiceNumber: invoice.invoiceNumber,
      snapshotTotalMinor: invoice.totalMinor,
      snapshotRemainingMinor: remainingMinor,
      snapshotDueDate: invoice.dueDate,
      snapshotCustomerPhone: phone,
      snapshotCustomerName: invoice.customerSnapshot?.name,
      triggeredByUserId: userId ? new Types.ObjectId(userId) : undefined,
    });

    const dueDateStr = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A';
    const totalStr = new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: invoice.currency || 'LKR',
    }).format(invoice.totalMinor / 100);
    const remainingStr = new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: invoice.currency || 'LKR',
    }).format(remainingMinor / 100);

    const templateName = this.configService.get<string>('WHATSAPP_TEMPLATE_NAME_REMINDER') || 'invoice_payment_reminder';

    try {
      await this.reminderModel.findByIdAndUpdate(reminder._id, {
        $set: { status: ReminderStatus.SENDING },
      });

      const result = await this.whatsappProvider.sendTemplateMessage({
        phoneNumberId: connection.phoneNumberId,
        recipientPhone: phone,
        templateName,
        templateLanguage: this.templateLanguage,
        templateComponents: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: invoice.customerSnapshot?.name || 'Customer' },
              { type: 'text', text: invoice.invoiceNumber },
              { type: 'text', text: totalStr },
              { type: 'text', text: remainingStr },
              { type: 'text', text: dueDateStr },
            ],
          },
        ],
      });

      await this.reminderModel.findByIdAndUpdate(reminder._id, {
        $set: {
          status: ReminderStatus.SENT,
          sentAt: result.sentAt,
          providerMessageId: result.providerMessageId,
        },
      });

      return reminder;
    } catch (error) {
      await this.reminderModel.findByIdAndUpdate(reminder._id, {
        $set: {
          status: ReminderStatus.FAILED,
          errorMessage: `Delivery failed: ${error}`,
        },
      });
      throw error;
    }
  }

  async updateDeliveryStatus(
    providerMessageId: string,
    status: string,
    timestamp: Date,
  ): Promise<void> {
    const updateFields: Record<string, unknown> = {};

    switch (status) {
      case 'delivered':
        updateFields.status = ReminderStatus.DELIVERED;
        updateFields.deliveredAt = timestamp;
        break;
      case 'read':
        updateFields.status = ReminderStatus.READ;
        updateFields.readAt = timestamp;
        break;
      case 'failed':
        updateFields.status = ReminderStatus.FAILED;
        updateFields.failedAt = timestamp;
        break;
      default:
        return;
    }

    await this.reminderModel.findOneAndUpdate(
      { providerMessageId },
      { $set: updateFields },
    );
  }

  private async failReminder(
    reminder: ReminderDocument,
    reason: string,
  ): Promise<void> {
    await this.reminderModel.findByIdAndUpdate(reminder._id, {
      $set: {
        status: ReminderStatus.FAILED,
        errorMessage: reason,
        failureReason: reason,
      },
    });
  }

  private async skipReminder(
    reminder: ReminderDocument,
    reason: string,
  ): Promise<void> {
    await this.reminderModel.findByIdAndUpdate(reminder._id, {
      $set: {
        status: ReminderStatus.SKIPPED,
        failureReason: reason,
      },
    });
  }
}
