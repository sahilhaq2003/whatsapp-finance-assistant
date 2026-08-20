import { IsEnum, IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ReportPeriod } from '../enums/report-period.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';

export class TransactionReportQueryDto {
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

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
