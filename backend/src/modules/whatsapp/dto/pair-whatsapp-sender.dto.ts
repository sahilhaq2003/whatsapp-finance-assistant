import { IsString, IsNotEmpty } from 'class-validator';

export class PairWhatsAppSenderDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
