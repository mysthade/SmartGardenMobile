import { Module } from '@nestjs/common';
import { CareActivitiesController } from './care-activities.controller';
import { CareActivitiesService } from './care-activities.service';

@Module({
  controllers: [CareActivitiesController],
  providers: [CareActivitiesService],
})
export class CareActivitiesModule {}
