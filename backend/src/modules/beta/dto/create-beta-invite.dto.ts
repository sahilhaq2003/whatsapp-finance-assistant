import { IsEmail, IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class CreateBetaInviteDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @Min(1)
  maxUses?: number = 1;

  @IsNumber()
  @Min(1)
  expiresInDays?: number = 30;

  @IsString()
  @IsOptional()
  cohort?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
