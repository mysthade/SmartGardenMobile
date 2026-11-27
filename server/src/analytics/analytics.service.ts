import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';
import { aggregateHarvestSeries, type SeriesPoint } from './harvest-aggregation';

export type HarvestSeriesPoint = SeriesPoint;

export type AnalyticsSummary = {
  gardensCount: number;
  zonesCount: number;
  plantsCount: number;
  openProblemsCount: number;
  resolvedProblemsCount: number;
  openTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  careLast30DaysCount: number;
  totalAreaSqM: number;
  harvestByMassGrams: HarvestSeriesPoint[];
  harvestByPieces: HarvestSeriesPoint[];
  harvestByLiters: HarvestSeriesPoint[];
  plantsByStatus: Array<{ status: string; count: number }>;
  careByType: Array<{ type: string; count: number }>;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async summary(ownerId: string, gardenId?: string): Promise<AnalyticsSummary> {
    if (gardenId) {
      await this.ownership.requireGarden(gardenId, ownerId);
    }

    const plantWhere: Prisma.PlantWhereInput = {
      deletedAt: null,
      zone: {
        deletedAt: null,
        garden: {
          ownerId,
          deletedAt: null,
          ...(gardenId ? { id: gardenId } : {}),
        },
      },
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const zoneWhere: Prisma.GardenZoneWhereInput = {
      deletedAt: null,
      garden: { ownerId, deletedAt: null, ...(gardenId ? { id: gardenId } : {}) },
    };
    const taskBaseWhere: Prisma.TaskWhereInput = {
      userId: ownerId,
      deletedAt: null,
      ...(gardenId ? { gardenId } : {}),
    };

    const [
      gardensCount,
      zonesCount,
      zoneAreaAgg,
      plantsCount,
      openProblemsCount,
      resolvedProblemsCount,
      openTasksCount,
      completedTasksCount,
      overdueTasksCount,
      careLast30DaysCount,
      careByType,
      plantsByStatus,
      harvests,
    ] = await Promise.all([
      this.prisma.garden.count({
        where: { ownerId, deletedAt: null, ...(gardenId ? { id: gardenId } : {}) },
      }),
      this.prisma.gardenZone.count({ where: zoneWhere }),
      this.prisma.gardenZone.aggregate({
        where: zoneWhere,
        _sum: { area: true },
      }),
      this.prisma.plant.count({ where: plantWhere }),
      this.prisma.plantProblem.count({
        where: {
          status: { not: 'RESOLVED' },
          plant: plantWhere,
        },
      }),
      this.prisma.plantProblem.count({
        where: {
          status: 'RESOLVED',
          plant: plantWhere,
        },
      }),
      this.prisma.task.count({
        where: {
          ...taskBaseWhere,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.task.count({
        where: {
          ...taskBaseWhere,
          status: 'DONE',
        },
      }),
      this.prisma.task.count({
        where: {
          ...taskBaseWhere,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueAt: { lt: now },
        },
      }),
      this.prisma.careActivity.count({
        where: {
          plant: plantWhere,
          performedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.careActivity.groupBy({
        by: ['type'],
        where: { plant: plantWhere },
        _count: { _all: true },
      }),
      this.prisma.plant.groupBy({
        by: ['status'],
        where: plantWhere,
        _count: { _all: true },
      }),
      this.prisma.harvest.findMany({
        where: { plant: plantWhere },
        select: {
          harvestedAt: true,
          quantity: true,
          unit: true,
          quantityGrams: true,
        },
        orderBy: { harvestedAt: 'asc' },
      }),
    ]);

    const series = aggregateHarvestSeries(
      harvests.map((row) => ({
        harvestedAt: row.harvestedAt,
        quantity: row.quantity.toString(),
        unit: row.unit,
        quantityGrams: row.quantityGrams?.toString() ?? null,
      })),
    );

    return {
      gardensCount,
      zonesCount,
      plantsCount,
      openProblemsCount,
      resolvedProblemsCount,
      openTasksCount,
      completedTasksCount,
      overdueTasksCount,
      careLast30DaysCount,
      totalAreaSqM: Number(zoneAreaAgg._sum.area ?? 0),
      ...series,
      plantsByStatus: plantsByStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      careByType: careByType.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
    };
  }
}
