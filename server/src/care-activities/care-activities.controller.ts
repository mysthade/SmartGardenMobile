import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CareActivityDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import {
  careActivityIdParamSchema,
  createCareActivitySchema,
  listCareActivitiesQuerySchema,
  plantIdParamSchema,
  updateCareActivitySchema,
  type CreateCareActivityInput,
  type ListCareActivitiesQuery,
  type UpdateCareActivityInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CareActivitiesService } from './care-activities.service';

@ApiTags('care-activities')
@ApiBearerAuth()
@Controller()
export class CareActivitiesController {
  constructor(private readonly careActivities: CareActivitiesService) {}

  @Idempotent()
  @Post('plants/:plantId/care-activities')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Body(new ZodValidationPipe(createCareActivitySchema)) body: CreateCareActivityInput,
  ): Promise<CareActivityDto> {
    return this.careActivities.create(user.id, params.plantId, body);
  }

  @Get('plants/:plantId/care-activities')
  async list(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Query(new ZodValidationPipe(listCareActivitiesQuerySchema)) query: ListCareActivitiesQuery,
  ): Promise<PaginatedResponse<CareActivityDto>> {
    return this.careActivities.list(user.id, params.plantId, query);
  }

  @Get('care-activities/:activityId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(careActivityIdParamSchema)) params: { activityId: string },
  ): Promise<CareActivityDto> {
    return this.careActivities.get(user.id, params.activityId);
  }

  @Patch('care-activities/:activityId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(careActivityIdParamSchema)) params: { activityId: string },
    @Body(new ZodValidationPipe(updateCareActivitySchema)) body: UpdateCareActivityInput,
  ): Promise<CareActivityDto> {
    return this.careActivities.update(user.id, params.activityId, body);
  }

  @Delete('care-activities/:activityId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(careActivityIdParamSchema)) params: { activityId: string },
  ): Promise<MessageResponse> {
    return this.careActivities.remove(user.id, params.activityId);
  }
}
