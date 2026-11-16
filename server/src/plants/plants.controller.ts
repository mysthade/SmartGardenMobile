import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { MessageResponse, PaginatedResponse, PlantDto } from '@smart-garden/types';
import {
  createPlantSchema,
  listPlantsQuerySchema,
  plantIdParamSchema,
  updatePlantSchema,
  zoneIdParamSchema,
  type CreatePlantInput,
  type ListPlantsQuery,
  type UpdatePlantInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PlantsService } from './plants.service';

@ApiTags('plants')
@ApiBearerAuth()
@Controller()
export class PlantsController {
  constructor(private readonly plants: PlantsService) {}

  @Idempotent()
  @Post('zones/:zoneId/plants')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
    @Body(new ZodValidationPipe(createPlantSchema)) body: CreatePlantInput,
  ): Promise<PlantDto> {
    return this.plants.create(user.id, params.zoneId, body);
  }

  @Get('zones/:zoneId/plants')
  async listByZone(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
    @Query(new ZodValidationPipe(listPlantsQuerySchema)) query: ListPlantsQuery,
  ): Promise<PaginatedResponse<PlantDto>> {
    return this.plants.listByZone(user.id, params.zoneId, query);
  }

  @Get('plants')
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listPlantsQuerySchema)) query: ListPlantsQuery,
  ): Promise<PaginatedResponse<PlantDto>> {
    return this.plants.list(user.id, query);
  }

  @Get('plants/:plantId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
  ): Promise<PlantDto> {
    return this.plants.get(user.id, params.plantId);
  }

  @Patch('plants/:plantId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Body(new ZodValidationPipe(updatePlantSchema)) body: UpdatePlantInput,
  ): Promise<PlantDto> {
    return this.plants.update(user.id, params.plantId, body);
  }

  @Delete('plants/:plantId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
  ): Promise<MessageResponse> {
    return this.plants.softDelete(user.id, params.plantId);
  }
}
