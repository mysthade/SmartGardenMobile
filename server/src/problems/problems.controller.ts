import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { MessageResponse, PaginatedResponse, ProblemDto } from '@smart-garden/types';
import {
  createProblemSchema,
  listProblemsQuerySchema,
  plantIdParamSchema,
  problemIdParamSchema,
  updateProblemSchema,
  type CreateProblemInput,
  type ListProblemsQuery,
  type UpdateProblemInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProblemsService } from './problems.service';

@ApiTags('problems')
@ApiBearerAuth()
@Controller()
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Idempotent()
  @Post('plants/:plantId/problems')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Body(new ZodValidationPipe(createProblemSchema)) body: CreateProblemInput,
  ): Promise<ProblemDto> {
    return this.problems.create(user.id, params.plantId, body);
  }

  @Get('plants/:plantId/problems')
  async list(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Query(new ZodValidationPipe(listProblemsQuerySchema)) query: ListProblemsQuery,
  ): Promise<PaginatedResponse<ProblemDto>> {
    return this.problems.list(user.id, params.plantId, query);
  }

  @Get('problems/:problemId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(problemIdParamSchema)) params: { problemId: string },
  ): Promise<ProblemDto> {
    return this.problems.get(user.id, params.problemId);
  }

  @Patch('problems/:problemId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(problemIdParamSchema)) params: { problemId: string },
    @Body(new ZodValidationPipe(updateProblemSchema)) body: UpdateProblemInput,
  ): Promise<ProblemDto> {
    return this.problems.update(user.id, params.problemId, body);
  }

  @Delete('problems/:problemId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(problemIdParamSchema)) params: { problemId: string },
  ): Promise<MessageResponse> {
    return this.problems.remove(user.id, params.problemId);
  }
}
