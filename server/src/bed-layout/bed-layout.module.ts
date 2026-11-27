import { Module } from '@nestjs/common';
import { PoliciesModule } from '../policies/policies.module';
import { BedLayoutController } from './bed-layout.controller';
import { BedLayoutService } from './bed-layout.service';

@Module({
  imports: [PoliciesModule],
  controllers: [BedLayoutController],
  providers: [BedLayoutService],
})
export class BedLayoutModule {}
