import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BetaEnrollmentStatus } from '../enums/beta-enrollment-status.enum';

export class UpdateBetaEnrollmentDto {
  @IsEnum(BetaEnrollmentStatus)
  @IsOptional()
  status?: BetaEnrollmentStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
