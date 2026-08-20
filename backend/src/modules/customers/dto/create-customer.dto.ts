import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  line1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  district?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  country?: string;
}

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  email?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerAddressDto)
  address?: CreateCustomerAddressDto;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
