import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BetaController } from './beta.controller';
import { BetaService } from './services/beta.service';
import { BetaInvite, BetaInviteSchema } from './schemas/beta-invite.schema';
import {
  BetaEnrollment,
  BetaEnrollmentSchema,
} from './schemas/beta-enrollment.schema';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BetaInvite.name, schema: BetaInviteSchema },
      { name: BetaEnrollment.name, schema: BetaEnrollmentSchema },
    ]),
    BusinessesModule,
  ],
  controllers: [BetaController],
  providers: [BetaService],
  exports: [BetaService],
})
export class BetaModule {}
