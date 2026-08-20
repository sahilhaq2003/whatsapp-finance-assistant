import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateReminderRuleDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offsetDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dayOfMonth?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourOfDay?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minuteOfHour?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxRemindsPerInvoice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  manualCooldownMinutes?: number;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  templateLanguage?: string;
}
