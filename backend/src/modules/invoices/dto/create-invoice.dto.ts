import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsString()
  @IsNotEmpty()
  quantity: string;

  @IsNumber()
  @Min(0)
  rate: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
