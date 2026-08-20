import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceItem, InvoiceItemSchema } from './schemas/invoice-item.schema';
import {
  InvoiceCounter,
  InvoiceCounterSchema,
} from './schemas/invoice-counter.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceNumberService } from './services/invoice-number.service';
import { InvoiceCalculationService } from './services/invoice-calculation.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: InvoiceItem.name, schema: InvoiceItemSchema },
      { name: InvoiceCounter.name, schema: InvoiceCounterSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    AuthModule,
    AuditModule,
    FilesModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoiceNumberService,
    InvoiceCalculationService,
    InvoicePdfService,
  ],
  exports: [InvoicesService, InvoiceCalculationService, MongooseModule],
})
export class InvoicesModule {}
