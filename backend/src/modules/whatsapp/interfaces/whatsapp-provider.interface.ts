export interface WhatsAppProviderAdapter {
  sendTextMessage(params: {
    phoneNumberId: string;
    recipientPhone: string;
    text: string;
  }): Promise<{ providerMessageId: string; sentAt: Date }>;

  sendTemplateMessage(params: {
    phoneNumberId: string;
    recipientPhone: string;
    templateName: string;
    templateLanguage: string;
    templateComponents?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  }): Promise<{ providerMessageId: string; sentAt: Date }>;

  markMessageAsRead(params: {
    phoneNumberId: string;
    messageId: string;
  }): Promise<void>;

  getMediaMetadata(params: {
    mediaId: string;
  }): Promise<{
    mimeType: string;
    fileSize: number;
    url: string;
  }>;

  downloadMedia(params: {
    mediaUrl: string;
  }): Promise<Buffer>;

  verifyWebhookSignature(params: {
    body: string | Buffer;
    signature: string | undefined;
    appSecret: string;
  }): boolean;
}
