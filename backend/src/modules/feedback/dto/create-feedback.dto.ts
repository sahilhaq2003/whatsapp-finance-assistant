import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { FeedbackType } from '../enums/feedback-type.enum';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType)
  @IsNotEmpty()
  type: FeedbackType;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @IsString()
  @IsOptional()
  relatedEntityId?: string;
}
