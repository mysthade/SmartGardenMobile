import { Injectable } from '@nestjs/common';
import type { PlantTypeDto } from '@smart-garden/types';
import type { CreatePlantTypeInput, ListPlantTypesQuery } from '@smart-garden/validation';
import { conflict, notFound } from '../common/errors/http-errors';
import { toPlantTypeDto } from '../common/mappers/garden.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlantTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    ownerId: string,
    query: ListPlantTypesQuery,
  ): Promise<{ data: PlantTypeDto[]; meta: { total: number; limit: number; offset: number } }> {
    const where = {
      AND: [
        {
          OR: [{ ownerId: null }, { ownerId }],
        },
        ...(query.category ? [{ category: query.category }] : []),
        ...(query.q
          ? [
              {
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' as const } },
                  { scientificName: { contains: query.q, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.plantType.findMany({
        where,
        orderBy: [{ ownerId: 'asc' }, { name: 'asc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.plantType.count({ where }),
    ]);

    return {
      data: rows.map(toPlantTypeDto),
      meta: { total, limit: query.limit, offset: query.offset },
    };
  }

  async get(ownerId: string, id: string): Promise<PlantTypeDto> {
    const plantType = await this.prisma.plantType.findFirst({
      where: {
        id,
        OR: [{ ownerId: null }, { ownerId }],
      },
    });
    if (!plantType) {
      throw notFound('Тип рослини не знайдено');
    }
    return toPlantTypeDto(plantType);
  }

  async create(ownerId: string, input: CreatePlantTypeInput): Promise<PlantTypeDto> {
    const existing = await this.prisma.plantType.findFirst({
      where: { ownerId, name: input.name },
    });
    if (existing) {
      throw conflict('Тип рослини з такою назвою вже існує');
    }

    const created = await this.prisma.plantType.create({
      data: {
        ownerId,
        name: input.name,
        scientificName: input.scientificName ?? null,
        description: input.description ?? null,
        category: input.category,
        iconKey: input.iconKey ?? null,
      },
    });

    return toPlantTypeDto(created);
  }
}
