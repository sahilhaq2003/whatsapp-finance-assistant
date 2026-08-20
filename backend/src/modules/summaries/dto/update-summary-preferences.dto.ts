import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { WeeklyDay } from '../enums/weekly-day.enum';
import { SummaryChannel } from '../enums/summary-channel.enum';

export class UpdateSummaryPreferencesDto {
  @IsBoolean()
  @IsOptional()
  dailyEnabled?: boolean;

  @IsNumber()
  @Min(0)
  @Max(23)
  @IsOptional()
  dailySendHour?: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  @IsOptional()
  dailySendMinute?: number;

  @IsBoolean()
  @IsOptional()
  weeklyEnabled?: boolean;

  @IsEnum(WeeklyDay)
  @IsOptional()
  weeklyDay?: WeeklyDay;

  @IsNumber()
  @Min(0)
  @Max(23)
  @IsOptional()
  weeklySendHour?: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  @IsOptional()
  weeklySendMinute?: number;

  @IsEnum(SummaryChannel)
  @IsOptional()
  channel?: SummaryChannel;

  @IsBoolean()
  @IsOptional()
  includeIncome?: boolean;

  @IsBoolean()
  @IsOptional()
  includeExpenses?: boolean;

  @IsBoolean()
  @IsOptional()
  includeNetCashFlow?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTransactionCount?: boolean;

  @IsBoolean()
  @IsOptional()
  includeOutstandingInvoices?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTopCategories?: boolean;

  @IsBoolean()
  @IsOptional()
  includeOverdueInvoices?: boolean;
}
