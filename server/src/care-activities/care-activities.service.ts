import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CareActivityDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import type {
  CreateCareActivityInput,
  ListCareActivitiesQuery,
  UpdateCareActivityInput,
} from '@smart-garden/validation';
import { validationError } from '../common/errors/http-errors';
import { toCareActivityDto } from '../common/mappers/events.mapper';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CareActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(
    ownerId: string,
    plantId: string,
    input: CreateCareActivityInput,
  ): Promise<CareActivityDto> {
    await this.ownership.requirePlant(plantId, ownerId);
    const activity = await this.prisma.careActivity.create({
      data: {
        plantId,
        type: input.type,
        performedAt: new Date(input.performedAt),
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        productName: input.productName ?? null,
        notes: input.notes ?? null,
      },
    });
    return toCareActivityDto(activity);
  }

  async list(
    ownerId: string,
    plantId: string,
    query: ListCareActivitiesQuery,
  ): Promise<PaginatedResponse<CareActivityDto>> {
    await this.ownership.requirePlant(plantId, ownerId);
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const dateField = query.sort === 'createdAt' ? 'createdAt' : 'performedAt';
    const where: Prisma.CareActivityWhereInput = {
      plantId,
      ...(query.type ? { type: query.type } : {}),
      AND: [
        cursor
          ? {
              OR: [
                { [dateField]: { lt: new Date(cursor.createdAt) } },
                { [dateField]: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };

    const rows = await this.prisma.careActivity.findMany({
      where,
      orderBy: [{ [dateField]: query.order }, { id: query.order }],
      take: query.limit + 1,
    });

    const forMeta = rows.map((row) => ({
      id: row.id,
      createdAt: dateField === 'performedAt' ? row.performedAt : row.createdAt,
    }));

    return {
      data: takePage(rows, query.limit).map(toCareActivityDto),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }

  async get(ownerId: string, activityId: string): Promise<CareActivityDto> {
    return toCareActivityDto(await this.ownership.requireCareActivity(activityId, ownerId));
  }

  async update(
    ownerId: string,
    activityId: string,
    input: UpdateCareActivityInput,
  ): Promise<CareActivityDto> {
    await this.ownership.requireCareActivity(activityId, ownerId);
    const activity = await this.prisma.careActivity.update({
      where: { id: activityId },
      data: {
        type: input.type,
        performedAt: input.performedAt ? new Date(input.performedAt) : undefined,
        quantity: input.quantity === undefined ? undefined : input.quantity,
        unit: input.unit === undefined ? undefined : input.unit,
        productName: input.productName === undefined ? undefined : input.productName,
        notes: input.notes === undefined ? undefined : input.notes,
      },
    });
    return toCareActivityDto(activity);
  }

  async remove(ownerId: string, activityId: string): Promise<MessageResponse> {
    await this.ownership.requireCareActivity(activityId, ownerId);
    await this.prisma.careActivity.delete({ where: { id: activityId } });
    return { message: 'Активність догляду видалено' };
  }
}
