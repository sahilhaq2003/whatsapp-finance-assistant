import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UsageCounter,
  UsageCounterSchema,
} from './schemas/usage-counter.schema';
import { UsageService } from './services/usage.service';
import { UsageController } from './usage.controller';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageCounter.name, schema: UsageCounterSchema },
    ]),
    EntitlementsModule,
    BusinessesModule,
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
