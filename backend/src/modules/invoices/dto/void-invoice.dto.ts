import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidInvoiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class VoidPaymentDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
