import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LlmProviderService } from '../../ai/providers/llm-provider.service';
import { MessageDirection } from '../../../common/enums/message-direction.enum';
import { MessageType } from '../../../common/enums/message-type.enum';
import {
  Conversation,
  ConversationDocument,
} from '../schemas/conversation.schema';
import {
  AiReplyDraft,
  AiReplyDraftDocument,
} from '../schemas/ai-reply-draft.schema';
import {
  MessageEvent,
  MessageEventDocument,
} from '../schemas/message-event.schema';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';
import { WhatsAppMessageService } from './whatsapp-message.service';
import { WhatsAppRealtimeService } from './whatsapp-realtime.service';
import {
  WHATSAPP_AUDIT_ACTIONS,
  WHATSAPP_INBOX_CONSTANTS,
} from '../whatsapp.constants';
import { AuditService } from '../../audit/audit.service';

const ACTIVE_DRAFT_STATUSES = ['generating', 'waiting_for_approval'] as const;

@Injectable()
export class WhatsAppInboxService {
  private readonly logger = new Logger(WhatsAppInboxService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversations: Model<ConversationDocument>,
    @InjectModel(AiReplyDraft.name)
    private readonly drafts: Model<AiReplyDraftDocument>,
    @InjectModel(MessageEvent.name)
    private readonly messages: Model<MessageEventDocument>,
    private readonly llm: LlmProviderService,
    private readonly whatsapp: WhatsAppMessageService,
    private readonly realtime: WhatsAppRealtimeService,
    private readonly audit: AuditService,
  ) {}

  async recordCustomerMessage(
    message: MessageEventDocument,
    customerName?: string,
  ): Promise<ConversationDocument> {
    const preview =
      message.text?.trim() || `[${message.messageType.toLowerCase()} message]`;

    const occurredAt = message.providerTimestamp || new Date();

    const conversation = await this.conversations.findOneAndUpdate(
      { businessId: message.businessId, customerPhone: message.senderPhone },
      {
        $set: {
          whatsappConnectionId: message.whatsappConnectionId,
          latestMessagePreview: preview.slice(
            0,
            WHATSAPP_INBOX_CONSTANTS.MAX_MESSAGE_PREVIEW_LENGTH,
          ),
          latestMessageAt: occurredAt,
          lastCustomerMessageAt: occurredAt,
          status: 'open',
        },
        $setOnInsert: { customerName: customerName || undefined },
        $inc: { unreadCount: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (customerName && !conversation.customerName && !conversation.isNew) {
      conversation.customerName = customerName;
      await conversation.save();
    }

    message.conversationId = conversation._id;
    message.senderType = 'customer';
    await message.save();

    const businessId = message.businessId.toString();
    this.realtime.emit(businessId, 'message_created', {
      conversationId: conversation._id.toString(),
      message: this.serializeMessage(message),
    });
    this.realtime.emit(businessId, 'conversation_updated', {
      conversation: this.serializeConversation(conversation),
    });

    if (message.messageType === MessageType.TEXT && message.text?.trim()) {
      void this.generateDraft(
        businessId,
        conversation._id.toString(),
        message._id.toString(),
      ).catch((error) =>
        this.logger.error(
          `AI draft generation failed for message ${message._id.toString()}: ${error}`,
        ),
      );
    }

    return conversation;
  }

  async listConversations(businessId: string): Promise<ConversationDocument[]> {
    return this.conversations
      .find({ businessId })
      .sort({ latestMessageAt: -1 })
      .limit(200)
      .lean();
  }

  async getConversationHistory(
    businessId: string,
    conversationId: string,
  ): Promise<{
    conversation: ConversationDocument;
    messages: Record<string, unknown>[];
    draft: Record<string, unknown> | null;
  }> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conversation = await this.conversations.findOne({
      _id: conversationId,
      businessId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await conversation.save();
      this.realtime.emit(businessId, 'conversation_updated', {
        conversation: this.serializeConversation(conversation),
      });
    }

    const [messages, draft] = await Promise.all([
      this.messages
        .find({ businessId, conversationId })
        .sort({ providerTimestamp: 1, createdAt: 1 })
        .limit(500)
        .lean(),
      this.drafts
        .findOne({
          businessId,
          conversationId,
          status: {
            $in: [...ACTIVE_DRAFT_STATUSES, 'failed', 'rejected'],
          },
        })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      conversation,
      messages: messages.map((m) => this.stripLean(m)),
      draft: draft ? this.stripLean(draft) : null,
    };
  }

  async generateDraft(
    businessId: string,
    conversationId: string,
    sourceMessageId?: string,
  ): Promise<Record<string, unknown>> {
    const isExplicitRegeneration = !sourceMessageId;
    const conversation = await this.conversations.findOne({
      _id: conversationId,
      businessId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const source = sourceMessageId
      ? await this.messages.findOne({
          _id: sourceMessageId,
          businessId,
          conversationId,
          direction: MessageDirection.INBOUND,
        })
      : await this.messages
          .findOne({
            businessId,
            conversationId,
            direction: MessageDirection.INBOUND,
          })
          .sort({ providerTimestamp: -1, createdAt: -1 });

    if (!source) {
      throw new BadRequestException('No customer message is available');
    }
    if (source.messageType !== MessageType.TEXT || !source.text?.trim()) {
      throw new BadRequestException(
        'AI suggestions are only available for text messages',
      );
    }

    const existingActive = await this.drafts.findOne({
      businessId,
      conversationId,
      status: { $in: [...ACTIVE_DRAFT_STATUSES] },
    });

    if (existingActive) {
      if (
        sourceMessageId &&
        existingActive.sourceMessageId.toString() === source._id.toString()
      ) {
        return this.serializeDraft(existingActive);
      }
      if (!sourceMessageId) {
        // Explicit regeneration: retire the previous suggestion first.
        existingActive.status = 'rejected';
        existingActive.active = false;
        existingActive.reviewedAt = new Date();
        await existingActive.save();
      } else {
        // Automatic trigger while another draft is active: avoid piling up
        // confusing drafts for rapid consecutive customer messages.
        this.logger.log(
          `Skipping automatic AI draft for conversation ${conversationId}; a draft is already ${existingActive.status}`,
        );
        return this.serializeDraft(existingActive);
      }
    }

    let draft: AiReplyDraftDocument;
    try {
      draft = await this.drafts.create({
        businessId,
        conversationId,
        sourceMessageId: source._id,
        status: 'generating',
        active: true,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const duplicate = await this.drafts.findOne({
          sourceMessageId: source._id,
          status: { $in: [...ACTIVE_DRAFT_STATUSES] },
        });
        if (duplicate) return this.serializeDraft(duplicate);
      }
      throw error;
    }

    this.realtime.emit(businessId, 'draft_updated', {
      conversationId,
      draft: this.serializeDraft(draft),
    });

    try {
      const recent = await this.messages
        .find({
          businessId,
          conversationId,
          messageType: MessageType.TEXT,
          text: { $exists: true, $ne: '' },
        })
        .sort({ providerTimestamp: -1, createdAt: -1 })
        .limit(WHATSAPP_INBOX_CONSTANTS.RECENT_MESSAGES_FOR_AI)
        .lean();

      const transcript = recent.reverse().map((m) => ({
        role:
          m.direction === MessageDirection.INBOUND
            ? ('customer' as const)
            : ('agent' as const),
        text: m.text || '',
      }));

      const text = await this.llm.generateWhatsAppReply(transcript);

      draft.originalText = text.slice(0, 4096);
      draft.status = 'waiting_for_approval';
      draft.generatedAt = new Date();
      await draft.save();

      this.logger.log(
        `AI reply draft generated for conversation ${conversationId}`,
      );
    } catch (error) {
      draft.status = 'failed';
      draft.active = false;
      draft.generationError =
        error instanceof Error
          ? error.message.slice(0, 300)
          : 'AI generation failed';
      await draft.save();
      this.realtime.emit(businessId, 'draft_updated', {
        conversationId,
        draft: this.serializeDraft(draft),
      });
      throw error;
    }

    this.realtime.emit(businessId, 'draft_updated', {
      conversationId,
      draft: this.serializeDraft(draft),
    });

    await this.audit
      .log({
        businessId,
        userId: draft.reviewedByUserId?.toString() || businessId,
        entityType: 'AiReplyDraft',
        entityId: draft._id.toString(),
        action: isExplicitRegeneration
          ? WHATSAPP_AUDIT_ACTIONS.AI_DRAFT_REGENERATED
          : WHATSAPP_AUDIT_ACTIONS.AI_DRAFT_GENERATED,
        newValues: { sourceMessageId: source._id.toString() },
      })
      .catch((error) =>
        this.logger.warn(`Failed to write draft audit entry: ${error}`),
      );

    return this.serializeDraft(draft);
  }

  async rejectDraft(
    businessId: string,
    userId: string,
    draftId: string,
  ): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(draftId)) {
      throw new BadRequestException('Invalid draft ID');
    }

    const draft = await this.drafts.findOneAndUpdate(
      { _id: draftId, businessId, status: 'waiting_for_approval' },
      {
        status: 'rejected',
        active: false,
        reviewedByUserId: new Types.ObjectId(userId),
        reviewedAt: new Date(),
      },
      { new: true },
    );
    if (!draft) {
      throw new ConflictException('Draft is not waiting for approval');
    }

    await this.audit.log({
      businessId,
      userId,
      entityType: 'AiReplyDraft',
      entityId: draftId,
      action: WHATSAPP_AUDIT_ACTIONS.AI_DRAFT_REJECTED,
      oldValues: { status: 'waiting_for_approval' },
      newValues: { status: 'rejected' },
    });

    this.realtime.emit(businessId, 'draft_updated', {
      conversationId: draft.conversationId.toString(),
      draft: this.serializeDraft(draft),
    });

    return this.serializeDraft(draft);
  }

  async approveAndSendDraft(
    businessId: string,
    userId: string,
    draftId: string,
    finalText: string,
  ): Promise<{ draft: AiReplyDraftDocument; message: MessageEventDocument }> {
    if (!Types.ObjectId.isValid(draftId)) {
      throw new BadRequestException('Invalid draft ID');
    }

    const draft = await this.drafts.findOne({
      _id: draftId,
      businessId,
      status: 'waiting_for_approval',
    });
    if (!draft) {
      throw new ConflictException('Draft was already reviewed or sent');
    }

    const conversation = await this.conversations.findOne({
      _id: draft.conversationId,
      businessId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.assertWithinServiceWindow(conversation);

    // Atomic transition guards against double-click / duplicate submissions.
    const claimed = await this.drafts.findOneAndUpdate(
      { _id: draftId, status: 'waiting_for_approval' },
      {
        $set: {
          status: 'approved',
          active: false,
          finalText,
          reviewedByUserId: new Types.ObjectId(userId),
          reviewedAt: new Date(),
          humanEdited: finalText.trim() !== (draft.originalText || '').trim(),
        },
      },
      { new: true },
    );
    if (!claimed) {
      throw new ConflictException('Draft was already reviewed or sent');
    }

    try {
      const message = await this.whatsapp.sendTextMessage(
        businessId,
        conversation.customerPhone,
        finalText,
        {
          conversationId: conversation._id,
          senderType: 'ai',
          originatedFromAi: true,
          humanEdited: claimed.humanEdited,
        },
      );

      claimed.outgoingMessageId = message._id;
      claimed.sentAt = message.sentAt || new Date();
      await claimed.save();

      await this.touchConversation(conversation, finalText, claimed.sentAt);

      await this.audit.log({
        businessId,
        userId,
        entityType: 'AiReplyDraft',
        entityId: draftId,
        action: WHATSAPP_AUDIT_ACTIONS.AI_DRAFT_APPROVED_SENT,
        newValues: {
          humanEdited: claimed.humanEdited,
          outgoingMessageId: message._id.toString(),
          originalTextPreview: (draft.originalText || '').slice(0, 200),
          finalTextPreview: finalText.slice(0, 200),
        },
      });

      this.emitMessageAndConversation(businessId, message, conversation);

      return { draft: claimed, message };
    } catch (error) {
      // Sending failed: restore the draft so the operator can safely retry.
      claimed.status = 'waiting_for_approval';
      claimed.finalText = undefined;
      claimed.sentAt = undefined;
      claimed.outgoingMessageId = undefined;
      await claimed.save();
      this.logger.error(`Failed to send approved draft ${draftId}: ${error}`);
      throw new BadRequestException(
        error instanceof Error
          ? `WhatsApp send failed: ${error.message}`
          : 'WhatsApp send failed',
      );
    }
  }

  async sendManualReply(
    businessId: string,
    userId: string,
    conversationId: string,
    text: string,
  ): Promise<MessageEventDocument> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conversation = await this.conversations.findOne({
      _id: conversationId,
      businessId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.assertWithinServiceWindow(conversation);

    const message = await this.whatsapp.sendTextMessage(
      businessId,
      conversation.customerPhone,
      text,
      { conversationId: conversation._id, senderType: 'human_agent' },
    );

    await this.touchConversation(
      conversation,
      text,
      message.sentAt || new Date(),
    );

    await this.audit.log({
      businessId,
      userId,
      entityType: 'MessageEvent',
      entityId: message._id.toString(),
      action: WHATSAPP_AUDIT_ACTIONS.MANUAL_REPLY_SENT,
      newValues: { conversationId },
    });

    this.emitMessageAndConversation(businessId, message, conversation);

    return message;
  }

  notifyDeliveryStatus(
    businessId: string,
    providerMessageId: string,
    status: DeliveryStatus,
  ): void {
    this.realtime.emit(businessId, 'message_status', {
      providerMessageId,
      status,
    });
  }

  private assertWithinServiceWindow(conversation: ConversationDocument): void {
    const lastCustomerMessageAt =
      conversation.lastCustomerMessageAt || conversation.latestMessageAt;

    if (
      !lastCustomerMessageAt ||
      Date.now() - lastCustomerMessageAt.getTime() >
        WHATSAPP_INBOX_CONSTANTS.CUSTOMER_SERVICE_WINDOW_MS
    ) {
      throw new BadRequestException(
        'The 24-hour WhatsApp customer service window for this customer has closed. An approved WhatsApp template message is required before free-form replies can be delivered.',
      );
    }
  }

  private async touchConversation(
    conversation: ConversationDocument,
    text: string,
    at: Date,
  ): Promise<void> {
    conversation.latestMessagePreview = text.slice(
      0,
      WHATSAPP_INBOX_CONSTANTS.MAX_MESSAGE_PREVIEW_LENGTH,
    );
    conversation.latestMessageAt = at;
    await conversation.save();
  }

  private emitMessageAndConversation(
    businessId: string,
    message: MessageEventDocument,
    conversation: ConversationDocument,
  ): void {
    this.realtime.emit(businessId, 'message_created', {
      conversationId: conversation._id.toString(),
      message: this.serializeMessage(message),
    });
    this.realtime.emit(businessId, 'conversation_updated', {
      conversation: this.serializeConversation(conversation),
    });
  }

  private serializeConversation(
    conversation: ConversationDocument,
  ): Record<string, unknown> {
    return {
      id: conversation._id.toString(),
      customerPhone: conversation.customerPhone,
      customerName: conversation.customerName,
      status: conversation.status,
      unreadCount: conversation.unreadCount,
      latestMessagePreview: conversation.latestMessagePreview,
      latestMessageAt: conversation.latestMessageAt,
      lastCustomerMessageAt: conversation.lastCustomerMessageAt,
    };
  }

  private serializeMessage(
    message: MessageEventDocument,
  ): Record<string, unknown> {
    return {
      id: message._id.toString(),
      conversationId: message.conversationId?.toString(),
      direction: message.direction,
      senderPhone: message.senderPhone,
      recipientPhone: message.recipientPhone,
      senderType: message.senderType,
      messageType: message.messageType,
      text: message.text,
      originatedFromAi: message.originatedFromAi,
      humanEdited: message.humanEdited,
      deliveryStatus: message.deliveryStatus,
      providerMessageId: message.providerMessageId,
      timestamp: message.providerTimestamp || message.sentAt || new Date(),
    };
  }

  private serializeDraft(draft: AiReplyDraftDocument): Record<string, unknown> {
    return {
      id: draft._id.toString(),
      conversationId: draft.conversationId.toString(),
      sourceMessageId: draft.sourceMessageId.toString(),
      status: draft.status,
      originalText: draft.originalText,
      finalText: draft.finalText,
      generationError: draft.generationError,
      humanEdited: draft.humanEdited,
      generatedAt: draft.generatedAt,
      reviewedAt: draft.reviewedAt,
      sentAt: draft.sentAt,
    };
  }

  private stripLean(doc: unknown): Record<string, unknown> {
    if (!doc) return {};
    const { __v, ...rest } = doc as Record<string, unknown>;
    void __v;
    if (rest._id instanceof Types.ObjectId) {
      rest._id = rest._id.toString();
    }
    return rest;
  }
}
