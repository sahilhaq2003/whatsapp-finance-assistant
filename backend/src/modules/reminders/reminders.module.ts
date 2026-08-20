import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule, Cron } from '@nestjs/schedule';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { ReminderRule, ReminderRuleSchema } from './schemas/reminder-rule.schema';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './services/reminders.service';
import { ReminderSchedulerService } from './services/reminder-scheduler.service';
import { ReminderDeliveryService } from './services/reminder-delivery.service';
import { ReminderRulesService } from './services/reminder-rules.service';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(private readonly remindersService: RemindersService) {}

  @Cron('0 9 * * *')
  async handleScanDueInvoices() {
    this.logger.log('Running scheduled due invoice scan');
    try {
      await this.remindersService.scanDueInvoices();
    } catch (error) {
      this.logger.error(`Scheduled scan failed: ${error}`);
    }
  }

  @Cron('*/5 * * * *')
  async handleProcessReminders() {
    try {
      await this.remindersService.processScheduledReminders();
    } catch (error) {
      this.logger.error(`Reminder processing failed: ${error}`);
    }
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: ReminderRule.name, schema: ReminderRuleSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    AuditModule,
    WhatsappModule,
  ],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderSchedulerService,
    ReminderDeliveryService,
    ReminderRulesService,
    ReminderCronService,
  ],
  exports: [RemindersService, ReminderSchedulerService, ReminderDeliveryService],
})
export class RemindersModule {}
