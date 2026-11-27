import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { BedLayoutModule } from './bed-layout/bed-layout.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GardenPlansModule } from './garden-plans/garden-plans.module';
import { CareActivitiesModule } from './care-activities/care-activities.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppConfigModule } from './config/config.module';
import { GardensModule } from './gardens/gardens.module';
import { HarvestsModule } from './harvests/harvests.module';
import { HealthModule } from './health/health.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { JournalModule } from './journal/journal.module';
import { MailModule } from './mail/mail.module';
import { PlantTypesModule } from './plant-types/plant-types.module';
import { PlantsModule } from './plants/plants.module';
import { PoliciesModule } from './policies/policies.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProblemsModule } from './problems/problems.module';
import { ProfileModule } from './profile/profile.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    MailModule,
    StorageModule,
    IdempotencyModule,
    PoliciesModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    GardensModule,
    ZonesModule,
    PlantTypesModule,
    PlantsModule,
    JournalModule,
    HarvestsModule,
    ProblemsModule,
    CareActivitiesModule,
    TasksModule,
    AttachmentsModule,
    AnalyticsModule,
    BedLayoutModule,
    DashboardModule,
    GardenPlansModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
