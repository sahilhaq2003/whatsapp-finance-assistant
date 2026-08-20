import { MessageDirection } from '../../../common/enums/message-direction.enum';
import { MessageType } from '../../../common/enums/message-type.enum';
import { MessageProcessingStatus } from '../../../common/enums/message-processing-status.enum';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';
import { WhatsAppProvider } from '../../../common/enums/whatsapp-provider.enum';

export interface ParsedIncomingMessage {
  phoneNumberId: string;
  senderPhone: string;
  recipientPhone: string;
  providerMessageId: string;
  messageType: MessageType;
  text?: string;
  mediaId?: string;
  timestamp: Date;
  replyContext?: {
    from: string;
    id: string;
  };
}

export interface ParsedStatusUpdate {
  phoneNumberId: string;
  recipientPhone: string;
  providerMessageId: string;
  status: DeliveryStatus;
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface OutboundMessageParams {
  businessId: string;
  recipientPhone: string;
  text: string;
}

export interface OutboundMessageResult {
  providerMessageId: string;
  sentAt: Date;
}
