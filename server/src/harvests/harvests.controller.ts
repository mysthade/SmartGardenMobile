import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { HarvestDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import {
  createHarvestSchema,
  harvestIdParamSchema,
  listHarvestsQuerySchema,
  plantIdParamSchema,
  updateHarvestSchema,
  type CreateHarvestInput,
  type ListHarvestsQuery,
  type UpdateHarvestInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { HarvestsService } from './harvests.service';

@ApiTags('harvests')
@ApiBearerAuth()
@Controller()
export class HarvestsController {
  constructor(private readonly harvests: HarvestsService) {}

  @Idempotent()
  @Post('plants/:plantId/harvests')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Body(new ZodValidationPipe(createHarvestSchema)) body: CreateHarvestInput,
  ): Promise<HarvestDto> {
    return this.harvests.create(user.id, params.plantId, body);
  }

  @Get('plants/:plantId/harvests')
  async list(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Query(new ZodValidationPipe(listHarvestsQuerySchema)) query: ListHarvestsQuery,
  ): Promise<PaginatedResponse<HarvestDto>> {
    return this.harvests.list(user.id, params.plantId, query);
  }

  @Get('harvests/:harvestId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(harvestIdParamSchema)) params: { harvestId: string },
  ): Promise<HarvestDto> {
    return this.harvests.get(user.id, params.harvestId);
  }

  @Patch('harvests/:harvestId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(harvestIdParamSchema)) params: { harvestId: string },
    @Body(new ZodValidationPipe(updateHarvestSchema)) body: UpdateHarvestInput,
  ): Promise<HarvestDto> {
    return this.harvests.update(user.id, params.harvestId, body);
  }

  @Delete('harvests/:harvestId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(harvestIdParamSchema)) params: { harvestId: string },
  ): Promise<MessageResponse> {
    return this.harvests.remove(user.id, params.harvestId);
  }
}
