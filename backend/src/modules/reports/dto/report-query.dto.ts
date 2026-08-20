import { IsEnum, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';
import { ReportPeriod } from '../enums/report-period.enum';

export class ReportQueryDto {
  @IsEnum(ReportPeriod)
  @IsOptional()
  period?: ReportPeriod;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}

export class ReportExportDto extends ReportQueryDto {
  @IsString()
  @MaxLength(50)
  type: string;

  @IsString()
  @MaxLength(10)
  format: string;
}
