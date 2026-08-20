import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  baseCurrency?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsObject()
  @IsOptional()
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    district?: string;
    postalCode?: string;
    country?: string;
  };
}

export class CreateBusinessWithOwnerDto extends CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  ownerUserId: string;
}
