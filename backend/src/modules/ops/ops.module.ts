import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OpsService } from './services/ops.service';
import { OpsController } from './controllers/ops.controller';
import {
  Business,
  BusinessSchema,
} from '../businesses/schemas/business.schema';
import {
  BetaEnrollment,
  BetaEnrollmentSchema,
} from '../beta/schemas/beta-enrollment.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { AiProposal, AiProposalSchema } from '../ai/schemas/ai-proposal.schema';
import { Feedback, FeedbackSchema } from '../feedback/schemas/feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: BetaEnrollment.name, schema: BetaEnrollmentSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: AiProposal.name, schema: AiProposalSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
