import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookService } from './services/whatsapp-webhook.service';
import { WhatsAppMessageService } from './services/whatsapp-message.service';
import { WhatsAppPairingService } from './services/whatsapp-pairing.service';
import { WhatsAppBusinessResolverService } from './services/whatsapp-business-resolver.service';
import { WhatsAppVoiceProcessorService } from './services/whatsapp-voice-processor.service';
import { MetaWhatsAppProviderService } from './services/whatsapp-provider.service';
import { WhatsAppConnection, WhatsAppConnectionSchema } from './schemas/whatsapp-connection.schema';
import { WhatsAppAuthorizedSender, WhatsAppAuthorizedSenderSchema } from './schemas/whatsapp-authorized-sender.schema';
import { MessageEvent, MessageEventSchema } from './schemas/message-event.schema';
import { WhatsAppPairingCode, WhatsAppPairingCodeSchema } from './schemas/whatsapp-pairing-code.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import { FinancialSummary, FinancialSummarySchema } from '../summaries/schemas/financial-summary.schema';
import { Business, BusinessSchema } from '../businesses/schemas/business.schema';
import { SpeechModule } from '../speech/speech.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppConnection.name, schema: WhatsAppConnectionSchema },
      { name: WhatsAppAuthorizedSender.name, schema: WhatsAppAuthorizedSenderSchema },
      { name: MessageEvent.name, schema: MessageEventSchema },
      { name: WhatsAppPairingCode.name, schema: WhatsAppPairingCodeSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: FinancialSummary.name, schema: FinancialSummarySchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    SpeechModule,
    AiModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [WhatsAppController],
  providers: [
    MetaWhatsAppProviderService,
    WhatsAppWebhookService,
    WhatsAppMessageService,
    WhatsAppPairingService,
    WhatsAppBusinessResolverService,
    WhatsAppVoiceProcessorService,
  ],
  exports: [
    WhatsAppMessageService,
    WhatsAppBusinessResolverService,
    MetaWhatsAppProviderService,
    MongooseModule,
  ],
})
export class WhatsappModule {}
