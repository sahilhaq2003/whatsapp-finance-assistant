import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataRequestsController } from './data-requests.controller';
import { DataRequestsService } from './services/data-requests.service';
import { DataRequest, DataRequestSchema } from './schemas/data-request.schema';
import {
  Business,
  BusinessSchema,
} from '../businesses/schemas/business.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import {
  InvoiceItem,
  InvoiceItemSchema,
} from '../invoices/schemas/invoice-item.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import {
  FinancialSummary,
  FinancialSummarySchema,
} from '../summaries/schemas/financial-summary.schema';
import { AiProposal, AiProposalSchema } from '../ai/schemas/ai-proposal.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DataRequest.name, schema: DataRequestSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: InvoiceItem.name, schema: InvoiceItemSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: FinancialSummary.name, schema: FinancialSummarySchema },
      { name: AiProposal.name, schema: AiProposalSchema },
    ]),
    AuthModule,
  ],
  controllers: [DataRequestsController],
  providers: [DataRequestsService],
  exports: [DataRequestsService],
})
export class DataRequestsModule {}
