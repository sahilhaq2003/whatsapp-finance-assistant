import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
