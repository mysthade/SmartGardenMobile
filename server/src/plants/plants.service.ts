import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MessageResponse, PaginatedResponse, PlantDto } from '@smart-garden/types';
import type { CreatePlantInput, ListPlantsQuery, UpdatePlantInput } from '@smart-garden/validation';
import { conflict, notFound, validationError } from '../common/errors/http-errors';
import { toPlantDto } from '../common/mappers/garden.mapper';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(ownerId: string, zoneId: string, input: CreatePlantInput): Promise<PlantDto> {
    await this.ownership.requireZone(zoneId, ownerId);
    await this.requirePlantType(input.plantTypeId, ownerId);

    const plant = await this.prisma.plant.create({
      data: {
        zoneId,
        plantTypeId: input.plantTypeId,
        name: input.name,
        variety: input.variety ?? null,
        description: input.description ?? null,
        quantity: input.quantity,
        occupiedArea: input.occupiedArea ?? null,
        positionX: input.positionX ?? null,
        positionY: input.positionY ?? null,
        size: input.size ?? null,
        rotation: input.rotation ?? null,
        plantedAt: input.plantedAt ? new Date(input.plantedAt) : null,
        expectedHarvestAt: input.expectedHarvestAt ? new Date(input.expectedHarvestAt) : null,
        status: input.status,
      },
      include: {
        zone: { select: { gardenId: true } },
        plantType: {
          select: { id: true, name: true, scientificName: true, category: true, iconKey: true },
        },
      },
    });

    return toPlantDto(plant);
  }

  async list(ownerId: string, query: ListPlantsQuery): Promise<PaginatedResponse<PlantDto>> {
    if (query.zoneId) {
      await this.ownership.requireZone(query.zoneId, ownerId);
    }
    if (query.gardenId) {
      await this.ownership.requireGarden(query.gardenId, ownerId);
    }

    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.PlantWhereInput = {
      deletedAt: null,
      zone: {
        deletedAt: null,
        ...(query.zoneId ? { id: query.zoneId } : {}),
        garden: {
          ownerId,
          deletedAt: null,
          ...(query.gardenId ? { id: query.gardenId } : {}),
        },
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.plantTypeId ? { plantTypeId: query.plantTypeId } : {}),
      AND: [
        query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { variety: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {},
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

    const orderBy: Prisma.PlantOrderByWithRelationInput[] =
      query.sort === 'name'
        ? [{ name: query.order }, { id: query.order }]
        : query.sort === 'status'
          ? [{ status: query.order }, { id: query.order }]
          : query.sort === 'createdAt'
            ? [{ createdAt: query.order }, { id: query.order }]
            : [{ updatedAt: query.order }, { id: query.order }];

    const rows = await this.prisma.plant.findMany({
      where,
      orderBy,
      take: query.limit + 1,
      include: {
        zone: { select: { gardenId: true } },
        plantType: {
          select: { id: true, name: true, scientificName: true, category: true, iconKey: true },
        },
      },
    });

    return {
      data: takePage(rows, query.limit).map(toPlantDto),
      meta: buildPaginationMeta(rows, query.limit),
    };
  }

  async listByZone(
    ownerId: string,
    zoneId: string,
    query: ListPlantsQuery,
  ): Promise<PaginatedResponse<PlantDto>> {
    return this.list(ownerId, { ...query, zoneId });
  }

  async get(ownerId: string, plantId: string): Promise<PlantDto> {
    const plant = await this.prisma.plant.findFirst({
      where: {
        id: plantId,
        deletedAt: null,
        zone: {
          deletedAt: null,
          garden: { ownerId, deletedAt: null },
        },
      },
      include: {
        zone: { select: { gardenId: true } },
        plantType: {
          select: { id: true, name: true, scientificName: true, category: true, iconKey: true },
        },
      },
    });
    if (!plant) {
      throw notFound('Рослину не знайдено');
    }
    return toPlantDto(plant);
  }

  async update(ownerId: string, plantId: string, input: UpdatePlantInput): Promise<PlantDto> {
    await this.ownership.requirePlant(plantId, ownerId);
    if (input.plantTypeId) {
      await this.requirePlantType(input.plantTypeId, ownerId);
    }

    const result = await this.prisma.plant.updateMany({
      where: { id: plantId, version: input.version, deletedAt: null },
      data: {
        plantTypeId: input.plantTypeId,
        name: input.name,
        variety: input.variety === undefined ? undefined : input.variety,
        description: input.description === undefined ? undefined : input.description,
        quantity: input.quantity,
        occupiedArea: input.occupiedArea === undefined ? undefined : input.occupiedArea,
        positionX: input.positionX === undefined ? undefined : input.positionX,
        positionY: input.positionY === undefined ? undefined : input.positionY,
        size: input.size === undefined ? undefined : input.size,
        rotation: input.rotation === undefined ? undefined : input.rotation,
        plantedAt:
          input.plantedAt === undefined
            ? undefined
            : input.plantedAt
              ? new Date(input.plantedAt)
              : null,
        expectedHarvestAt:
          input.expectedHarvestAt === undefined
            ? undefined
            : input.expectedHarvestAt
              ? new Date(input.expectedHarvestAt)
              : null,
        finishedAt:
          input.finishedAt === undefined
            ? undefined
            : input.finishedAt
              ? new Date(input.finishedAt)
              : null,
        status: input.status,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw conflict('Конфлікт версії. Оновіть дані й спробуйте знову');
    }

    return this.get(ownerId, plantId);
  }

  async softDelete(ownerId: string, plantId: string): Promise<MessageResponse> {
    await this.ownership.requirePlant(plantId, ownerId);
    await this.prisma.plant.update({
      where: { id: plantId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Рослину видалено' };
  }

  private async requirePlantType(plantTypeId: string, ownerId?: string): Promise<void> {
    const plantType = await this.prisma.plantType.findFirst({
      where: {
        id: plantTypeId,
        ...(ownerId ? { OR: [{ ownerId: null }, { ownerId }] } : {}),
      },
    });
    if (!plantType) {
      throw validationError({ plantTypeId: ['Тип рослини не знайдено'] });
    }
  }
}
