import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WhatsAppConnection,
  WhatsAppConnectionDocument,
} from '../schemas/whatsapp-connection.schema';
import {
  WhatsAppAuthorizedSender,
  WhatsAppAuthorizedSenderDocument,
} from '../schemas/whatsapp-authorized-sender.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { SenderStatus } from '../../../common/enums/sender-status.enum';
import { WhatsAppConnectionStatus } from '../../../common/enums/whatsapp-connection-status.enum';

export interface ResolvedBusinessConnection {
  connection: WhatsAppConnectionDocument;
  business: BusinessDocument;
}

@Injectable()
export class WhatsAppBusinessResolverService {
  private readonly logger = new Logger(WhatsAppBusinessResolverService.name);

  constructor(
    @InjectModel(WhatsAppConnection.name)
    private connectionModel: Model<WhatsAppConnectionDocument>,
    @InjectModel(WhatsAppAuthorizedSender.name)
    private senderModel: Model<WhatsAppAuthorizedSenderDocument>,
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
  ) {}

  async resolveByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<ResolvedBusinessConnection | null> {
    const connection = await this.connectionModel.findOne({
      phoneNumberId,
      isActive: true,
      status: WhatsAppConnectionStatus.CONNECTED,
    });

    if (!connection) {
      this.logger.warn(
        `No connected WhatsApp connection found for phoneNumberId: ${phoneNumberId}`,
      );
      return null;
    }

    const business = await this.businessModel.findById(connection.businessId);

    if (!business) {
      this.logger.error(
        `Business not found for connection: ${connection._id}`,
      );
      return null;
    }

    return { connection, business };
  }

  async resolveByBusinessId(
    businessId: string,
  ): Promise<WhatsAppConnectionDocument | null> {
    return this.connectionModel.findOne({
      businessId: new Types.ObjectId(businessId),
      isActive: true,
      status: WhatsAppConnectionStatus.CONNECTED,
    });
  }

  async findAuthorizedSender(
    businessId: string,
    phoneE164: string,
  ): Promise<WhatsAppAuthorizedSenderDocument | null> {
    return this.senderModel.findOne({
      businessId: new Types.ObjectId(businessId),
      phoneE164,
      status: SenderStatus.VERIFIED,
    });
  }

  async hasAuthorizedSender(
    businessId: string,
    phoneNumberId: string,
  ): Promise<boolean> {
    const connection = await this.connectionModel.findOne({
      businessId: new Types.ObjectId(businessId),
      phoneNumberId,
      isActive: true,
      status: WhatsAppConnectionStatus.CONNECTED,
    });

    if (!connection) return false;

    const sender = await this.senderModel.findOne({
      businessId: new Types.ObjectId(businessId),
      whatsappConnectionId: connection._id,
      status: SenderStatus.VERIFIED,
    });

    return !!sender;
  }
}
