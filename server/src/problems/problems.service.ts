import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MessageResponse, PaginatedResponse, ProblemDto } from '@smart-garden/types';
import type {
  CreateProblemInput,
  ListProblemsQuery,
  UpdateProblemInput,
} from '@smart-garden/validation';
import { validationError } from '../common/errors/http-errors';
import { toProblemDto } from '../common/mappers/events.mapper';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(ownerId: string, plantId: string, input: CreateProblemInput): Promise<ProblemDto> {
    await this.ownership.requirePlant(plantId, ownerId);
    const problem = await this.prisma.$transaction(async (tx) => {
      const created = await tx.plantProblem.create({
        data: {
          plantId,
          title: input.title,
          description: input.description ?? null,
          suspectedCause: input.suspectedCause ?? null,
          severity: input.severity,
          status: input.status,
          detectedAt: new Date(input.detectedAt),
          resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
          solution: input.solution ?? null,
        },
      });
      if (created.status !== 'RESOLVED') {
        await tx.plant.update({
          where: { id: plantId },
          data: { status: 'HAS_PROBLEM' },
        });
      }
      return created;
    });
    return toProblemDto(problem);
  }

  async list(
    ownerId: string,
    plantId: string,
    query: ListProblemsQuery,
  ): Promise<PaginatedResponse<ProblemDto>> {
    await this.ownership.requirePlant(plantId, ownerId);
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const dateField = query.sort === 'createdAt' ? 'createdAt' : 'detectedAt';
    const where: Prisma.PlantProblemWhereInput = {
      plantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
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

    const orderBy: Prisma.PlantProblemOrderByWithRelationInput[] =
      query.sort === 'severity'
        ? [{ severity: query.order }, { id: query.order }]
        : [{ [dateField]: query.order }, { id: query.order }];

    const rows = await this.prisma.plantProblem.findMany({
      where,
      orderBy,
      take: query.limit + 1,
    });

    const forMeta = rows.map((row) => ({
      id: row.id,
      createdAt: dateField === 'detectedAt' ? row.detectedAt : row.createdAt,
    }));

    return {
      data: takePage(rows, query.limit).map(toProblemDto),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }

  async get(ownerId: string, problemId: string): Promise<ProblemDto> {
    return toProblemDto(await this.ownership.requireProblem(problemId, ownerId));
  }

  async update(ownerId: string, problemId: string, input: UpdateProblemInput): Promise<ProblemDto> {
    const existing = await this.ownership.requireProblem(problemId, ownerId);
    const nextStatus = input.status ?? existing.status;

    const problem = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.plantProblem.update({
        where: { id: problemId },
        data: {
          title: input.title,
          description: input.description === undefined ? undefined : input.description,
          suspectedCause: input.suspectedCause === undefined ? undefined : input.suspectedCause,
          severity: input.severity,
          status: input.status,
          detectedAt: input.detectedAt ? new Date(input.detectedAt) : undefined,
          resolvedAt:
            input.resolvedAt === undefined
              ? nextStatus === 'RESOLVED' && !existing.resolvedAt
                ? new Date()
                : undefined
              : input.resolvedAt
                ? new Date(input.resolvedAt)
                : null,
          solution: input.solution === undefined ? undefined : input.solution,
        },
      });

      await this.syncPlantProblemStatus(tx, existing.plantId);
      return updated;
    });

    return toProblemDto(problem);
  }

  async remove(ownerId: string, problemId: string): Promise<MessageResponse> {
    const existing = await this.ownership.requireProblem(problemId, ownerId);
    await this.prisma.$transaction(async (tx) => {
      await tx.plantProblem.delete({ where: { id: problemId } });
      await this.syncPlantProblemStatus(tx, existing.plantId);
    });
    return { message: 'Проблему видалено' };
  }

  private async syncPlantProblemStatus(
    tx: Prisma.TransactionClient,
    plantId: string,
  ): Promise<void> {
    const openCount = await tx.plantProblem.count({
      where: { plantId, status: { not: 'RESOLVED' } },
    });
    if (openCount > 0) {
      await tx.plant.update({
        where: { id: plantId },
        data: { status: 'HAS_PROBLEM' },
      });
      return;
    }

    const plant = await tx.plant.findUnique({ where: { id: plantId } });
    if (plant?.status === 'HAS_PROBLEM') {
      await tx.plant.update({
        where: { id: plantId },
        data: { status: 'GROWING' },
      });
    }
  }
}
