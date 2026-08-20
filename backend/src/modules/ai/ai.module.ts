import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { LlmProviderService } from './providers/llm-provider.service';
import { AiPromptService } from './services/ai-prompt.service';
import { AiExtractionService } from './services/ai-extraction.service';
import { AiValidationService } from './services/ai-validation.service';
import { AiProposalService } from './services/ai-proposal.service';
import { BusinessQueryHandler } from './business-query/business-query.handler';
import { BusinessQueryClassifierService } from './business-query/services/business-query-classifier.service';
import { BusinessQueryDateService } from './business-query/services/business-query-date.service';
import { BusinessQueryService } from './business-query/services/business-query.service';
import { BusinessQueryResponseService } from './business-query/services/business-query-response.service';
import { AiProposal, AiProposalSchema } from './schemas/ai-proposal.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Transaction, TransactionSchema } from '../transactions/schemas/transaction.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import { MessageEvent, MessageEventSchema } from '../whatsapp/schemas/message-event.schema';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiProposal.name, schema: AiProposalSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: MessageEvent.name, schema: MessageEventSchema },
    ]),
    AuthModule,
    AuditModule,
  ],
  controllers: [AiController],
  providers: [
    LlmProviderService,
    AiPromptService,
    AiExtractionService,
    AiValidationService,
    AiProposalService,
    BusinessQueryHandler,
    BusinessQueryClassifierService,
    BusinessQueryDateService,
    BusinessQueryService,
    BusinessQueryResponseService,
  ],
  exports: [
    AiExtractionService,
    AiProposalService,
    AiPromptService,
    AiValidationService,
    LlmProviderService,
    BusinessQueryHandler,
    BusinessQueryService,
    BusinessQueryClassifierService,
    BusinessQueryDateService,
    BusinessQueryResponseService,
    MongooseModule,
  ],
})
export class AiModule {}
