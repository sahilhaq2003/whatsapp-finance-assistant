import { IsEnum, IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';

export class TransactionQueryDto {
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  search?: string;

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
