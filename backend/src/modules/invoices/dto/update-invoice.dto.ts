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

export class UpdateInvoiceItemDto {
  @IsString()
  @IsOptional()
  _id?: string;

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

export class UpdateInvoiceDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

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
  @Type(() => UpdateInvoiceItemDto)
  @IsOptional()
  items?: UpdateInvoiceItemDto[];
}
