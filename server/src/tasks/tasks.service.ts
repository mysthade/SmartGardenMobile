import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MessageResponse, PaginatedResponse, TaskDto } from '@smart-garden/types';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '@smart-garden/validation';
import { validationError } from '../common/errors/http-errors';
import { toTaskDto } from '../common/mappers/events.mapper';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(userId: string, input: CreateTaskInput): Promise<TaskDto> {
    const links = await this.resolveLinks(userId, input);
    const status = input.status;
    const task = await this.prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? null,
        gardenId: links.gardenId,
        zoneId: links.zoneId,
        plantId: links.plantId,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        priority: input.priority,
        status,
        completedAt: status === 'DONE' ? new Date() : null,
        reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
      },
    });
    return toTaskDto(task);
  }

  async list(userId: string, query: ListTasksQuery): Promise<PaginatedResponse<TaskDto>> {
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.TaskWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.gardenId ? { gardenId: query.gardenId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.plantId ? { plantId: query.plantId } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
      AND: [
        cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      query.sort === 'priority'
        ? [{ priority: query.order }, { id: query.order }]
        : query.sort === 'dueAt'
          ? [{ dueAt: query.order }, { id: query.order }]
          : [{ createdAt: query.order }, { id: query.order }];

    const rows = await this.prisma.task.findMany({
      where,
      orderBy,
      take: query.limit + 1,
    });

    return {
      data: takePage(rows, query.limit).map(toTaskDto),
      meta: buildPaginationMeta(rows, query.limit),
    };
  }

  async get(userId: string, taskId: string): Promise<TaskDto> {
    return toTaskDto(await this.ownership.requireTask(taskId, userId));
  }

  async update(userId: string, taskId: string, input: UpdateTaskInput): Promise<TaskDto> {
    const existing = await this.ownership.requireTask(taskId, userId);
    const links = await this.resolveLinks(userId, {
      gardenId: input.gardenId === undefined ? existing.gardenId : input.gardenId,
      zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId,
      plantId: input.plantId === undefined ? existing.plantId : input.plantId,
    });

    const nextStatus = input.status ?? existing.status;
    let completedAt: Date | null | undefined = undefined;
    if (input.status !== undefined) {
      completedAt = nextStatus === 'DONE' ? (existing.completedAt ?? new Date()) : null;
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description === undefined ? undefined : input.description,
        gardenId: links.gardenId,
        zoneId: links.zoneId,
        plantId: links.plantId,
        dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null,
        priority: input.priority,
        status: input.status,
        completedAt,
        reminderAt:
          input.reminderAt === undefined
            ? undefined
            : input.reminderAt
              ? new Date(input.reminderAt)
              : null,
      },
    });
    return toTaskDto(task);
  }

  async softDelete(userId: string, taskId: string): Promise<MessageResponse> {
    await this.ownership.requireTask(taskId, userId);
    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Задачу видалено' };
  }

  private async resolveLinks(
    userId: string,
    input: { gardenId?: string | null; zoneId?: string | null; plantId?: string | null },
  ): Promise<{ gardenId: string | null; zoneId: string | null; plantId: string | null }> {
    let gardenId = input.gardenId ?? null;
    let zoneId = input.zoneId ?? null;
    const plantId = input.plantId ?? null;

    if (plantId) {
      const plant = await this.ownership.requirePlant(plantId, userId);
      zoneId = plant.zoneId;
      gardenId = plant.zone.gardenId;
    } else if (zoneId) {
      const zone = await this.ownership.requireZone(zoneId, userId);
      gardenId = zone.gardenId;
    } else if (gardenId) {
      await this.ownership.requireGarden(gardenId, userId);
    }

    return { gardenId, zoneId, plantId };
  }
}
