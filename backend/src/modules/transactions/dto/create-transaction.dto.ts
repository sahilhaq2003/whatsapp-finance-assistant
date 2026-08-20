import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsDateString()
  date: string;

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
