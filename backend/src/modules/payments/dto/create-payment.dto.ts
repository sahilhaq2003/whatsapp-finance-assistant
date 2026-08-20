import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  date: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  reference?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
