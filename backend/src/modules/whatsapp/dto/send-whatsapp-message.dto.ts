import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class SendWhatsAppMessageDto {
  @IsString()
  @IsNotEmpty()
  recipientPhone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(4096)
  message: string;
}
