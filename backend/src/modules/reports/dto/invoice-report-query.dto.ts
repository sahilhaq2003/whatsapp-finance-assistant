import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportPeriod } from '../enums/report-period.enum';

export class InvoiceReportQueryDto {
  @IsEnum(ReportPeriod)
  @IsOptional()
  period?: ReportPeriod;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}
