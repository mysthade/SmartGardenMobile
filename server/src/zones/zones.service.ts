import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MessageResponse, PaginatedResponse, ZoneDto } from '@smart-garden/types';
import type { CreateZoneInput, ListZonesQuery, UpdateZoneInput } from '@smart-garden/validation';
import { defaultZoneSettings } from '@smart-garden/validation';
import { toZoneDto } from '../common/mappers/garden.mapper';
import { validationError } from '../common/errors/http-errors';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(ownerId: string, gardenId: string, input: CreateZoneInput): Promise<ZoneDto> {
    await this.ownership.requireGarden(gardenId, ownerId);
    const settings = input.settings ?? defaultZoneSettings(input.type);
    const zone = await this.prisma.gardenZone.create({
      data: {
        gardenId,
        name: input.name,
        type: input.type,
        description: input.description ?? null,
        area: input.area ?? null,
        positionX: input.positionX ?? null,
        positionY: input.positionY ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        color: input.color ?? null,
        settings: settings as Prisma.InputJsonValue,
      },
    });
    return toZoneDto(zone);
  }

  async listByGarden(
    ownerId: string,
    gardenId: string,
    query: ListZonesQuery,
  ): Promise<PaginatedResponse<ZoneDto>> {
    await this.ownership.requireGarden(gardenId, ownerId);
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.GardenZoneWhereInput = {
      gardenId,
      deletedAt: null,
      AND: [
        query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {},
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

    const orderBy: Prisma.GardenZoneOrderByWithRelationInput[] =
      query.sort === 'name'
        ? [{ name: query.order }, { id: query.order }]
        : query.sort === 'updatedAt'
          ? [{ updatedAt: query.order }, { id: query.order }]
          : [{ createdAt: query.order }, { id: query.order }];

    const rows = await this.prisma.gardenZone.findMany({
      where,
      orderBy,
      take: query.limit + 1,
    });

    return {
      data: takePage(rows, query.limit).map(toZoneDto),
      meta: buildPaginationMeta(rows, query.limit),
    };
  }

  async get(ownerId: string, zoneId: string): Promise<ZoneDto> {
    const zone = await this.ownership.requireZone(zoneId, ownerId);
    return toZoneDto(zone);
  }

  async update(ownerId: string, zoneId: string, input: UpdateZoneInput): Promise<ZoneDto> {
    await this.ownership.requireZone(zoneId, ownerId);
    const zone = await this.prisma.gardenZone.update({
      where: { id: zoneId },
      data: {
        name: input.name,
        type: input.type,
        description: input.description === undefined ? undefined : input.description,
        area: input.area === undefined ? undefined : input.area,
        positionX: input.positionX === undefined ? undefined : input.positionX,
        positionY: input.positionY === undefined ? undefined : input.positionY,
        width: input.width === undefined ? undefined : input.width,
        height: input.height === undefined ? undefined : input.height,
        color: input.color === undefined ? undefined : input.color,
        settings:
          input.settings === undefined ? undefined : (input.settings as Prisma.InputJsonValue),
      },
    });
    return toZoneDto(zone);
  }

  async softDelete(ownerId: string, zoneId: string): Promise<MessageResponse> {
    await this.ownership.requireZone(zoneId, ownerId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.plant.updateMany({
        where: { zoneId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.gardenZone.update({
        where: { id: zoneId },
        data: { deletedAt: now },
      }),
    ]);
    return { message: 'Зону видалено' };
  }
}
