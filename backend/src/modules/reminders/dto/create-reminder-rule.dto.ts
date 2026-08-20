import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';
import { ReminderChannel } from '../enums/reminder-channel.enum';

export class CreateReminderRuleDto {
  @IsEnum(ReminderTrigger)
  trigger: ReminderTrigger;

  @IsEnum(ReminderChannel)
  @IsOptional()
  channel?: ReminderChannel;

  @IsBoolean()
  isEnabled: boolean;

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
  @Max(23)
  @IsOptional()
  hourOfDay?: number;

  @IsNumber()
  @Min(0)
  @Max(59)
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
