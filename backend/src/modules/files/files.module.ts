import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalFileStorageService } from './local-file-storage.service';

const fileStorageProvider = {
  provide: 'FileStorage',
  useFactory: (configService: ConfigService) => {
    const driver = configService.get<string>('FILE_STORAGE_DRIVER', 'local');
    if (driver === 'local') {
      return new LocalFileStorageService(configService);
    }
    throw new Error(`Unsupported file storage driver: ${driver}`);
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule],
  providers: [fileStorageProvider, LocalFileStorageService],
  exports: ['FileStorage', LocalFileStorageService],
})
export class FilesModule {}
