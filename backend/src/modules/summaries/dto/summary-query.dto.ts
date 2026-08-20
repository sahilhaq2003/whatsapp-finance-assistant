import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SummaryFrequency } from '../enums/summary-frequency.enum';
import { SummaryStatus } from '../enums/summary-status.enum';

export class SummaryQueryDto {
  @IsEnum(SummaryFrequency)
  @IsOptional()
  frequency?: SummaryFrequency;

  @IsEnum(SummaryStatus)
  @IsOptional()
  status?: SummaryStatus;

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
