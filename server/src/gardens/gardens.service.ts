import { Injectable } from '@nestjs/common';
import type { GardenDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import type {
  CreateGardenInput,
  ListGardensQuery,
  UpdateGardenInput,
} from '@smart-garden/validation';
import { Prisma } from '@prisma/client';
import { toGardenDto } from '../common/mappers/garden.mapper';
import { validationError } from '../common/errors/http-errors';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GardensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(ownerId: string, input: CreateGardenInput): Promise<GardenDto> {
    const garden = await this.prisma.garden.create({
      data: {
        ownerId,
        name: input.name,
        description: input.description ?? null,
        locationName: input.locationName ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        area: input.area ?? null,
      },
    });
    return toGardenDto(garden);
  }

  async list(ownerId: string, query: ListGardensQuery): Promise<PaginatedResponse<GardenDto>> {
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.GardenWhereInput = {
      ownerId,
      deletedAt: null,
      AND: [
        query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { locationName: { contains: query.q, mode: 'insensitive' } },
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

    const orderBy: Prisma.GardenOrderByWithRelationInput[] =
      query.sort === 'name'
        ? [{ name: query.order }, { id: query.order }]
        : query.sort === 'updatedAt'
          ? [{ updatedAt: query.order }, { id: query.order }]
          : [{ createdAt: query.order }, { id: query.order }];

    const rows = await this.prisma.garden.findMany({
      where,
      orderBy,
      take: query.limit + 1,
    });

    const meta = buildPaginationMeta(rows, query.limit);
    return {
      data: takePage(rows, query.limit).map(toGardenDto),
      meta,
    };
  }

  async get(ownerId: string, gardenId: string): Promise<GardenDto> {
    const garden = await this.ownership.requireGarden(gardenId, ownerId);
    return toGardenDto(garden);
  }

  async update(ownerId: string, gardenId: string, input: UpdateGardenInput): Promise<GardenDto> {
    await this.ownership.requireGarden(gardenId, ownerId);
    const garden = await this.prisma.garden.update({
      where: { id: gardenId },
      data: {
        name: input.name,
        description: input.description === undefined ? undefined : input.description,
        locationName: input.locationName === undefined ? undefined : input.locationName,
        latitude: input.latitude === undefined ? undefined : input.latitude,
        longitude: input.longitude === undefined ? undefined : input.longitude,
        area: input.area === undefined ? undefined : input.area,
      },
    });
    return toGardenDto(garden);
  }

  async softDelete(ownerId: string, gardenId: string): Promise<MessageResponse> {
    await this.ownership.requireGarden(gardenId, ownerId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const zones = await tx.gardenZone.findMany({
        where: { gardenId, deletedAt: null },
        select: { id: true },
      });
      const zoneIds = zones.map((zone) => zone.id);

      if (zoneIds.length > 0) {
        await tx.plant.updateMany({
          where: { zoneId: { in: zoneIds }, deletedAt: null },
          data: { deletedAt: now },
        });
        await tx.gardenZone.updateMany({
          where: { id: { in: zoneIds }, deletedAt: null },
          data: { deletedAt: now },
        });
      }

      await tx.garden.update({
        where: { id: gardenId },
        data: { deletedAt: now },
      });
    });

    return { message: 'Сад видалено' };
  }
}
