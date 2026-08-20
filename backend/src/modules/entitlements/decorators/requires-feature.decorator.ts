import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../enums/feature-key.enum';

export const REQUIRES_FEATURE_KEY = 'requires_feature';

export const RequiresFeature = (feature: FeatureKey) =>
  SetMetadata(REQUIRES_FEATURE_KEY, feature);
