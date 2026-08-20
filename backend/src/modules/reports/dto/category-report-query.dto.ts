import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ReportPeriod } from '../enums/report-period.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

export class CategoryReportQueryDto {
  @IsEnum(ReportPeriod)
  @IsOptional()
  period?: ReportPeriod;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;
}
