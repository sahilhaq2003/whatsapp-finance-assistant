import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export class UpdateTransactionDto {
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  reference?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
