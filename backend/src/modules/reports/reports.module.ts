import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './services/reports.service';
import { TransactionReportService } from './services/transaction-report.service';
import { InvoiceReportService } from './services/invoice-report.service';
import { CustomerReportService } from './services/customer-report.service';
import { PaymentReportService } from './services/payment-report.service';
import { ReportPdfService } from './services/report-pdf.service';
import { ReportCsvService } from './services/report-csv.service';
import { ReportPeriodService } from './services/report-period.service';
import { Transaction, TransactionSchema } from '../transactions/schemas/transaction.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    TransactionReportService,
    InvoiceReportService,
    CustomerReportService,
    PaymentReportService,
    ReportPdfService,
    ReportCsvService,
    ReportPeriodService,
  ],
  exports: [ReportsService, TransactionReportService, InvoiceReportService, CustomerReportService, PaymentReportService],
})
export class ReportsModule {}
