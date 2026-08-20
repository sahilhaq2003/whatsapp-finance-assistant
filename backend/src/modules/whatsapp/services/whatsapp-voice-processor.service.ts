import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  MessageEvent,
  MessageEventDocument,
} from '../schemas/message-event.schema';
import { MetaWhatsAppProviderService } from './whatsapp-provider.service';
import { SpeechService } from '../../speech/services/speech.service';
import { AiExtractionService } from '../../ai/services/ai-extraction.service';
import { SPEECH_REPLIES } from '../../speech/speech.constants';
import { WHATSAPP_REPLIES } from '../whatsapp.constants';
import { MessageProcessingStatus } from '../../../common/enums/message-processing-status.enum';

export interface VoiceProcessingResult {
  reply: string;
  success: boolean;
}

@Injectable()
export class WhatsAppVoiceProcessorService {
  private readonly logger = new Logger(WhatsAppVoiceProcessorService.name);
  private readonly tempStoragePath: string;
  private readonly deleteAfterProcessing: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(MessageEvent.name)
    private messageEventModel: Model<MessageEventDocument>,
    private readonly providerService: MetaWhatsAppProviderService,
    private readonly speechService: SpeechService,
    private readonly extractionService: AiExtractionService,
  ) {
    this.tempStoragePath = this.configService.get<string>('VOICE_TEMP_STORAGE_PATH') || './storage/temp/voice';
    this.deleteAfterProcessing = this.configService.get<string>('VOICE_DELETE_AFTER_PROCESSING') !== 'false';
    this.ensureTempDirectory();
  }

  async processVoiceMessage(
    messageEvent: MessageEventDocument,
    businessId: string,
    userId: string,
  ): Promise<VoiceProcessingResult> {
    const tempFilePath = await this.downloadAudio(messageEvent);

    try {
      if (!tempFilePath) {
        return { reply: SPEECH_REPLIES.DOWNLOAD_FAILED, success: false };
      }

      await this.updateTranscriptionStatus(messageEvent._id.toString(), 'processing');

      const mimeType = messageEvent.metadata?.mediaMimeType;
      const transcriptionResult = await this.speechService.transcribe(tempFilePath, mimeType);

      if (!transcriptionResult.success) {
        await this.updateTranscriptionStatus(
          messageEvent._id.toString(),
          'failed',
          transcriptionResult.error,
        );
        return { reply: transcriptionResult.reply || SPEECH_REPLIES.TRANSCRIPTION_FAILED, success: false };
      }

      await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
        text: transcriptionResult.transcript,
        'metadata.transcriptionStatus': 'completed',
        'metadata.transcriptionErrorCode': undefined,
      });

      const extractionResult = await this.extractionService.processFinancialMessage(
        messageEvent,
        businessId,
        userId,
        {
          inputSource: 'whatsapp_voice',
          transcript: transcriptionResult.transcript,
          speechConfidence: transcriptionResult.confidence,
        },
      );

      if (extractionResult.proposal) {
        await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
          processingStatus: MessageProcessingStatus.PROCESSED,
        });
      } else {
        await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
          processingStatus: MessageProcessingStatus.PROCESSED,
        });
      }

      return { reply: extractionResult.reply, success: true };
    } catch (error) {
      this.logger.error(`Voice processing failed: ${error}`);
      await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
        processingStatus: MessageProcessingStatus.FAILED,
        processingErrorCode: 'VOICE_PROCESSING_FAILED',
        'metadata.transcriptionStatus': 'failed',
      });
      return { reply: SPEECH_REPLIES.TRANSCRIPTION_FAILED, success: false };
    } finally {
      if (this.deleteAfterProcessing && tempFilePath) {
        this.safeDeleteFile(tempFilePath);
      }
    }
  }

  private async downloadAudio(messageEvent: MessageEventDocument): Promise<string | null> {
    const mediaId = messageEvent.mediaId;
    if (!mediaId) {
      this.logger.error('No mediaId found on message event');
      return null;
    }

    try {
      const metadata = await this.providerService.getMediaMetadata({ mediaId });

      await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
        'metadata.mediaMimeType': metadata.mimeType,
        'metadata.mediaFileSize': metadata.fileSize,
      });

      const buffer = await this.providerService.downloadMedia({ mediaUrl: metadata.url });

      const safeId = messageEvent._id.toString().replace(/[^a-zA-Z0-9]/g, '');
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const ext = this.getExtensionFromMimeType(metadata.mimeType);
      const filename = `voice_${safeId}_${randomSuffix}${ext}`;
      const filePath = path.join(this.tempStoragePath, filename);

      fs.writeFileSync(filePath, buffer);

      return filePath;
    } catch (error) {
      this.logger.error(`Failed to download audio: ${error}`);
      await this.messageEventModel.findByIdAndUpdate(messageEvent._id, {
        processingErrorCode: 'VOICE_DOWNLOAD_FAILED',
        'metadata.transcriptionStatus': 'failed',
        'metadata.transcriptionErrorCode': 'VOICE_DOWNLOAD_FAILED',
      });
      return null;
    }
  }

  private async updateTranscriptionStatus(
    messageEventId: string,
    status: string,
    errorCode?: string,
  ): Promise<void> {
    await this.messageEventModel.findByIdAndUpdate(messageEventId, {
      processingStatus: MessageProcessingStatus.PROCESSING,
      'metadata.transcriptionStatus': status,
      'metadata.transcriptionErrorCode': errorCode,
    });
  }

  private safeDeleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Deleted temp file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete temp file ${filePath}: ${error}`);
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/ogg': '.ogg',
      'audio/ogg; codecs=opus': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.mp4',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/webm': '.webm',
      'audio/flac': '.flac',
      'audio/aac': '.aac',
    };
    return map[mimeType.toLowerCase().trim()] || '.ogg';
  }

  private ensureTempDirectory(): void {
    try {
      if (!fs.existsSync(this.tempStoragePath)) {
        fs.mkdirSync(this.tempStoragePath, { recursive: true });
      }
    } catch (error) {
      this.logger.error(`Failed to create temp directory: ${error}`);
    }
  }

  async cleanupStaleFiles(): Promise<number> {
    const maxAge = 60 * 60 * 1000;
    let cleaned = 0;

    try {
      if (!fs.existsSync(this.tempStoragePath)) return 0;

      const files = fs.readdirSync(this.tempStoragePath);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempStoragePath, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      this.logger.warn(`Stale file cleanup failed: ${error}`);
    }

    return cleaned;
  }
}
