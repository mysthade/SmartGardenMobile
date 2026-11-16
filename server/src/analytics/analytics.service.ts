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
  openTasksCount: number;
  harvestByMassGrams: HarvestSeriesPoint[];
  harvestByPieces: HarvestSeriesPoint[];
  harvestByLiters: HarvestSeriesPoint[];
  plantsByStatus: Array<{ status: string; count: number }>;
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

    const [
      gardensCount,
      zonesCount,
      plantsCount,
      openProblemsCount,
      openTasksCount,
      plantsByStatus,
      harvests,
    ] = await Promise.all([
      this.prisma.garden.count({
        where: { ownerId, deletedAt: null, ...(gardenId ? { id: gardenId } : {}) },
      }),
      this.prisma.gardenZone.count({
        where: {
          deletedAt: null,
          garden: { ownerId, deletedAt: null, ...(gardenId ? { id: gardenId } : {}) },
        },
      }),
      this.prisma.plant.count({ where: plantWhere }),
      this.prisma.plantProblem.count({
        where: {
          status: { not: 'RESOLVED' },
          plant: plantWhere,
        },
      }),
      this.prisma.task.count({
        where: {
          userId: ownerId,
          deletedAt: null,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          ...(gardenId ? { gardenId } : {}),
        },
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
      openTasksCount,
      ...series,
      plantsByStatus: plantsByStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
    };
  }
}
