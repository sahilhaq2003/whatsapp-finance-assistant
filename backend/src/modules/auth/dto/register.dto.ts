import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  @IsIn(['en', 'si', 'ta'])
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsOptional()
  businessType?: string;
}
