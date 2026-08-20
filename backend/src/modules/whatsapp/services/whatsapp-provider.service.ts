import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { WhatsAppProviderAdapter } from '../interfaces/whatsapp-provider.interface';
import { WHATSAPP_CONSTANTS } from '../whatsapp.constants';

@Injectable()
export class MetaWhatsAppProviderService implements WhatsAppProviderAdapter {
  private readonly logger = new Logger(MetaWhatsAppProviderService.name);
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly appSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.apiVersion =
      this.configService.get<string>('WHATSAPP_API_VERSION') ||
      WHATSAPP_CONSTANTS.GRAPH_API_VERSION;
    this.baseUrl =
      this.configService.get<string>('WHATSAPP_GRAPH_BASE_URL') ||
      WHATSAPP_CONSTANTS.GRAPH_BASE_URL;
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET') || '';
  }

  async sendTextMessage(params: {
    phoneNumberId: string;
    recipientPhone: string;
    text: string;
  }): Promise<{ providerMessageId: string; sentAt: Date }> {
    const { phoneNumberId, recipientPhone, text } = params;

    const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Meta API send message failed: ${response.status} - ${errorBody}`,
      );
      throw new Error(`Meta API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
    };

    const providerMessageId = data.messages?.[0]?.id;
    if (!providerMessageId) {
      throw new Error('No provider message ID returned from Meta API');
    }

    return {
      providerMessageId,
      sentAt: new Date(),
    };
  }

  async sendTemplateMessage(params: {
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
  }): Promise<{ providerMessageId: string; sentAt: Date }> {
    const { phoneNumberId, recipientPhone, templateName, templateLanguage, templateComponents } = params;

    const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
      },
    };

    if (templateComponents && templateComponents.length > 0) {
      (body.template as Record<string, unknown>).components = templateComponents;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Meta API send template failed: ${response.status} - ${errorBody}`,
      );
      throw new Error(`Meta API template error: ${response.status}`);
    }

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
    };

    const providerMessageId = data.messages?.[0]?.id;
    if (!providerMessageId) {
      throw new Error('No provider message ID returned from Meta API template');
    }

    return {
      providerMessageId,
      sentAt: new Date(),
    };
  }

  async markMessageAsRead(params: {
    phoneNumberId: string;
    messageId: string;
  }): Promise<void> {
    const { phoneNumberId, messageId } = params;

    const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to mark message ${messageId} as read: ${error}`,
      );
    }
  }

  async getMediaMetadata(params: {
    mediaId: string;
  }): Promise<{ mimeType: string; fileSize: number; url: string }> {
    const { mediaId } = params;

    const url = `${this.baseUrl}/${this.apiVersion}/${mediaId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Meta API get media metadata failed: ${response.status} - ${errorBody}`,
      );
      throw new Error(`Meta API media metadata error: ${response.status}`);
    }

    const data = await response.json() as {
      mime_type: string;
      file_size: string;
      url: string;
    };

    return {
      mimeType: data.mime_type,
      fileSize: parseInt(data.file_size, 10),
      url: data.url,
    };
  }

  async downloadMedia(params: {
    mediaUrl: string;
  }): Promise<Buffer> {
    const { mediaUrl } = params;

    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      this.logger.error(
        `Meta API download media failed: ${response.status}`,
      );
      throw new Error(`Meta API media download error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  verifyWebhookSignature(params: {
    body: string | Buffer;
    signature: string | undefined;
    appSecret: string;
  }): boolean {
    const { body, signature, appSecret } = params;

    if (!signature) {
      return false;
    }

    const expectedPrefix = 'sha256=';
    if (!signature.startsWith(expectedPrefix)) {
      return false;
    }

    const signatureHash = signature.slice(expectedPrefix.length);

    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(body);
    const calculatedHash = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(calculatedHash, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
