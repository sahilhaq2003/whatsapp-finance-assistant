import { api } from '@/lib/api-client';
import type {
  WhatsAppConnection,
  CreateWhatsAppConnectionRequest,
  PairingCodeResponse,
  SendTestMessageRequest,
  SendTestMessageResponse,
} from '@/types/whatsapp';
import type { ApiResponse } from '@/types/auth';

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
};
