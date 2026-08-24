import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MessageEvent,
  MessageEventDocument,
} from '../schemas/message-event.schema';
import { MetaWebhookBody } from '../interfaces/whatsapp-webhook.interface';
import {
  ParsedIncomingMessage,
  ParsedStatusUpdate,
} from '../interfaces/whatsapp-message.interface';
import {
  Reminder,
  ReminderDocument,
} from '../../reminders/schemas/reminder.schema';
import { ReminderStatus } from '../../reminders/enums/reminder-status.enum';
import {
  FinancialSummary,
  FinancialSummaryDocument,
} from '../../summaries/schemas/financial-summary.schema';
import { SummaryStatus } from '../../summaries/enums/summary-status.enum';
import { MessageDirection } from '../../../common/enums/message-direction.enum';
import { MessageType } from '../../../common/enums/message-type.enum';
import { MessageProcessingStatus } from '../../../common/enums/message-processing-status.enum';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';
import { WhatsAppProvider } from '../../../common/enums/whatsapp-provider.enum';
import { MetaWhatsAppProviderService } from './whatsapp-provider.service';
import { WhatsAppBusinessResolverService } from './whatsapp-business-resolver.service';
import { WhatsAppMessageService } from './whatsapp-message.service';
import { WhatsAppInboxService } from './whatsapp-inbox.service';

export type WebhookEventType =
  'incoming_message' | 'status_update' | 'unsupported';

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);
  private readonly verifyToken: string;
  private readonly appSecret: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(MessageEvent.name)
    private messageEventModel: Model<MessageEventDocument>,
    @InjectModel(Reminder.name)
    private reminderModel: Model<ReminderDocument>,
    @InjectModel(FinancialSummary.name)
    private summaryModel: Model<FinancialSummaryDocument>,
    private readonly providerService: MetaWhatsAppProviderService,
    private readonly businessResolver: WhatsAppBusinessResolverService,
    private readonly messageService: WhatsAppMessageService,
    private readonly inboxService: WhatsAppInboxService,
  ) {
    this.verifyToken =
      this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || '';
    this.appSecret =
      this.configService.get<string>('WHATSAPP_APP_SECRET') || '';
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    this.logger.warn(
      `Webhook verification failed: mode=${mode}, token_match=${token === this.verifyToken}`,
    );
    return null;
  }

  verifySignature(
    body: string | Buffer,
    signature: string | undefined,
  ): boolean {
    return this.providerService.verifyWebhookSignature({
      body,
      signature,
      appSecret: this.appSecret,
    });
  }

  async processWebhookEvent(body: MetaWebhookBody): Promise<void> {
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const contactName = value.contacts?.find(
              (contact) => contact.wa_id === message.from,
            )?.profile?.name;
            await this.processIncomingMessage(
              message,
              value.metadata,
              contactName,
            );
          }
        }

        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            await this.processStatusUpdate(status, value.metadata);
          }
        }
      }
    }
  }

  private async processIncomingMessage(
    message: NonNullable<
      MetaWebhookBody['entry'][0]['changes'][0]['value']['messages']
    >[0],
    metadata: { display_phone_number: string; phone_number_id: string },
    customerName?: string,
  ): Promise<void> {
    try {
      const phoneNumberId = metadata.phone_number_id;

      const resolved =
        await this.businessResolver.resolveByPhoneNumberId(phoneNumberId);
      if (!resolved) {
        this.logger.warn(
          `No business resolved for phoneNumberId: ${phoneNumberId}`,
        );
        return;
      }

      const { connection, business } = resolved;
      const providerMessageId = message.id;

      const existing = await this.messageEventModel.findOne({
        provider: WhatsAppProvider.META_CLOUD,
        providerMessageId,
      });

      if (existing) {
        this.logger.log(
          `Duplicate webhook for message ${providerMessageId}, skipping`,
        );
        return;
      }

      const parsed = this.parseIncomingMessage(
        message,
        metadata,
        phoneNumberId,
      );
      const sender = await this.businessResolver.findAuthorizedSender(
        business._id.toString(),
        parsed.senderPhone,
      );

      // Store every incoming message exactly once, before any branching.
      const messageEvent = await this.messageEventModel.create({
        businessId: business._id,
        whatsappConnectionId: connection._id,
        provider: WhatsAppProvider.META_CLOUD,
        providerMessageId: parsed.providerMessageId,
        direction: MessageDirection.INBOUND,
        senderPhone: parsed.senderPhone,
        recipientPhone: parsed.recipientPhone,
        messageType: parsed.messageType,
        text: parsed.text,
        mediaId: parsed.mediaId,
        providerTimestamp: parsed.timestamp,
        processingStatus: MessageProcessingStatus.PROCESSING,
        replyToProviderMessageId: parsed.replyContext?.id,
        metadata: {
          rawEventType: 'message',
        },
      });

      if (!sender) {
        // Customer conversation: surface it in the web inbox where a human
        // reviews the AI-suggested reply before anything is sent.
        this.logger.log(
          `Recording inbound WhatsApp customer message ${parsed.providerMessageId} from ${parsed.senderPhone} for business ${business._id.toString()}`,
        );
        await this.inboxService.recordCustomerMessage(
          messageEvent,
          customerName,
        );
        await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
          processingStatus: MessageProcessingStatus.PROCESSED,
        });
        return;
      }

      await this.messageService.handleInboundMessage(
        messageEvent,
        connection,
        business,
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        this.logger.log('Duplicate providerMessageId caught at DB level');
        return;
      }
      this.logger.error(`Error processing incoming message: ${error}`);
    }
  }

  private async processStatusUpdate(
    status: NonNullable<
      MetaWebhookBody['entry'][0]['changes'][0]['value']['statuses']
    >[0],
    metadata: { display_phone_number: string; phone_number_id: string },
  ): Promise<void> {
    try {
      const parsed = this.parseStatusUpdate(status, metadata);

      const update: Record<string, unknown> = {};

      switch (parsed.status) {
        case DeliveryStatus.SENT:
          update.deliveryStatus = DeliveryStatus.SENT;
          update.sentAt = parsed.timestamp;
          break;
        case DeliveryStatus.DELIVERED:
          update.deliveryStatus = DeliveryStatus.DELIVERED;
          update.deliveredAt = parsed.timestamp;
          break;
        case DeliveryStatus.READ:
          update.deliveryStatus = DeliveryStatus.READ;
          update.readAt = parsed.timestamp;
          break;
        case DeliveryStatus.FAILED:
          update.deliveryStatus = DeliveryStatus.FAILED;
          update.failedAt = parsed.timestamp;
          update.failureCode = parsed.errorCode;
          break;
      }

      const result = await this.messageEventModel.findOneAndUpdate(
        {
          provider: WhatsAppProvider.META_CLOUD,
          providerMessageId: parsed.providerMessageId,
          direction: MessageDirection.OUTBOUND,
        },
        { $set: update },
        { new: true },
      );

      if (result) {
        this.logger.log(
          `Updated delivery status for ${parsed.providerMessageId}: ${parsed.status}`,
        );
        this.inboxService.notifyDeliveryStatus(
          result.businessId.toString(),
          parsed.providerMessageId,
          parsed.status,
        );
      }

      try {
        const reminderUpdate: Record<string, unknown> = {};
        if (parsed.status === DeliveryStatus.DELIVERED) {
          reminderUpdate.status = ReminderStatus.DELIVERED;
          reminderUpdate.deliveredAt = parsed.timestamp;
        } else if (parsed.status === DeliveryStatus.READ) {
          reminderUpdate.status = ReminderStatus.READ;
          reminderUpdate.readAt = parsed.timestamp;
        } else if (parsed.status === DeliveryStatus.FAILED) {
          reminderUpdate.status = ReminderStatus.FAILED;
          reminderUpdate.errorMessage = parsed.errorMessage;
        }

        if (Object.keys(reminderUpdate).length > 0) {
          await this.reminderModel.findOneAndUpdate(
            { providerMessageId: parsed.providerMessageId },
            { $set: reminderUpdate },
          );
        }
      } catch (reminderError) {
        this.logger.warn(`Failed to update reminder status: ${reminderError}`);
      }

      try {
        const summaryUpdate: Record<string, unknown> = {};
        if (parsed.status === DeliveryStatus.DELIVERED) {
          summaryUpdate.status = SummaryStatus.DELIVERED;
          summaryUpdate.deliveredAt = parsed.timestamp;
        } else if (parsed.status === DeliveryStatus.READ) {
          summaryUpdate.status = SummaryStatus.READ;
          summaryUpdate.readAt = parsed.timestamp;
        } else if (parsed.status === DeliveryStatus.FAILED) {
          summaryUpdate.status = SummaryStatus.FAILED;
          summaryUpdate.failedAt = parsed.timestamp;
        }
        if (Object.keys(summaryUpdate).length > 0) {
          await this.summaryModel.findOneAndUpdate(
            { providerMessageId: parsed.providerMessageId },
            { $set: summaryUpdate },
          );
        }
      } catch (summaryError) {
        this.logger.warn(`Failed to update summary status: ${summaryError}`);
      }
    } catch (error) {
      this.logger.error(`Error processing status update: ${error}`);
    }
  }

  private parseIncomingMessage(
    message: NonNullable<
      MetaWebhookBody['entry'][0]['changes'][0]['value']['messages']
    >[0],
    metadata: { display_phone_number: string; phone_number_id: string },
    phoneNumberId: string,
  ): ParsedIncomingMessage {
    let messageType = MessageType.UNKNOWN;
    let text: string | undefined;
    let mediaId: string | undefined;

    switch (message.type) {
      case 'text':
        messageType = MessageType.TEXT;
        text = message.text?.body;
        break;
      case 'image':
        messageType = MessageType.IMAGE;
        mediaId = message.image?.id;
        break;
      case 'audio':
        messageType = MessageType.AUDIO;
        mediaId = message.audio?.id;
        break;
      case 'document':
        messageType = MessageType.DOCUMENT;
        mediaId = message.document?.id;
        break;
      case 'interactive':
        messageType = MessageType.INTERACTIVE;
        break;
      default:
        messageType = MessageType.UNKNOWN;
    }

    return {
      phoneNumberId,
      senderPhone: message.from,
      recipientPhone: metadata.display_phone_number,
      providerMessageId: message.id,
      messageType,
      text,
      mediaId,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      replyContext: message.context
        ? { from: message.context.from, id: message.context.id }
        : undefined,
    };
  }

  private parseStatusUpdate(
    status: NonNullable<
      MetaWebhookBody['entry'][0]['changes'][0]['value']['statuses']
    >[0],
    metadata: { display_phone_number: string; phone_number_id: string },
  ): ParsedStatusUpdate {
    const statusMap: Record<string, DeliveryStatus> = {
      sent: DeliveryStatus.SENT,
      delivered: DeliveryStatus.DELIVERED,
      read: DeliveryStatus.READ,
      failed: DeliveryStatus.FAILED,
    };

    return {
      phoneNumberId: metadata.phone_number_id,
      recipientPhone: status.recipient_id,
      providerMessageId: status.id,
      status: statusMap[status.status] || DeliveryStatus.SENT,
      timestamp: new Date(parseInt(status.timestamp) * 1000),
      errorCode: status.errors?.[0]?.code?.toString(),
      errorMessage: status.errors?.[0]?.message,
    };
  }
}
