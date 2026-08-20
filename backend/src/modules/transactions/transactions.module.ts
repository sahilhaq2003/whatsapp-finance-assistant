import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from './schemas/transaction.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { CategoriesModule } from '../categories/categories.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    CategoriesModule,
    BusinessesModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService, MongooseModule],
})
export class TransactionsModule {}
