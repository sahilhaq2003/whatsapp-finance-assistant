import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule, Cron } from '@nestjs/schedule';
import { FinancialSummary, FinancialSummarySchema } from './schemas/financial-summary.schema';
import { SummaryPreference, SummaryPreferenceSchema } from './schemas/summary-preference.schema';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { FinancialSummaryService } from './services/financial-summary.service';
import { SummaryPreferencesService } from './services/summary-preferences.service';
import { SummarySchedulerService } from './services/summary-scheduler.service';
import { SummaryDeliveryService } from './services/summary-delivery.service';
import { SummaryFormattingService } from './services/summary-formatting.service';
import { Transaction, TransactionSchema } from '../transactions/schemas/transaction.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import {
  WhatsAppAuthorizedSender,
  WhatsAppAuthorizedSenderSchema,
} from '../whatsapp/schemas/whatsapp-authorized-sender.schema';
import {
  MessageEvent,
  MessageEventSchema,
} from '../whatsapp/schemas/message-event.schema';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

class SummaryCronService {
  private readonly logger = new Logger(SummaryCronService.name);

  constructor(private readonly schedulerService: SummarySchedulerService) {}

  @Cron('*/15 * * * *')
  async handleCheckDueSummaries() {
    try {
      await this.schedulerService.checkAndGenerateDaily();
      await this.schedulerService.checkAndGenerateWeekly();
    } catch (error) {
      this.logger.error(`Summary cron check failed: ${error}`);
    }
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialSummary.name, schema: FinancialSummarySchema },
      { name: SummaryPreference.name, schema: SummaryPreferenceSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Business.name, schema: BusinessSchema },
      { name: WhatsAppAuthorizedSender.name, schema: WhatsAppAuthorizedSenderSchema },
      { name: MessageEvent.name, schema: MessageEventSchema },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    AuditModule,
    WhatsappModule,
  ],
  controllers: [SummariesController],
  providers: [
    SummariesService,
    FinancialSummaryService,
    SummaryPreferencesService,
    SummarySchedulerService,
    SummaryDeliveryService,
    SummaryFormattingService,
    SummaryCronService,
  ],
  exports: [
    SummariesService,
    FinancialSummaryService,
    SummaryPreferencesService,
    SummarySchedulerService,
    SummaryDeliveryService,
  ],
})
export class SummariesModule {}
