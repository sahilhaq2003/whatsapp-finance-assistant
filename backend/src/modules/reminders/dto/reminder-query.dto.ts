import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReminderStatus } from '../enums/reminder-status.enum';
import { ReminderTrigger } from '../enums/reminder-trigger.enum';

export class ReminderQueryDto {
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEnum(ReminderStatus)
  @IsOptional()
  status?: ReminderStatus;

  @IsEnum(ReminderTrigger)
  @IsOptional()
  trigger?: ReminderTrigger;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
