import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidPaymentDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
