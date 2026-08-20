export interface FileStorageInterface {
  save(key: string, buffer: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  getContentType(key: string): string;
  delete(key: string): Promise<void>;
}
