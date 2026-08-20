import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import type {
  SpeechProvider,
  SpeechTranscriptionOptions,
  TranscriptionResult,
} from '../interfaces/speech-provider.interface';
import { SPEECH_CONSTANTS } from '../speech.constants';

@Injectable()
export class OpenAiSpeechProvider implements SpeechProvider {
  private readonly logger = new Logger(OpenAiSpeechProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SPEECH_API_KEY') || '';
    this.model = this.configService.get<string>('SPEECH_MODEL') || SPEECH_CONSTANTS.DEFAULT_MODEL;
    this.timeoutMs = this.configService.get<number>('SPEECH_REQUEST_TIMEOUT_MS') || SPEECH_CONSTANTS.DEFAULT_REQUEST_TIMEOUT_MS;
    this.baseUrl = this.configService.get<string>('AI_API_BASE_URL') || 'https://api.openai.com/v1';
  }

  async transcribe(
    filePath: string,
    options?: SpeechTranscriptionOptions,
  ): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error('Speech API key is not configured');
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('model', this.model);

    if (options?.language) {
      formData.append('language', options.language);
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }
    if (options?.responseFormat) {
      formData.append('response_format', options.responseFormat);
    } else {
      formData.append('response_format', 'verbose_json');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Speech API error: ${response.status} - ${errorBody}`);
        throw new Error(`Speech API error: ${response.status}`);
      }

      const result = await response.json() as {
        text: string;
        language?: string;
        duration?: number;
      };

      return {
        text: result.text,
        language: result.language,
        durationSeconds: result.duration,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error(`Speech API request timed out after ${this.timeoutMs}ms`);
        throw new Error('Speech API request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
