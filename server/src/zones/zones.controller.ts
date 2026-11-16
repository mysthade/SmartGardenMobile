import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { MessageResponse, PaginatedResponse, ZoneDto } from '@smart-garden/types';
import {
  createZoneSchema,
  gardenIdParamSchema,
  listZonesQuerySchema,
  updateZoneSchema,
  zoneIdParamSchema,
  type CreateZoneInput,
  type ListZonesQuery,
  type UpdateZoneInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ZonesService } from './zones.service';

@ApiTags('zones')
@ApiBearerAuth()
@Controller()
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Post('gardens/:gardenId/zones')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
    @Body(new ZodValidationPipe(createZoneSchema)) body: CreateZoneInput,
  ): Promise<ZoneDto> {
    return this.zones.create(user.id, params.gardenId, body);
  }

  @Get('gardens/:gardenId/zones')
  async listByGarden(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
    @Query(new ZodValidationPipe(listZonesQuerySchema)) query: ListZonesQuery,
  ): Promise<PaginatedResponse<ZoneDto>> {
    return this.zones.listByGarden(user.id, params.gardenId, query);
  }

  @Get('zones/:zoneId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
  ): Promise<ZoneDto> {
    return this.zones.get(user.id, params.zoneId);
  }

  @Patch('zones/:zoneId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
    @Body(new ZodValidationPipe(updateZoneSchema)) body: UpdateZoneInput,
  ): Promise<ZoneDto> {
    return this.zones.update(user.id, params.zoneId, body);
  }

  @Delete('zones/:zoneId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
  ): Promise<MessageResponse> {
    return this.zones.softDelete(user.id, params.zoneId);
  }
}
