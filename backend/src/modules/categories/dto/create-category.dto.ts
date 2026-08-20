import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CategoryType } from '../../../common/enums/category-type.enum';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(CategoryType)
  @IsNotEmpty()
  type: CategoryType;
}
