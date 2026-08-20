import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    AuthModule,
    AuditModule,
    InvoicesModule,
    RemindersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService, MongooseModule],
})
export class PaymentsModule {}
