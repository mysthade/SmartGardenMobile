import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ActivityItemDto,
  DashboardSummaryDto,
  HarvestListItemDto,
  JournalListItemDto,
  PaginatedResponse,
  ProblemListItemDto,
  ZoneListItemDto,
} from '@smart-garden/types';
import type {
  DashboardActivityQuery,
  ListAllHarvestsQuery,
  ListAllJournalQuery,
  ListAllProblemsQuery,
  ListAllZonesQuery,
} from '@smart-garden/validation';
import { toZoneDto } from '../common/mappers/garden.mapper';
import { toHarvestDto, toJournalEntryDto, toProblemDto } from '../common/mappers/events.mapper';
import { validationError } from '../common/errors/http-errors';
import { buildPaginationMeta, decodeCursor, takePage } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private plantOwnerWhere(ownerId: string): Prisma.PlantWhereInput {
    return {
      deletedAt: null,
      zone: {
        deletedAt: null,
        garden: { ownerId, deletedAt: null },
      },
    };
  }

  async summary(ownerId: string): Promise<DashboardSummaryDto> {
    const plantWhere = this.plantOwnerWhere(ownerId);
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const [
      gardensCount,
      zonesCount,
      plantsCount,
      activePlantsCount,
      openProblemsCount,
      tasksTodayCount,
      finishedCount,
      criticalPlantIds,
      nearestTask,
      harvests,
      problemPlantIds,
    ] = await Promise.all([
      this.prisma.garden.count({ where: { ownerId, deletedAt: null } }),
      this.prisma.gardenZone.count({
        where: { deletedAt: null, garden: { ownerId, deletedAt: null } },
      }),
      this.prisma.plant.count({ where: plantWhere }),
      this.prisma.plant.count({
        where: { ...plantWhere, status: { not: 'FINISHED' } },
      }),
      this.prisma.plantProblem.count({
        where: { status: { not: 'RESOLVED' }, plant: plantWhere },
      }),
      this.prisma.task.count({
        where: {
          userId: ownerId,
          deletedAt: null,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.plant.count({ where: { ...plantWhere, status: 'FINISHED' } }),
      this.prisma.plantProblem.findMany({
        where: {
          severity: 'CRITICAL',
          status: { not: 'RESOLVED' },
          plant: plantWhere,
        },
        select: { plantId: true },
        distinct: ['plantId'],
      }),
      this.prisma.task.findFirst({
        where: {
          userId: ownerId,
          deletedAt: null,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
        orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
      }),
      this.prisma.harvest.findMany({
        where: {
          harvestedAt: { gte: yearStart },
          plant: plantWhere,
          unit: { in: ['GRAM', 'KILOGRAM'] },
        },
        select: { quantity: true, unit: true },
      }),
      this.prisma.plantProblem.findMany({
        where: { status: { not: 'RESOLVED' }, plant: plantWhere },
        select: { plantId: true },
        distinct: ['plantId'],
      }),
    ]);

    const criticalSet = new Set(criticalPlantIds.map((p) => p.plantId));
    const attentionSet = new Set(problemPlantIds.map((p) => p.plantId));
    const critical = criticalSet.size;
    const attention = [...attentionSet].filter((id) => !criticalSet.has(id)).length;
    const ok = Math.max(0, plantsCount - finishedCount - attention - critical);

    let seasonHarvestGrams = 0;
    for (const h of harvests) {
      const qty = Number(h.quantity);
      if (!Number.isFinite(qty)) {
        continue;
      }
      seasonHarvestGrams += h.unit === 'KILOGRAM' ? qty * 1000 : qty;
    }

    return {
      gardensCount,
      zonesCount,
      plantsCount,
      activePlantsCount,
      openProblemsCount,
      tasksTodayCount,
      seasonHarvestGrams: Math.round(seasonHarvestGrams),
      nearestOpenTask: nearestTask
        ? {
            id: nearestTask.id,
            title: nearestTask.title,
            dueAt: nearestTask.dueAt?.toISOString() ?? null,
            priority: nearestTask.priority,
          }
        : null,
      gardenHealth: { ok, attention, critical, finished: finishedCount },
    };
  }

  async activity(
    ownerId: string,
    query: DashboardActivityQuery,
  ): Promise<PaginatedResponse<ActivityItemDto>> {
    const plantWhere = this.plantOwnerWhere(ownerId);
    const limit = query.limit;

    const [plants, journals, harvests, problems, tasks] = await Promise.all([
      this.prisma.plant.findMany({
        where: plantWhere,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 20),
        select: {
          id: true,
          name: true,
          createdAt: true,
          zone: { select: { gardenId: true } },
        },
      }),
      this.prisma.plantJournalEntry.findMany({
        where: { plant: plantWhere },
        orderBy: { observedAt: 'desc' },
        take: Math.min(limit, 20),
        select: {
          id: true,
          title: true,
          type: true,
          observedAt: true,
          plantId: true,
          plant: { select: { name: true, zone: { select: { gardenId: true } } } },
        },
      }),
      this.prisma.harvest.findMany({
        where: { plant: plantWhere },
        orderBy: { harvestedAt: 'desc' },
        take: Math.min(limit, 20),
        select: {
          id: true,
          quantity: true,
          unit: true,
          harvestedAt: true,
          plantId: true,
          plant: { select: { name: true, zone: { select: { gardenId: true } } } },
        },
      }),
      this.prisma.plantProblem.findMany({
        where: { plant: plantWhere },
        orderBy: { detectedAt: 'desc' },
        take: Math.min(limit, 20),
        select: {
          id: true,
          title: true,
          severity: true,
          detectedAt: true,
          plantId: true,
          plant: { select: { name: true, zone: { select: { gardenId: true } } } },
        },
      }),
      this.prisma.task.findMany({
        where: { userId: ownerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 20),
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          completedAt: true,
          gardenId: true,
          plantId: true,
        },
      }),
    ]);

    const items: ActivityItemDto[] = [
      ...plants.map((p) => ({
        id: `plant-${p.id}`,
        type: 'PLANT_CREATED' as const,
        title: `Додано рослину «${p.name}»`,
        description: null,
        occurredAt: p.createdAt.toISOString(),
        href: `/plants/${p.id}`,
        plantId: p.id,
        gardenId: p.zone.gardenId,
      })),
      ...journals.map((j) => ({
        id: `journal-${j.id}`,
        type: 'JOURNAL' as const,
        title: j.title,
        description: `${j.plant.name} · ${j.type}`,
        occurredAt: j.observedAt.toISOString(),
        href: `/plants/${j.plantId}?tab=journal`,
        plantId: j.plantId,
        gardenId: j.plant.zone.gardenId,
      })),
      ...harvests.map((h) => ({
        id: `harvest-${h.id}`,
        type: 'HARVEST' as const,
        title: `Урожай: ${h.quantity} ${h.unit}`,
        description: h.plant.name,
        occurredAt: h.harvestedAt.toISOString(),
        href: `/plants/${h.plantId}?tab=harvests`,
        plantId: h.plantId,
        gardenId: h.plant.zone.gardenId,
      })),
      ...problems.map((p) => ({
        id: `problem-${p.id}`,
        type: 'PROBLEM' as const,
        title: p.title,
        description: `${p.plant.name} · ${p.severity}`,
        occurredAt: p.detectedAt.toISOString(),
        href: `/plants/${p.plantId}?tab=problems`,
        plantId: p.plantId,
        gardenId: p.plant.zone.gardenId,
      })),
      ...tasks.map((t) => ({
        id: `task-${t.id}`,
        type: 'TASK' as const,
        title: t.status === 'DONE' ? `Виконано: ${t.title}` : `Завдання: ${t.title}`,
        description: t.status,
        occurredAt: (t.completedAt ?? t.createdAt).toISOString(),
        href: '/tasks',
        plantId: t.plantId,
        gardenId: t.gardenId,
      })),
    ];

    items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const page = items.slice(0, limit);
    return {
      data: page,
      meta: {
        nextCursor: null,
        hasMore: items.length > limit,
        limit,
      },
    };
  }

  async listZones(
    ownerId: string,
    query: ListAllZonesQuery,
  ): Promise<PaginatedResponse<ZoneListItemDto>> {
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.GardenZoneWhereInput = {
      deletedAt: null,
      garden: { ownerId, deletedAt: null },
      ...(query.type ? { type: query.type } : {}),
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

    const rows = await this.prisma.gardenZone.findMany({
      where,
      orderBy: [{ createdAt: query.order }, { id: query.order }],
      take: query.limit + 1,
      include: {
        garden: { select: { name: true } },
        _count: { select: { plants: { where: { deletedAt: null } } } },
      },
    });

    return {
      data: takePage(rows, query.limit).map((row) => ({
        ...toZoneDto(row),
        gardenName: row.garden.name,
        plantCount: row._count.plants,
      })),
      meta: buildPaginationMeta(rows, query.limit),
    };
  }

  async listJournal(
    ownerId: string,
    query: ListAllJournalQuery,
  ): Promise<PaginatedResponse<JournalListItemDto>> {
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.PlantJournalEntryWhereInput = {
      plant: this.plantOwnerWhere(ownerId),
      ...(query.type ? { type: query.type } : {}),
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { plant: { name: { contains: query.q, mode: 'insensitive' } } },
              ],
            }
          : {},
        cursor
          ? {
              OR: [
                { observedAt: { lt: new Date(cursor.createdAt) } },
                { observedAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };

    const rows = await this.prisma.plantJournalEntry.findMany({
      where,
      orderBy: [{ observedAt: query.order }, { id: query.order }],
      take: query.limit + 1,
      include: { plant: { select: { id: true, name: true } } },
    });

    const forMeta = rows.map((row) => ({ id: row.id, createdAt: row.observedAt }));

    return {
      data: takePage(rows, query.limit).map((row) => ({
        ...toJournalEntryDto(row),
        plantName: row.plant.name,
        plantId: row.plant.id,
      })),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }

  async listHarvests(
    ownerId: string,
    query: ListAllHarvestsQuery,
  ): Promise<PaginatedResponse<HarvestListItemDto>> {
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.HarvestWhereInput = {
      plant: this.plantOwnerWhere(ownerId),
      AND: [
        query.q ? { plant: { name: { contains: query.q, mode: 'insensitive' } } } : {},
        cursor
          ? {
              OR: [
                { harvestedAt: { lt: new Date(cursor.createdAt) } },
                { harvestedAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };

    const rows = await this.prisma.harvest.findMany({
      where,
      orderBy: [{ harvestedAt: query.order }, { id: query.order }],
      take: query.limit + 1,
      include: { plant: { select: { id: true, name: true } } },
    });

    const forMeta = rows.map((row) => ({ id: row.id, createdAt: row.harvestedAt }));

    return {
      data: takePage(rows, query.limit).map((row) => ({
        ...toHarvestDto(row),
        plantName: row.plant.name,
        plantId: row.plant.id,
      })),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }

  async listProblems(
    ownerId: string,
    query: ListAllProblemsQuery,
  ): Promise<PaginatedResponse<ProblemListItemDto>> {
    const cursor = decodeCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw validationError({ cursor: ['Некоректний cursor'] });
    }

    const where: Prisma.PlantProblemWhereInput = {
      plant: this.plantOwnerWhere(ownerId),
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { plant: { name: { contains: query.q, mode: 'insensitive' } } },
              ],
            }
          : {},
        cursor
          ? {
              OR: [
                { detectedAt: { lt: new Date(cursor.createdAt) } },
                { detectedAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };

    const rows = await this.prisma.plantProblem.findMany({
      where,
      orderBy: [{ detectedAt: query.order }, { id: query.order }],
      take: query.limit + 1,
      include: { plant: { select: { id: true, name: true } } },
    });

    const forMeta = rows.map((row) => ({ id: row.id, createdAt: row.detectedAt }));

    return {
      data: takePage(rows, query.limit).map((row) => ({
        ...toProblemDto(row),
        plantName: row.plant.name,
        plantId: row.plant.id,
      })),
      meta: buildPaginationMeta(forMeta, query.limit),
    };
  }
}
