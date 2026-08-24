import { api } from '@/lib/api-client';
import type {
  WhatsAppConnection,
  CreateWhatsAppConnectionRequest,
  PairingCodeResponse,
  SendTestMessageRequest,
  SendTestMessageResponse,
  InboxConversation,
  InboxMessage,
  InboxAiDraft,
} from '@/types/whatsapp';
import type { ApiResponse } from '@/types/auth';

export interface InboxConversationHistory {
  conversation: InboxConversation;
  messages: InboxMessage[];
  draft: InboxAiDraft | null;
}

export const whatsappService = {
  getConnection: () =>
    api.get<ApiResponse<WhatsAppConnection>>('/whatsapp/connection'),

  createConnection: (data: CreateWhatsAppConnectionRequest) =>
    api.post<ApiResponse<{ id: string; status: string; displayPhoneNumber: string }>>(
      '/whatsapp/connection',
      data,
    ),

  disconnectConnection: () =>
    api.delete<ApiResponse<null>>('/whatsapp/connection'),

  generatePairingCode: () =>
    api.post<ApiResponse<PairingCodeResponse>>('/whatsapp/pairing-code'),

  sendTestMessage: (data: SendTestMessageRequest) =>
    api.post<ApiResponse<SendTestMessageResponse>>('/whatsapp/test-message', data),

  getWebhookUrl: () =>
    api.get<ApiResponse<{ url: string }>>('/whatsapp/webhook-url'),

  listInboxConversations: () =>
    api.get<ApiResponse<{ conversations: InboxConversation[] }>>(
      '/whatsapp/inbox/conversations',
    ),

  getInboxConversation: (conversationId: string) =>
    api.get<ApiResponse<InboxConversationHistory>>(
      `/whatsapp/inbox/conversations/${conversationId}/messages`,
    ),

  generateInboxDraft: (conversationId: string) =>
    api.post<
      ApiResponse<{
        draft:
          | (InboxAiDraft & {
              finalText?: string;
              reviewedAt?: string;
              sentAt?: string;
            })
          | null;
      }>
    >(`/whatsapp/inbox/conversations/${conversationId}/drafts`),

  rejectInboxDraft: (draftId: string) =>
    api.post<ApiResponse<{ draft: InboxAiDraft }>>(
      `/whatsapp/inbox/drafts/${draftId}/reject`,
    ),

  approveAndSendInboxDraft: (draftId: string, text: string) =>
    api.post<
      ApiResponse<{
        draftId: string;
        outgoingMessageId: string;
        providerMessageId: string;
        sentAt: string;
        humanEdited: boolean;
      }>
    >(`/whatsapp/inbox/drafts/${draftId}/approve-and-send`, { text }),

  sendManualInboxReply: (conversationId: string, text: string) =>
    api.post<
      ApiResponse<{
        messageId: string;
        providerMessageId: string;
        sentAt: string;
      }>
    >(`/whatsapp/inbox/conversations/${conversationId}/send-manual`, { text }),
};
