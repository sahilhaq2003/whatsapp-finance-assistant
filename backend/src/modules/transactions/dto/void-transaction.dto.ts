import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidTransactionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
