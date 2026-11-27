import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { MessageResponse, PaginatedResponse, TaskDto } from '@smart-garden/types';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type ListTasksQuery,
  type UpdateTaskInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Idempotent()
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
  ): Promise<TaskDto> {
    return this.tasks.create(user.id, body);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery,
  ): Promise<PaginatedResponse<TaskDto>> {
    return this.tasks.list(user.id, query);
  }

  @Get(':taskId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { taskId: string },
  ): Promise<TaskDto> {
    return this.tasks.get(user.id, params.taskId);
  }

  @Patch(':taskId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { taskId: string },
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
  ): Promise<TaskDto> {
    return this.tasks.update(user.id, params.taskId, body);
  }

  @Delete(':taskId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { taskId: string },
  ): Promise<MessageResponse> {
    return this.tasks.softDelete(user.id, params.taskId);
  }
}
