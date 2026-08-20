import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Business, BusinessSchema } from './schemas/business.schema';
import {
  BusinessMember,
  BusinessMemberSchema,
} from './schemas/business-member.schema';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: BusinessMember.name, schema: BusinessMemberSchema },
    ]),
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService, MongooseModule],
})
export class BusinessesModule {}
