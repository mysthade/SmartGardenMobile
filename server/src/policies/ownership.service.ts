import { Injectable } from '@nestjs/common';
import type {
  Attachment,
  CareActivity,
  Garden,
  GardenPlan,
  GardenZone,
  Harvest,
  PlanObject,
  Plant,
  PlantJournalEntry,
  PlantProblem,
  Task,
} from '@prisma/client';
import { notFound } from '../common/errors/http-errors';
import { PrismaService } from '../prisma/prisma.service';

const ownedPlantFilter = (ownerId: string) => ({
  deletedAt: null as null,
  zone: {
    deletedAt: null as null,
    garden: { ownerId, deletedAt: null as null },
  },
});

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async requireGarden(gardenId: string, ownerId: string): Promise<Garden> {
    const garden = await this.prisma.garden.findFirst({
      where: { id: gardenId, ownerId, deletedAt: null },
    });
    if (!garden) {
      throw notFound('Сад не знайдено');
    }
    return garden;
  }

  async requireZone(zoneId: string, ownerId: string): Promise<GardenZone & { garden: Garden }> {
    const zone = await this.prisma.gardenZone.findFirst({
      where: {
        id: zoneId,
        deletedAt: null,
        garden: { ownerId, deletedAt: null },
      },
      include: { garden: true },
    });
    if (!zone) {
      throw notFound('Зону не знайдено');
    }
    return zone;
  }

  async requirePlant(
    plantId: string,
    ownerId: string,
  ): Promise<Plant & { zone: GardenZone & { garden: Garden } }> {
    const plant = await this.prisma.plant.findFirst({
      where: {
        id: plantId,
        ...ownedPlantFilter(ownerId),
      },
      include: {
        zone: { include: { garden: true } },
      },
    });
    if (!plant) {
      throw notFound('Рослину не знайдено');
    }
    return plant;
  }

  async requireJournalEntry(entryId: string, ownerId: string): Promise<PlantJournalEntry> {
    const entry = await this.prisma.plantJournalEntry.findFirst({
      where: {
        id: entryId,
        plant: ownedPlantFilter(ownerId),
      },
    });
    if (!entry) {
      throw notFound('Запис журналу не знайдено');
    }
    return entry;
  }

  async requireHarvest(harvestId: string, ownerId: string): Promise<Harvest> {
    const harvest = await this.prisma.harvest.findFirst({
      where: {
        id: harvestId,
        plant: ownedPlantFilter(ownerId),
      },
    });
    if (!harvest) {
      throw notFound('Урожай не знайдено');
    }
    return harvest;
  }

  async requireProblem(problemId: string, ownerId: string): Promise<PlantProblem> {
    const problem = await this.prisma.plantProblem.findFirst({
      where: {
        id: problemId,
        plant: ownedPlantFilter(ownerId),
      },
    });
    if (!problem) {
      throw notFound('Проблему не знайдено');
    }
    return problem;
  }

  async requireCareActivity(activityId: string, ownerId: string): Promise<CareActivity> {
    const activity = await this.prisma.careActivity.findFirst({
      where: {
        id: activityId,
        plant: ownedPlantFilter(ownerId),
      },
    });
    if (!activity) {
      throw notFound('Активність догляду не знайдено');
    }
    return activity;
  }

  async requireTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });
    if (!task) {
      throw notFound('Задачу не знайдено');
    }
    return task;
  }

  async requireAttachment(attachmentId: string, ownerId: string): Promise<Attachment> {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, ownerId, deletedAt: null },
    });
    if (!attachment) {
      throw notFound('Вкладення не знайдено');
    }
    return attachment;
  }

  async requireGardenPlan(
    planId: string,
    ownerId: string,
  ): Promise<GardenPlan & { garden: Garden }> {
    const plan = await this.prisma.gardenPlan.findFirst({
      where: {
        id: planId,
        garden: { ownerId, deletedAt: null },
      },
      include: { garden: true },
    });
    if (!plan) {
      throw notFound('План ділянки не знайдено');
    }
    return plan;
  }

  async requirePlanObject(
    objectId: string,
    ownerId: string,
  ): Promise<PlanObject & { plan: GardenPlan & { garden: Garden } }> {
    const obj = await this.prisma.planObject.findFirst({
      where: {
        id: objectId,
        plan: {
          garden: { ownerId, deletedAt: null },
        },
      },
      include: {
        plan: {
          include: { garden: true },
        },
      },
    });
    if (!obj) {
      throw notFound('Обʼєкт плану не знайдено');
    }
    return obj;
  }
}

