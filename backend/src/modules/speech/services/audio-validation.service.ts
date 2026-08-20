import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { SPEECH_CONSTANTS } from '../speech.constants';

export interface AudioValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class AudioValidationService {
  private readonly logger = new Logger(AudioValidationService.name);
  private readonly maxFileSizeBytes: number;
  private readonly supportedMimeTypes: readonly string[];

  constructor(private readonly configService: ConfigService) {
    const maxMb = this.configService.get<number>('VOICE_MAX_FILE_SIZE_MB') || SPEECH_CONSTANTS.DEFAULT_MAX_FILE_SIZE_MB;
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
    this.supportedMimeTypes = SPEECH_CONSTANTS.SUPPORTED_MIME_TYPES;
  }

  validate(filePath: string, mimeType?: string): AudioValidationResult {
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        errorCode: 'VOICE_FILE_NOT_FOUND',
        errorMessage: 'Audio file not found.',
      };
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return {
        valid: false,
        errorCode: 'VOICE_FILE_EMPTY',
        errorMessage: 'Audio file is empty.',
      };
    }

    if (stats.size > this.maxFileSizeBytes) {
      const maxMb = Math.round(this.maxFileSizeBytes / (1024 * 1024));
      return {
        valid: false,
        errorCode: 'VOICE_FILE_TOO_LARGE',
        errorMessage: `Audio file exceeds the ${maxMb}MB limit.`,
      };
    }

    if (mimeType && !this.isSupportedMimeType(mimeType)) {
      return {
        valid: false,
        errorCode: 'VOICE_UNSUPPORTED_FORMAT',
        errorMessage: `Audio format "${mimeType}" is not supported.`,
      };
    }

    return { valid: true };
  }

  validateDuration(durationSeconds: number): AudioValidationResult {
    const maxDuration = this.configService.get<number>('VOICE_MAX_DURATION_SECONDS') || SPEECH_CONSTANTS.DEFAULT_MAX_DURATION_SECONDS;

    if (durationSeconds > maxDuration) {
      return {
        valid: false,
        errorCode: 'VOICE_TOO_LONG',
        errorMessage: `Audio duration ${durationSeconds}s exceeds the ${maxDuration}s limit.`,
      };
    }

    return { valid: true };
  }

  private isSupportedMimeType(mimeType: string): boolean {
    const normalized = mimeType.toLowerCase().trim();
    return this.supportedMimeTypes.some((supported) =>
      normalized === supported || normalized.startsWith(supported.split(';')[0]),
    );
  }
}
