import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    AuthModule,
    AuditModule,
    TransactionsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
