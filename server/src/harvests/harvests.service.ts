import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { HarvestDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import type {
  CreateHarvestInput,
  ListHarvestsQuery,
  UpdateHarvestInput,
} from '@smart-garden/validation';
import { validationError } from '../common/errors/http-errors';
import { toHarvestDto } from '../common/mappers/events.mapper';
import { toQuantityGrams } from '../common/utils/media.util';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HarvestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(ownerId: string, plantId: string, input: CreateHarvestInput): Promise<HarvestDto> {
    await this.ownership.requirePlant(plantId, ownerId);
    const harvest = await this.prisma.harvest.create({
      data: {
        plantId,
        harvestedAt: new Date(input.harvestedAt),
        quantity: input.quantity,
        unit: input.unit,
        damagedQuantity: input.damagedQuantity ?? null,
        quality: input.quality,
        notes: input.notes ?? null,
        quantityGrams: toQuantityGrams(input.quantity, input.unit),
      },
    });
    return toHarvestDto(harvest);
  }

  async list(
    ownerId: string,
    plantId: string,
    query: ListHarvestsQuery,
  ): Promise<PaginatedResponse<HarvestDto>> {
    await this.ownership.requirePlant(plantId, ownerId);
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const dateField = query.sort === 'createdAt' ? 'createdAt' : 'harvestedAt';
    const where: Prisma.HarvestWhereInput = {
      plantId,
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

    const rows = await this.prisma.harvest.findMany({
      where,
      orderBy: [{ [dateField]: query.order }, { id: query.order }],
      take: query.limit + 1,
    });

    const forMeta = rows.map((row) => ({
      id: row.id,
      createdAt: dateField === 'harvestedAt' ? row.harvestedAt : row.createdAt,
    }));

    return {
      data: takePage(rows, query.limit).map(toHarvestDto),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }

  async get(ownerId: string, harvestId: string): Promise<HarvestDto> {
    return toHarvestDto(await this.ownership.requireHarvest(harvestId, ownerId));
  }

  async update(ownerId: string, harvestId: string, input: UpdateHarvestInput): Promise<HarvestDto> {
    const existing = await this.ownership.requireHarvest(harvestId, ownerId);
    const quantity = input.quantity ?? existing.quantity.toString();
    const unit = input.unit ?? existing.unit;
    const harvest = await this.prisma.harvest.update({
      where: { id: harvestId },
      data: {
        harvestedAt: input.harvestedAt ? new Date(input.harvestedAt) : undefined,
        quantity: input.quantity,
        unit: input.unit,
        damagedQuantity: input.damagedQuantity === undefined ? undefined : input.damagedQuantity,
        quality: input.quality,
        notes: input.notes === undefined ? undefined : input.notes,
        quantityGrams: toQuantityGrams(quantity, unit),
      },
    });
    return toHarvestDto(harvest);
  }

  async remove(ownerId: string, harvestId: string): Promise<MessageResponse> {
    await this.ownership.requireHarvest(harvestId, ownerId);
    await this.prisma.harvest.delete({ where: { id: harvestId } });
    return { message: 'Урожай видалено' };
  }
}
