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
