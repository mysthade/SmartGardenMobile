import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { PoliciesModule } from '../policies/policies.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GardenPlansController } from './garden-plans.controller';
import { GardenPlansService } from './garden-plans.service';

@Module({
  imports: [PrismaModule, PoliciesModule, IdempotencyModule],
  controllers: [GardenPlansController],
  providers: [GardenPlansService],
  exports: [GardenPlansService],
})
export class GardenPlansModule {}
