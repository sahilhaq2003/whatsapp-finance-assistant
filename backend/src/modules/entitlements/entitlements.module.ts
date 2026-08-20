import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlanDefinition,
  PlanDefinitionSchema,
} from './schemas/plan-definition.schema';
import { EntitlementsService } from './services/entitlements.service';
import { EntitlementsController } from './entitlements.controller';
import { FeatureEntitlementGuard } from './guards/feature-entitlement.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlanDefinition.name, schema: PlanDefinitionSchema },
    ]),
  ],
  controllers: [EntitlementsController],
  providers: [EntitlementsService, FeatureEntitlementGuard],
  exports: [EntitlementsService, FeatureEntitlementGuard],
})
export class EntitlementsModule {}
