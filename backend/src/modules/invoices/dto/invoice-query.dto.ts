import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { InvoicePaymentStatus } from '../../../common/enums/invoice-payment-status.enum';

export class InvoiceQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsEnum(InvoicePaymentStatus)
  @IsOptional()
  paymentStatus?: InvoicePaymentStatus;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsBooleanString()
  @IsOptional()
  overdue?: string;

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
