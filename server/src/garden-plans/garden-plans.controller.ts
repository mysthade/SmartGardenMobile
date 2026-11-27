import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  GardenPlanDetailsDto,
  GardenPlanDto,
  MessageResponse,
  PlanObjectDto,
  SaveGardenPlanResponse,
} from '@smart-garden/types';
import {
  batchPlanObjectsSchema,
  createGardenPlanSchema,
  createPlanObjectSchema,
  duplicateGardenPlanSchema,
  gardenIdParamSchema,
  planIdParamSchema,
  planObjectIdParamSchema,
  updateGardenPlanSchema,
  updatePlanObjectSchema,
  type BatchPlanObjectsInput,
  type CreateGardenPlanInput,
  type CreatePlanObjectInput,
  type DuplicateGardenPlanInput,
  type UpdateGardenPlanInput,
  type UpdatePlanObjectInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { GardenPlansService } from './garden-plans.service';

@ApiTags('garden-plans')
@ApiBearerAuth()
@Controller()
export class GardenPlansController {
  constructor(private readonly gardenPlans: GardenPlansService) {}

  @Get('gardens/:gardenId/plans')
  async list(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
  ): Promise<GardenPlanDto[]> {
    return this.gardenPlans.list(user.id, params.gardenId);
  }

  @Get('gardens/:gardenId/plans/active')
  async getActive(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
  ): Promise<GardenPlanDetailsDto> {
    return this.gardenPlans.getActive(user.id, params.gardenId);
  }

  @Idempotent()
  @Post('gardens/:gardenId/plans')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(gardenIdParamSchema)) params: { gardenId: string },
    @Body(new ZodValidationPipe(createGardenPlanSchema)) body: CreateGardenPlanInput,
  ): Promise<GardenPlanDto> {
    return this.gardenPlans.create(user.id, params.gardenId, body);
  }

  @Get('plans/:planId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planIdParamSchema)) params: { planId: string },
  ): Promise<GardenPlanDetailsDto> {
    return this.gardenPlans.get(user.id, params.planId);
  }

  @Patch('plans/:planId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planIdParamSchema)) params: { planId: string },
    @Body(new ZodValidationPipe(updateGardenPlanSchema)) body: UpdateGardenPlanInput,
  ): Promise<GardenPlanDto> {
    return this.gardenPlans.update(user.id, params.planId, body);
  }

  @Delete('plans/:planId')
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planIdParamSchema)) params: { planId: string },
  ): Promise<MessageResponse> {
    return this.gardenPlans.delete(user.id, params.planId);
  }

  @Idempotent()
  @Post('plans/:planId/duplicate')
  async duplicate(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planIdParamSchema)) params: { planId: string },
    @Body(new ZodValidationPipe(duplicateGardenPlanSchema)) body: DuplicateGardenPlanInput,
  ): Promise<GardenPlanDetailsDto> {
    return this.gardenPlans.duplicate(user.id, params.planId, body);
  }

  @Idempotent()
  @Put('plans/:planId/objects')
  async saveObjects(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planIdParamSchema)) params: { planId: string },
    @Body(new ZodValidationPipe(batchPlanObjectsSchema)) body: BatchPlanObjectsInput,
  ): Promise<SaveGardenPlanResponse> {
    return this.gardenPlans.saveObjects(user.id, params.planId, body);
  }

  @Post('plans/:planId/objects')
  async createObject(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planIdParamSchema)) params: { planId: string },
    @Body(new ZodValidationPipe(createPlanObjectSchema)) body: CreatePlanObjectInput,
  ): Promise<PlanObjectDto> {
    return this.gardenPlans.createObject(user.id, params.planId, body);
  }

  @Patch('plans/:planId/objects/:objectId')
  async updateObject(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planObjectIdParamSchema))
    params: { planId: string; objectId: string },
    @Body(new ZodValidationPipe(updatePlanObjectSchema)) body: UpdatePlanObjectInput,
  ): Promise<PlanObjectDto> {
    return this.gardenPlans.updateObject(user.id, params.planId, params.objectId, body);
  }

  @Delete('plans/:planId/objects/:objectId')
  @HttpCode(200)
  async deleteObject(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(planObjectIdParamSchema))
    params: { planId: string; objectId: string },
  ): Promise<MessageResponse> {
    return this.gardenPlans.deleteObject(user.id, params.planId, params.objectId);
  }
}
