import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpeechService } from './services/speech.service';
import { AudioValidationService } from './services/audio-validation.service';
import { OpenAiSpeechProvider } from './providers/speech-provider.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SpeechService,
    AudioValidationService,
    {
      provide: 'SpeechProvider',
      useClass: OpenAiSpeechProvider,
    },
  ],
  exports: [SpeechService, AudioValidationService],
})
export class SpeechModule {}
