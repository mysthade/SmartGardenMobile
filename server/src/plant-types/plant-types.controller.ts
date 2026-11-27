import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PlantTypeDto } from '@smart-garden/types';
import {
  createPlantTypeSchema,
  listPlantTypesQuerySchema,
  uuidSchema,
  type CreatePlantTypeInput,
  type ListPlantTypesQuery,
} from '@smart-garden/validation';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PlantTypesService } from './plant-types.service';

const plantTypeIdParamSchema = z.object({
  plantTypeId: uuidSchema,
});

@ApiTags('plant-types')
@ApiBearerAuth()
@Controller('plant-types')
export class PlantTypesController {
  constructor(private readonly plantTypes: PlantTypesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listPlantTypesQuerySchema)) query: ListPlantTypesQuery,
  ): Promise<{ data: PlantTypeDto[]; meta: { total: number; limit: number; offset: number } }> {
    return this.plantTypes.list(user.id, query);
  }

  @Idempotent()
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPlantTypeSchema)) body: CreatePlantTypeInput,
  ): Promise<PlantTypeDto> {
    return this.plantTypes.create(user.id, body);
  }

  @Get(':plantTypeId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantTypeIdParamSchema)) params: { plantTypeId: string },
  ): Promise<PlantTypeDto> {
    return this.plantTypes.get(user.id, params.plantTypeId);
  }
}
