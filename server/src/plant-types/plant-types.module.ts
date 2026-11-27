import { Module } from '@nestjs/common';
import { PlantTypesController } from './plant-types.controller';
import { PlantTypesService } from './plant-types.service';

@Module({
  controllers: [PlantTypesController],
  providers: [PlantTypesService],
  exports: [PlantTypesService],
})
export class PlantTypesModule {}
