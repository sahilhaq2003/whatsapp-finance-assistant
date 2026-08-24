export enum WhatsAppConnectionStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export interface WhatsAppConnection {
  connected: boolean;
  status: WhatsAppConnectionStatus | 'not_configured';
  displayPhoneNumber?: string;
  businessPhoneE164?: string;
  wabaId?: string;
  phoneNumberId?: string;
  pairedSender?: boolean;
  connectedAt?: string;
}

export interface CreateWhatsAppConnectionRequest {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  businessPhoneE164: string;
}

export interface PairingCodeResponse {
  code: string;
  expiresInSeconds: number;
  displayPhoneNumber: string;
}

export interface SendTestMessageRequest {
  recipientPhone: string;
  message: string;
}

export interface SendTestMessageResponse {
  providerMessageId: string;
  sentAt: string;
}

export interface InboxConversation {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: 'open' | 'closed';
  unreadCount: number;
  latestMessagePreview?: string;
  latestMessageAt?: string;
  lastCustomerMessageAt?: string;
}

export type InboxDraftStatus =
  | 'generating'
  | 'waiting_for_approval'
  | 'approved'
  | 'rejected'
  | 'failed';

export interface InboxAiDraft {
  id: string;
  conversationId?: string;
  status: InboxDraftStatus;
  originalText?: string;
  generationError?: string;
  humanEdited: boolean;
  generatedAt?: string;
}

export type InboxDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface InboxMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  senderPhone: string;
  senderType?: 'customer' | 'human_agent' | 'ai';
  messageType: string;
  text?: string;
  deliveryStatus?: InboxDeliveryStatus;
  providerMessageId?: string;
  originatedFromAi: boolean;
  humanEdited: boolean;
  timestamp: string;
}
