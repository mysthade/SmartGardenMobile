import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { BedLayoutDto, BedLayoutSaveResponse } from '@smart-garden/types';
import {
  updateBedLayoutSchema,
  zoneIdParamSchema,
  type UpdateBedLayoutInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BedLayoutService } from './bed-layout.service';

@ApiTags('bed-layout')
@ApiBearerAuth()
@Controller()
export class BedLayoutController {
  constructor(private readonly bedLayout: BedLayoutService) {}

  @Get('zones/:zoneId/layout')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
  ): Promise<BedLayoutDto> {
    return this.bedLayout.get(user.id, params.zoneId);
  }

  @Idempotent()
  @Put('zones/:zoneId/layout')
  async save(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(zoneIdParamSchema)) params: { zoneId: string },
    @Body(new ZodValidationPipe(updateBedLayoutSchema)) body: UpdateBedLayoutInput,
  ): Promise<BedLayoutSaveResponse> {
    return this.bedLayout.save(user.id, params.zoneId, body);
  }
}
