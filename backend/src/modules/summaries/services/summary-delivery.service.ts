import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { FinancialSummary, FinancialSummaryDocument } from '../schemas/financial-summary.schema';
import { SummaryPreference, SummaryPreferenceDocument } from '../schemas/summary-preference.schema';
import { SummaryFrequency } from '../enums/summary-frequency.enum';
import { SummaryStatus } from '../enums/summary-status.enum';
import { WeeklyDay } from '../enums/weekly-day.enum';
import { FinancialSummaryService } from './financial-summary.service';
import { SummaryFormattingService } from './summary-formatting.service';
import { MetaWhatsAppProviderService } from '../../whatsapp/services/whatsapp-provider.service';
import { WhatsAppBusinessResolverService } from '../../whatsapp/services/whatsapp-business-resolver.service';
import { WhatsAppAuthorizedSender, WhatsAppAuthorizedSenderDocument } from '../../whatsapp/schemas/whatsapp-authorized-sender.schema';
import { SenderStatus } from '../../../common/enums/sender-status.enum';
import { MessageEvent, MessageEventDocument } from '../../whatsapp/schemas/message-event.schema';
import { MessageDirection } from '../../../common/enums/message-direction.enum';
import { MessageType } from '../../../common/enums/message-type.enum';
import { MessageProcessingStatus } from '../../../common/enums/message-processing-status.enum';
import { WhatsAppProvider } from '../../../common/enums/whatsapp-provider.enum';

@Injectable()
export class SummaryDeliveryService {
  private readonly logger = new Logger(SummaryDeliveryService.name);
  private readonly templateLanguage: string;
  private readonly dailyTemplateName: string;
  private readonly weeklyTemplateName: string;

  constructor(
    @InjectModel(FinancialSummary.name)
    private summaryModel: Model<FinancialSummaryDocument>,
    @InjectModel(SummaryPreference.name)
    private prefModel: Model<SummaryPreferenceDocument>,
    @InjectModel(WhatsAppAuthorizedSender.name)
    private senderModel: Model<WhatsAppAuthorizedSenderDocument>,
    @InjectModel(MessageEvent.name)
    private messageEventModel: Model<MessageEventDocument>,
    private readonly financialSummaryService: FinancialSummaryService,
    private readonly formattingService: SummaryFormattingService,
    private readonly whatsappProvider: MetaWhatsAppProviderService,
    private readonly businessResolver: WhatsAppBusinessResolverService,
    private readonly configService: ConfigService,
  ) {
    this.templateLanguage = this.configService.get<string>('WHATSAPP_SUMMARY_TEMPLATE_LANGUAGE') || 'en';
    this.dailyTemplateName = this.configService.get<string>('WHATSAPP_DAILY_SUMMARY_TEMPLATE_NAME') || 'daily_business_summary';
    this.weeklyTemplateName = this.configService.get<string>('WHATSAPP_WEEKLY_SUMMARY_TEMPLATE_NAME') || 'weekly_business_summary';
  }

  async processSummary(summaryId: string): Promise<void> {
    try {
      const summary = await this.summaryModel.findById(new Types.ObjectId(summaryId));
      if (!summary) {
        this.logger.error(`Summary ${summaryId} not found`);
        return;
      }

      if (summary.status === SummaryStatus.SENT || summary.status === SummaryStatus.DELIVERED || summary.status === SummaryStatus.READ) {
        this.logger.log(`Summary ${summaryId} already delivered, skipping`);
        return;
      }

      const pref = await this.prefModel.findOne({ businessId: summary.businessId });
      if (!pref) {
        await this.failSummary(summary, 'No preferences found');
        return;
      }

      if (summary.frequency === SummaryFrequency.DAILY && !pref.dailyEnabled) {
        await this.skipSummary(summary, 'Daily summaries disabled');
        return;
      }
      if (summary.frequency === SummaryFrequency.WEEKLY && !pref.weeklyEnabled) {
        await this.skipSummary(summary, 'Weekly summaries disabled');
        return;
      }

      const connection = await this.businessResolver.resolveByBusinessId(summary.businessId.toString());
      if (!connection) {
        await this.failSummary(summary, 'No WhatsApp connection');
        return;
      }

      const sender = await this.senderModel.findOne({
        businessId: summary.businessId,
        status: SenderStatus.VERIFIED,
      });
      if (!sender) {
        await this.failSummary(summary, 'No verified authorized sender');
        return;
      }

      const messageText = summary.frequency === SummaryFrequency.DAILY
        ? this.formattingService.formatDailySummary({
            periodStart: summary.periodStart,
            periodEnd: summary.periodEnd,
            timezone: summary.timezone,
            currency: summary.currency,
            incomeMinor: summary.incomeMinor,
            expenseMinor: summary.expenseMinor,
            netCashFlowMinor: summary.netCashFlowMinor,
            transactionCount: summary.transactionCount,
            outstandingAmountMinor: summary.outstandingAmountMinor,
            outstandingInvoiceCount: summary.outstandingInvoiceCount,
          })
        : this.formattingService.formatWeeklySummary({
            periodStart: summary.periodStart,
            periodEnd: summary.periodEnd,
            timezone: summary.timezone,
            currency: summary.currency,
            incomeMinor: summary.incomeMinor,
            expenseMinor: summary.expenseMinor,
            netCashFlowMinor: summary.netCashFlowMinor,
            transactionCount: summary.transactionCount,
            outstandingAmountMinor: summary.outstandingAmountMinor,
            outstandingInvoiceCount: summary.outstandingInvoiceCount,
            overdueAmountMinor: summary.overdueAmountMinor,
            overdueInvoiceCount: summary.overdueInvoiceCount,
            topExpenseCategories: summary.topExpenseCategories || [],
          });

      const templateName = summary.frequency === SummaryFrequency.DAILY
        ? this.dailyTemplateName
        : this.weeklyTemplateName;

      const outstandingStr = this.formattingService.formatCurrency(summary.outstandingAmountMinor, summary.currency);

      const result = await this.whatsappProvider.sendTemplateMessage({
        phoneNumberId: connection.phoneNumberId,
        recipientPhone: sender.phoneE164,
        templateName,
        templateLanguage: this.templateLanguage,
        templateComponents: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: this.formattingService.formatCurrency(summary.incomeMinor, summary.currency) },
              { type: 'text', text: this.formattingService.formatCurrency(summary.expenseMinor, summary.currency) },
              { type: 'text', text: this.formattingService.formatCurrency(summary.netCashFlowMinor, summary.currency) },
              { type: 'text', text: String(summary.transactionCount) },
              { type: 'text', text: outstandingStr },
              { type: 'text', text: String(summary.outstandingInvoiceCount) },
            ],
          },
        ],
      });

      await this.summaryModel.findByIdAndUpdate(summary._id, {
        $set: {
          status: SummaryStatus.SENT,
          sentAt: result.sentAt,
          providerMessageId: result.providerMessageId,
        },
        $inc: { sendAttempts: 1 },
      });

      try {
        await this.messageEventModel.create({
          businessId: summary.businessId,
          whatsappConnectionId: connection._id,
          provider: WhatsAppProvider.META_CLOUD,
          providerMessageId: result.providerMessageId,
          direction: MessageDirection.OUTBOUND,
          senderPhone: connection.phoneNumberId,
          recipientPhone: sender.phoneE164,
          messageType: MessageType.TEXT,
          text: messageText,
          providerTimestamp: result.sentAt,
          processingStatus: MessageProcessingStatus.PROCESSED,
          deliveryStatus: undefined,
          sentAt: result.sentAt,
        });
      } catch (msgError) {
        this.logger.warn(`Failed to create MessageEvent for summary: ${msgError}`);
      }

      this.logger.log(`Summary ${summary._id} sent to ${sender.phoneE164}`);
    } catch (error) {
      this.logger.error(`Error processing summary ${summaryId}: ${error}`);
      const summary = await this.summaryModel.findById(new Types.ObjectId(summaryId));
      if (summary) {
        await this.failSummary(summary, `Delivery failed: ${error}`);
      }
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
        updateFields.status = SummaryStatus.DELIVERED;
        updateFields.deliveredAt = timestamp;
        break;
      case 'read':
        updateFields.status = SummaryStatus.READ;
        updateFields.readAt = timestamp;
        break;
      case 'failed':
        updateFields.status = SummaryStatus.FAILED;
        updateFields.failedAt = timestamp;
        break;
      default:
        return;
    }
    await this.summaryModel.findOneAndUpdate(
      { providerMessageId },
      { $set: updateFields },
    );
  }

  private async failSummary(summary: FinancialSummaryDocument, reason: string): Promise<void> {
    await this.summaryModel.findByIdAndUpdate(summary._id, {
      $set: {
        status: SummaryStatus.FAILED,
        failureCode: reason,
        failedAt: new Date(),
      },
      $inc: { sendAttempts: 1 },
    });
  }

  private async skipSummary(summary: FinancialSummaryDocument, reason: string): Promise<void> {
    await this.summaryModel.findByIdAndUpdate(summary._id, {
      $set: {
        status: SummaryStatus.SKIPPED,
        failureCode: reason,
      },
    });
  }
}
