import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import type {
  AuthenticatedUser,
  BusinessContext,
} from '../auth/interfaces/authenticated-request.interface';
import type { Response } from 'express';
import { WhatsAppInboxService } from './services/whatsapp-inbox.service';
import { WhatsAppRealtimeService } from './services/whatsapp-realtime.service';
import { ReplyTextDto } from './dto/inbox-reply.dto';

@UseGuards(JwtAuthGuard, BusinessAccessGuard)
@Controller('whatsapp/inbox')
export class WhatsAppInboxController {
  constructor(
    private readonly inboxService: WhatsAppInboxService,
    private readonly realtime: WhatsAppRealtimeService,
  ) {}

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const conversations = await this.inboxService.listConversations(
      business.businessId,
    );

    return {
      success: true,
      data: {
        conversations: conversations.map((conversation) => ({
          id: conversation._id.toString(),
          customerPhone: conversation.customerPhone,
          customerName: conversation.customerName,
          status: conversation.status,
          unreadCount: conversation.unreadCount,
          latestMessagePreview: conversation.latestMessagePreview,
          latestMessageAt: conversation.latestMessageAt,
          lastCustomerMessageAt: conversation.lastCustomerMessageAt,
        })),
      },
    };
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('conversationId') conversationId: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const history = await this.inboxService.getConversationHistory(
      business.businessId,
      conversationId,
    );

    return {
      success: true,
      data: {
        conversation: {
          id: history.conversation._id.toString(),
          customerPhone: history.conversation.customerPhone,
          customerName: history.conversation.customerName,
          status: history.conversation.status,
          unreadCount: history.conversation.unreadCount,
          latestMessagePreview: history.conversation.latestMessagePreview,
          latestMessageAt: history.conversation.latestMessageAt,
          lastCustomerMessageAt: history.conversation.lastCustomerMessageAt,
        },
        messages: history.messages.map((message) => ({
          id: String(message._id),
          direction: message.direction,
          senderPhone: message.senderPhone,
          senderType: message.senderType,
          messageType: message.messageType,
          text: message.text,
          deliveryStatus: message.deliveryStatus,
          providerMessageId: message.providerMessageId,
          originatedFromAi: message.originatedFromAi === true,
          humanEdited: message.humanEdited === true,
          timestamp: message.providerTimestamp ?? message.createdAt,
        })),
        draft: history.draft
          ? {
              id: String(history.draft._id),
              status: history.draft.status,
              originalText: history.draft.originalText,
              generationError: history.draft.generationError,
              humanEdited: history.draft.humanEdited === true,
              generatedAt: history.draft.generatedAt,
            }
          : null,
      },
    };
  }

  @Post('conversations/:conversationId/drafts')
  async generateDraft(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('conversationId') conversationId: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const draft = await this.inboxService.generateDraft(
      business.businessId,
      conversationId,
    );

    return {
      success: true,
      message:
        draft.status === 'generating'
          ? 'AI is preparing a suggested reply'
          : 'AI suggestion is ready for review',
      data: { draft },
    };
  }

  @Post('drafts/:draftId/reject')
  async rejectDraft(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('draftId') draftId: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const draft = await this.inboxService.rejectDraft(
      business.businessId,
      user.userId,
      draftId,
    );

    return {
      success: true,
      message: 'AI suggestion rejected',
      data: { draft },
    };
  }

  @Post('drafts/:draftId/approve-and-send')
  async approveAndSend(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('draftId') draftId: string,
    @Body() dto: ReplyTextDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await this.inboxService.approveAndSendDraft(
      business.businessId,
      user.userId,
      draftId,
      dto.text,
    );

    return {
      success: true,
      message: 'Reply approved and sent to the customer',
      data: {
        draftId,
        outgoingMessageId: result.message._id.toString(),
        providerMessageId: result.message.providerMessageId,
        sentAt: result.message.sentAt,
        humanEdited: result.draft.humanEdited,
      },
    };
  }

  @Post('conversations/:conversationId/send-manual')
  async sendManual(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Param('conversationId') conversationId: string,
    @Body() dto: ReplyTextDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const message = await this.inboxService.sendManualReply(
      business.businessId,
      user.userId,
      conversationId,
      dto.text,
    );

    return {
      success: true,
      message: 'Reply sent to the customer',
      data: {
        messageId: message._id.toString(),
        providerMessageId: message.providerMessageId,
        sentAt: message.sentAt,
      },
    };
  }

  @Get('stream')
  stream(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Res() res: Response,
  ): void {
    if (!user || !business) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    this.realtime.subscribe(business.businessId, res);
  }
}
