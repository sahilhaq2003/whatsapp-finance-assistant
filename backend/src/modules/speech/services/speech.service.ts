import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechProvider, TranscriptionResult } from '../interfaces/speech-provider.interface';
import { AudioValidationService } from './audio-validation.service';
import { SPEECH_CONSTANTS, SPEECH_REPLIES } from '../speech.constants';

export interface SpeechTranscriptionResponse {
  success: boolean;
  transcript?: string;
  language?: string;
  confidence?: number;
  durationSeconds?: number;
  error?: string;
  reply?: string;
}

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Inject('SpeechProvider') private readonly speechProvider: SpeechProvider,
    private readonly audioValidationService: AudioValidationService,
  ) {
    this.isEnabled = this.configService.get<string>('SPEECH_ENABLED') !== 'false';
  }

  get isAvailable(): boolean {
    return this.isEnabled;
  }

  get unavailableReply(): string {
    return SPEECH_REPLIES.SERVICE_UNAVAILABLE;
  }

  async transcribe(filePath: string, mimeType?: string): Promise<SpeechTranscriptionResponse> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'SPEECH_DISABLED',
        reply: SPEECH_REPLIES.SERVICE_UNAVAILABLE,
      };
    }

    const fileValidation = this.audioValidationService.validate(filePath, mimeType);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.errorCode,
        reply: fileValidation.errorCode === 'VOICE_FILE_TOO_LARGE'
          ? SPEECH_REPLIES.FILE_TOO_LARGE
          : fileValidation.errorCode === 'VOICE_UNSUPPORTED_FORMAT'
            ? SPEECH_REPLIES.UNSUPPORTED_FORMAT
            : SPEECH_REPLIES.TRANSCRIPTION_FAILED,
      };
    }

    try {
      const result: TranscriptionResult = await this.speechProvider.transcribe(filePath);

      const transcript = this.normalizeTranscript(result.text);
      if (!transcript) {
        return {
          success: false,
          error: 'TRANSCRIPT_EMPTY',
          reply: SPEECH_REPLIES.EMPTY_TRANSCRIPT,
        };
      }

      if (result.durationSeconds) {
        const durationValidation = this.audioValidationService.validateDuration(result.durationSeconds);
        if (!durationValidation.valid) {
          return {
            success: false,
            error: durationValidation.errorCode,
            reply: SPEECH_REPLIES.TOO_LONG,
          };
        }
      }

      return {
        success: true,
        transcript,
        language: result.language,
        confidence: result.confidence,
        durationSeconds: result.durationSeconds,
      };
    } catch (error) {
      this.logger.error(`Transcription failed: ${error}`);
      return {
        success: false,
        error: 'TRANSCRIPTION_FAILED',
        reply: SPEECH_REPLIES.TRANSCRIPTION_FAILED,
      };
    }
  }

  private normalizeTranscript(raw: string): string | null {
    if (!raw) return null;

    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;

    const normalized = trimmed
      .replace(/\s+/g, ' ')
      .replace(/^["']|["']$/g, '');

    return normalized.length > 0 ? normalized : null;
  }
}
