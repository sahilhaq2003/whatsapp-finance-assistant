import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  @IsIn(['en', 'si', 'ta'])
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
