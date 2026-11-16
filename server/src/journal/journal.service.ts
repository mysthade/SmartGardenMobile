import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { JournalEntryDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import type {
  CreateJournalEntryInput,
  ListJournalQuery,
  UpdateJournalEntryInput,
} from '@smart-garden/validation';
import { validationError } from '../common/errors/http-errors';
import { toJournalEntryDto } from '../common/mappers/events.mapper';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(
    ownerId: string,
    plantId: string,
    input: CreateJournalEntryInput,
  ): Promise<JournalEntryDto> {
    await this.ownership.requirePlant(plantId, ownerId);
    const entry = await this.prisma.plantJournalEntry.create({
      data: {
        plantId,
        authorId: ownerId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        conditionScore: input.conditionScore ?? null,
        height: input.height ?? null,
        heightUnit: input.heightUnit ?? null,
        observedAt: new Date(input.observedAt),
      },
    });
    return toJournalEntryDto(entry);
  }

  async list(
    ownerId: string,
    plantId: string,
    query: ListJournalQuery,
  ): Promise<PaginatedResponse<JournalEntryDto>> {
    await this.ownership.requirePlant(plantId, ownerId);
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const dateField = query.sort === 'createdAt' ? 'createdAt' : 'observedAt';
    const where: Prisma.PlantJournalEntryWhereInput = {
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

    const rows = await this.prisma.plantJournalEntry.findMany({
      where,
      orderBy: [{ [dateField]: query.order }, { id: query.order }],
      take: query.limit + 1,
    });

    // Cursor encoding uses createdAt field name; map observedAt into that slot for continuity.
    const forMeta = rows.map((row) => ({
      id: row.id,
      createdAt: dateField === 'observedAt' ? row.observedAt : row.createdAt,
    }));

    return {
      data: takePage(rows, query.limit).map(toJournalEntryDto),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }

  async get(ownerId: string, entryId: string): Promise<JournalEntryDto> {
    const entry = await this.ownership.requireJournalEntry(entryId, ownerId);
    return toJournalEntryDto(entry);
  }

  async update(
    ownerId: string,
    entryId: string,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntryDto> {
    await this.ownership.requireJournalEntry(entryId, ownerId);
    const entry = await this.prisma.plantJournalEntry.update({
      where: { id: entryId },
      data: {
        type: input.type,
        title: input.title,
        description: input.description === undefined ? undefined : input.description,
        conditionScore: input.conditionScore === undefined ? undefined : input.conditionScore,
        height: input.height === undefined ? undefined : input.height,
        heightUnit: input.heightUnit === undefined ? undefined : input.heightUnit,
        observedAt: input.observedAt ? new Date(input.observedAt) : undefined,
      },
    });
    return toJournalEntryDto(entry);
  }

  async remove(ownerId: string, entryId: string): Promise<MessageResponse> {
    await this.ownership.requireJournalEntry(entryId, ownerId);
    await this.prisma.plantJournalEntry.delete({ where: { id: entryId } });
    return { message: 'Запис журналу видалено' };
  }
}
