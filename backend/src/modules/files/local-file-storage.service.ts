import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { FileStorageInterface } from './file-storage.interface';

@Injectable()
export class LocalFileStorageService implements FileStorageInterface {
  private readonly logger = new Logger(LocalFileStorageService.name);
  private readonly basePath: string;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get<string>(
      'LOCAL_STORAGE_PATH',
      './storage',
    );
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [this.basePath, path.join(this.basePath, 'invoices')];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async save(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    this.logger.log(`File saved: ${key}`);
    return key;
  }

  async get(key: string): Promise<Buffer | null> {
    const filePath = path.join(this.basePath, key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath);
  }

  getContentType(key: string): string {
    if (key.endsWith('.pdf')) return 'application/pdf';
    if (key.endsWith('.png')) return 'image/png';
    if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
