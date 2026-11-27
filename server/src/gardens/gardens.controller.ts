import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { GardenDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import {
  createGardenSchema,
  gardenIdParamSchema,
  listGardensQuerySchema,
  updateGardenSchema,
  type CreateGardenInput,
  type ListGardensQuery,
  type UpdateGardenInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { GardensService } from './gardens.service';

@ApiTags('gardens')
@ApiBearerAuth()
@Controller('gardens')
export class GardensController {
  constructor(private readonly gardens: GardensService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createGardenSchema)) body: CreateGardenInput,
  ): Promise<GardenDto> {
    return this.gardens.create(user.id, body);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listGardensQuerySchema)) query: ListGardensQuery,
  ): Promise<PaginatedResponse<GardenDto>> {
    return this.gardens.list(user.id, query);
  }

  @Get(':gardenId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
  ): Promise<GardenDto> {
    return this.gardens.get(user.id, params.gardenId);
  }

  @Patch(':gardenId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
    @Body(new ZodValidationPipe(updateGardenSchema)) body: UpdateGardenInput,
  ): Promise<GardenDto> {
    return this.gardens.update(user.id, params.gardenId, body);
  }

  @Delete(':gardenId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
  ): Promise<MessageResponse> {
    return this.gardens.softDelete(user.id, params.gardenId);
  }
}
