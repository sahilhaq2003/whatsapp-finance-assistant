import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class PaymentQueryDto {
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

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
