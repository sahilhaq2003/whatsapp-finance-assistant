export interface SpeechTranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt';
}

export interface SpeechProvider {
  transcribe(
    filePath: string,
    options?: SpeechTranscriptionOptions,
  ): Promise<TranscriptionResult>;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
  durationSeconds?: number;
}
