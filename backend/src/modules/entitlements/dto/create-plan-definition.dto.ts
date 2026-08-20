import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeatureKey } from '../enums/feature-key.enum';

class FeatureToggleDto {
  @IsNotEmpty()
  @IsString()
  key!: FeatureKey;

  @IsBoolean()
  enabled!: boolean;
}

class PlanLimitsDto {
  @IsOptional()
  customersPerMonth?: number;

  @IsOptional()
  invoicesPerMonth?: number;

  @IsOptional()
  aiRequestsPerMonth?: number;

  @IsOptional()
  voiceMinutesPerMonth?: number;

  @IsOptional()
  remindersPerMonth?: number;

  @IsOptional()
  exportsPerMonth?: number;
}

export class CreatePlanDefinitionDto {
  @IsNotEmpty()
  @IsString()
  code!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureToggleDto)
  features?: FeatureToggleDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits?: PlanLimitsDto;
}
