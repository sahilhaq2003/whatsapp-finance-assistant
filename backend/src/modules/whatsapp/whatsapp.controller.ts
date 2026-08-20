import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import type {
  AuthenticatedUser,
  BusinessContext,
} from '../auth/interfaces/authenticated-request.interface';
import { AuditService } from '../audit/audit.service';
import { CreateWhatsAppConnectionDto } from './dto/create-whatsapp-connection.dto';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsAppWebhookService } from './services/whatsapp-webhook.service';
import { WhatsAppMessageService } from './services/whatsapp-message.service';
import { WhatsAppPairingService } from './services/whatsapp-pairing.service';
import { WhatsAppBusinessResolverService } from './services/whatsapp-business-resolver.service';
import { WHATSAPP_AUDIT_ACTIONS } from './whatsapp.constants';
import {
  WhatsAppConnection,
  WhatsAppConnectionDocument,
} from './schemas/whatsapp-connection.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppConnectionStatus } from '../../common/enums/whatsapp-connection-status.enum';
import { BusinessRole } from '../../common/enums/business-role.enum';
import { MetaWhatsAppProviderService } from './services/whatsapp-provider.service';
import { ConfigService } from '@nestjs/config';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly webhookService: WhatsAppWebhookService,
    private readonly messageService: WhatsAppMessageService,
    private readonly pairingService: WhatsAppPairingService,
    private readonly businessResolver: WhatsAppBusinessResolverService,
    private readonly auditService: AuditService,
    private readonly providerService: MetaWhatsAppProviderService,
    private readonly configService: ConfigService,
    @InjectModel(WhatsAppConnection.name)
    private connectionModel: Model<WhatsAppConnectionDocument>,
  ) {}

  @Get('webhook-url')
  getWebhookUrl() {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5000';
    const publicUrl = this.configService.get<string>('PUBLIC_URL') || baseUrl.replace(':3000', ':5000');
    return {
      success: true,
      data: { url: `${publicUrl}/api/whatsapp/webhook` },
    };
  }

  @Get('webhook')
  handleWebhookVerification(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.webhookService.verifyWebhook(mode, token, challenge);
    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody?: string | Buffer },
    @Body() body: Record<string, unknown>,
  ) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.warn('Webhook received without raw body');
      return { status: 'error', message: 'Missing raw body' };
    }

    if (!this.webhookService.verifySignature(rawBody, signature)) {
      this.logger.warn('Webhook signature verification failed');
      return { status: 'error', message: 'Invalid signature' };
    }

    try {
      await this.webhookService.processWebhookEvent(body as never);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error}`);
      return { status: 'ok' };
    }
  }

  @Get('connection')
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async getConnection(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    const connection = await this.businessResolver.resolveByBusinessId(
      business.businessId,
    );

    if (!connection) {
      return {
        success: true,
        data: { connected: false, status: 'not_configured' },
      };
    }

    const hasAuthorizedSender = await this.businessResolver.hasAuthorizedSender(
      business.businessId,
      connection.phoneNumberId,
    );

    return {
      success: true,
      data: {
        connected: connection.status === WhatsAppConnectionStatus.CONNECTED,
        status: connection.status,
        displayPhoneNumber: connection.displayPhoneNumber,
        businessPhoneE164: connection.businessPhoneE164,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        pairedSender: hasAuthorizedSender,
        connectedAt: connection.connectedAt,
      },
    };
  }

  @Post('connection')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async createConnection(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: CreateWhatsAppConnectionDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    if (
      business.role !== BusinessRole.OWNER &&
      business.role !== BusinessRole.ADMIN
    ) {
      return {
        success: false,
        message: 'Only OWNER or ADMIN can configure WhatsApp',
      };
    }

    if (
      dto.wabaId === 'pending' ||
      dto.phoneNumberId.startsWith('pending_')
    ) {
      throw new BadRequestException(
        'Enter the real Meta WhatsApp Business Account ID and Phone Number ID before creating a connection',
      );
    }

    const existing = await this.connectionModel.findOne({
      phoneNumberId: dto.phoneNumberId,
    });

    if (existing) {
      return {
        success: false,
        message: 'This phone number is already connected to a business',
      };
    }

    const connection = await this.connectionModel.create({
      businessId: business.businessId,
      wabaId: dto.wabaId,
      phoneNumberId: dto.phoneNumberId,
      displayPhoneNumber: dto.displayPhoneNumber,
      businessPhoneE164: dto.businessPhoneE164,
      status: WhatsAppConnectionStatus.CONNECTED,
      isActive: true,
      connectedAt: new Date(),
      connectedByUserId: user.userId,
    });

    await this.auditService.log({
      businessId: business.businessId,
      userId: user.userId,
      entityType: 'WhatsAppConnection',
      entityId: connection._id.toString(),
      action: WHATSAPP_AUDIT_ACTIONS.CONNECTION_CREATED,
      newValues: {
        phoneNumberId: dto.phoneNumberId,
        displayPhoneNumber: dto.displayPhoneNumber,
      },
    });

    return {
      success: true,
      message: 'WhatsApp connection created successfully',
      data: {
        id: connection._id,
        status: connection.status,
        displayPhoneNumber: connection.displayPhoneNumber,
      },
    };
  }

  @Delete('connection')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async disconnectConnection(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    if (
      business.role !== BusinessRole.OWNER &&
      business.role !== BusinessRole.ADMIN
    ) {
      return {
        success: false,
        message: 'Only OWNER or ADMIN can disconnect WhatsApp',
      };
    }

    const connection = await this.connectionModel.findOneAndUpdate(
      {
        businessId: business.businessId,
        isActive: true,
      },
      {
        status: WhatsAppConnectionStatus.DISCONNECTED,
        isActive: false,
      },
      { new: true },
    );

    if (!connection) {
      return { success: false, message: 'No active WhatsApp connection found' };
    }

    await this.auditService.log({
      businessId: business.businessId,
      userId: user.userId,
      entityType: 'WhatsAppConnection',
      entityId: connection._id.toString(),
      action: WHATSAPP_AUDIT_ACTIONS.CONNECTION_DISCONNECTED,
      oldValues: { status: WhatsAppConnectionStatus.CONNECTED },
      newValues: { status: WhatsAppConnectionStatus.DISCONNECTED },
    });

    return {
      success: true,
      message: 'WhatsApp connection disconnected',
    };
  }

  @Post('pairing-code')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async generatePairingCode(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    if (
      business.role !== BusinessRole.OWNER &&
      business.role !== BusinessRole.ADMIN
    ) {
      return {
        success: false,
        message: 'Only OWNER or ADMIN can generate pairing codes',
      };
    }

    const connection = await this.businessResolver.resolveByBusinessId(
      business.businessId,
    );

    if (!connection) {
      return {
        success: false,
        message: 'Configure WhatsApp connection before generating pairing codes',
      };
    }

    const result = await this.pairingService.generatePairingCode(
      business.businessId,
      user.userId,
    );

    await this.auditService.log({
      businessId: business.businessId,
      userId: user.userId,
      entityType: 'WhatsAppPairingCode',
      action: WHATSAPP_AUDIT_ACTIONS.PAIRING_CODE_CREATED,
      newValues: {
        expiresInSeconds: result.expiresInSeconds,
      },
    });

    return {
      success: true,
      message: 'WhatsApp pairing code generated',
      data: {
        code: result.code,
        expiresInSeconds: result.expiresInSeconds,
        displayPhoneNumber: connection.displayPhoneNumber,
      },
    };
  }

  @Post('test-message')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, BusinessAccessGuard)
  async sendTestMessage(
    @CurrentUser() user: AuthenticatedUser | null,
    @CurrentBusiness() business: BusinessContext | undefined,
    @Body() dto: SendWhatsAppMessageDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }

    if (
      business.role !== BusinessRole.OWNER &&
      business.role !== BusinessRole.ADMIN
    ) {
      return {
        success: false,
        message: 'Only OWNER or ADMIN can send test messages',
      };
    }

    const messageEvent = await this.messageService.sendTextMessage(
      business.businessId,
      dto.recipientPhone,
      dto.message,
    );

    await this.auditService.log({
      businessId: business.businessId,
      userId: user.userId,
      entityType: 'MessageEvent',
      entityId: messageEvent._id.toString(),
      action: WHATSAPP_AUDIT_ACTIONS.TEST_MESSAGE_SENT,
      newValues: {
        recipientPhone: dto.recipientPhone,
        providerMessageId: messageEvent.providerMessageId,
      },
    });

    return {
      success: true,
      message: 'Test message sent successfully',
      data: {
        providerMessageId: messageEvent.providerMessageId,
        sentAt: messageEvent.sentAt,
      },
    };
  }
}
