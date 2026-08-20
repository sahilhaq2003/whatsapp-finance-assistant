import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WhatsAppPairingCode,
  WhatsAppPairingCodeDocument,
} from '../schemas/whatsapp-pairing-code.schema';
import {
  WhatsAppAuthorizedSender,
  WhatsAppAuthorizedSenderDocument,
} from '../schemas/whatsapp-authorized-sender.schema';
import {
  WhatsAppConnection,
  WhatsAppConnectionDocument,
} from '../schemas/whatsapp-connection.schema';
import { SenderStatus } from '../../../common/enums/sender-status.enum';
import { WHATSAPP_CONSTANTS } from '../whatsapp.constants';
import * as crypto from 'crypto';

export interface PairingCodeResult {
  code: string;
  expiresInSeconds: number;
}

@Injectable()
export class WhatsAppPairingService {
  private readonly logger = new Logger(WhatsAppPairingService.name);

  constructor(
    @InjectModel(WhatsAppPairingCode.name)
    private pairingCodeModel: Model<WhatsAppPairingCodeDocument>,
    @InjectModel(WhatsAppAuthorizedSender.name)
    private senderModel: Model<WhatsAppAuthorizedSenderDocument>,
    @InjectModel(WhatsAppConnection.name)
    private connectionModel: Model<WhatsAppConnectionDocument>,
  ) {}

  async generatePairingCode(
    businessId: string,
    userId: string,
  ): Promise<PairingCodeResult> {
    const code = this.generateCode();
    const codeHash = this.hashCode(code);

    const expiresAt = new Date(
      Date.now() + WHATSAPP_CONSTANTS.PAIRING_CODE_EXPIRY_MS,
    );

    await this.pairingCodeModel.create({
      businessId,
      userId,
      codeHash,
      expiresAt,
    });

    return {
      code,
      expiresInSeconds: WHATSAPP_CONSTANTS.PAIRING_CODE_EXPIRY_MINUTES * 60,
    };
  }

  async validatePairingCode(params: {
    businessId: string;
    senderPhoneE164: string;
    code: string;
  }): Promise<{
    success: boolean;
    sender?: WhatsAppAuthorizedSenderDocument;
    error?: string;
  }> {
    const { businessId, senderPhoneE164, code } = params;

    const cleanCode = code.trim().toUpperCase();
    const codeHash = this.hashCode(cleanCode);

    const pairingCode = await this.pairingCodeModel.findOne({
      businessId,
      codeHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!pairingCode) {
      return { success: false, error: 'Invalid or expired pairing code' };
    }

    const connection = await this.connectionModel.findOne({
      businessId,
      isActive: true,
    });

    if (!connection) {
      return { success: false, error: 'No active WhatsApp connection found' };
    }

    const existingSender = await this.senderModel.findOne({
      businessId,
      phoneE164: senderPhoneE164,
      status: SenderStatus.VERIFIED,
    });

    if (existingSender) {
      pairingCode.usedAt = new Date();
      await pairingCode.save();
      return {
        success: true,
        sender: existingSender,
      };
    }

    const sender = await this.senderModel.create({
      businessId,
      userId: pairingCode.userId,
      whatsappConnectionId: connection._id,
      phoneE164: senderPhoneE164,
      status: SenderStatus.VERIFIED,
      verifiedAt: new Date(),
    });

    pairingCode.usedAt = new Date();
    pairingCode.usedBySenderId = sender._id;
    await pairingCode.save();

    this.logger.log(
      `Pairing completed for business ${businessId}, sender ${senderPhoneE164}`,
    );

    return { success: true, sender };
  }

  private generateCode(): string {
    const digits = crypto
      .randomBytes(WHATSAPP_CONSTANTS.PAIRING_CODE_LENGTH)
      .toString('hex')
      .slice(0, WHATSAPP_CONSTANTS.PAIRING_CODE_LENGTH)
      .toUpperCase();
    return `${WHATSAPP_CONSTANTS.PAIRING_CODE_PREFIX}${digits}`;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
