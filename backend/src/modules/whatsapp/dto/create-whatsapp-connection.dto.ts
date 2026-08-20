import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateWhatsAppConnectionDto {
  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  displayPhoneNumber: string;

  @IsString()
  @IsNotEmpty()
  businessPhoneE164: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
