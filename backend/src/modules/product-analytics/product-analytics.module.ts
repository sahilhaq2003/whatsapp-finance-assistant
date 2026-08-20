import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductAnalyticsController } from './product-analytics.controller';
import { ProductMetricsService } from './services/product-metrics.service';
import { RetentionService } from './services/retention.service';
import { AiQualityMetricsService } from './services/ai-quality-metrics.service';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { AiProposal, AiProposalSchema } from '../ai/schemas/ai-proposal.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import {
  BetaEnrollment,
  BetaEnrollmentSchema,
} from '../beta/schemas/beta-enrollment.schema';
import {
  MessageEvent,
  MessageEventSchema,
} from '../whatsapp/schemas/message-event.schema';
import {
  Business,
  BusinessSchema,
} from '../businesses/schemas/business.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: AiProposal.name, schema: AiProposalSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: BetaEnrollment.name, schema: BetaEnrollmentSchema },
      { name: MessageEvent.name, schema: MessageEventSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    AuthModule,
  ],
  controllers: [ProductAnalyticsController],
  providers: [ProductMetricsService, RetentionService, AiQualityMetricsService],
  exports: [ProductMetricsService, RetentionService, AiQualityMetricsService],
})
export class ProductAnalyticsModule {}
