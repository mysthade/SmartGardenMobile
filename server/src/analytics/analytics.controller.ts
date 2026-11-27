import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { uuidSchema } from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AnalyticsService, type AnalyticsSummary } from './analytics.service';

const analyticsQuerySchema = z.object({
  gardenId: uuidSchema.optional(),
});

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  async summary(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: { gardenId?: string },
  ): Promise<AnalyticsSummary> {
    return this.analytics.summary(user.id, query.gardenId);
  }
}
