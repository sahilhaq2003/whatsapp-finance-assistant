export const SPEECH_CONSTANTS = {
  DEFAULT_MODEL: 'whisper-1',
  DEFAULT_MAX_DURATION_SECONDS: 120,
  DEFAULT_MAX_FILE_SIZE_MB: 10,
  DEFAULT_REQUEST_TIMEOUT_MS: 30000,
  DEFAULT_TEMP_STORAGE_PATH: './storage/temp/voice',
  SUPPORTED_MIME_TYPES: [
    'audio/ogg',
    'audio/ogg; codecs=opus',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/flac',
    'audio/aac',
  ] as const,
  STALE_FILE_MAX_AGE_MS: 60 * 60 * 1000,
} as const;

export const SPEECH_REPLIES = {
  FEATURE_DISABLED: 'Voice-note processing is not enabled for this business. Please send the transaction as text.',

  SERVICE_UNAVAILABLE: 'Voice-note processing is temporarily unavailable. Please send the transaction as text.',

  FILE_TOO_LARGE: 'That voice note is too large to process. Please send a shorter voice note or use text.',

  TOO_LONG: 'That voice note is too long to process. Please send a shorter message.',

  UNSUPPORTED_FORMAT: 'That audio format is not supported. Please send an OGG, MP4, or MP3 voice note.',

  DOWNLOAD_FAILED: 'I could not download your voice note. Please try sending it again.',

  TRANSCRIPTION_FAILED: 'I couldn\'t clearly understand that voice note. Please try again or send the transaction as text.',

  EMPTY_TRANSCRIPT: 'I couldn\'t clearly understand that voice note. Please try again or send the transaction as text.',

  PROCESSING: 'I received your voice note. Processing it now...',
} as const;
