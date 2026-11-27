import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  GardenPlanDetailsDto,
  GardenPlanDto,
  MessageResponse,
  PlanObjectDto,
  SaveGardenPlanResponse,
} from '@smart-garden/types';
import {
  MAX_PLAN_OBJECTS,
  type BatchPlanObjectsInput,
  type CreateGardenPlanInput,
  type CreatePlanObjectInput,
  type DuplicateGardenPlanInput,
  type UpdateGardenPlanInput,
  type UpdatePlanObjectInput,
} from '@smart-garden/validation';
import { conflict, validationError } from '../common/errors/http-errors';
import {
  toGardenPlanDetailsDto,
  toGardenPlanDto,
  toPlanObjectDto,
} from '../common/mappers/garden-plan.mapper';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GardenPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async list(ownerId: string, gardenId: string): Promise<GardenPlanDto[]> {
    await this.ownership.requireGarden(gardenId, ownerId);

    const plans = await this.prisma.gardenPlan.findMany({
      where: {
        gardenId,
        deletedAt: null,
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    return plans.map(toGardenPlanDto);
  }

  async getActive(ownerId: string, gardenId: string): Promise<GardenPlanDetailsDto> {
    const garden = await this.ownership.requireGarden(gardenId, ownerId);

    let plan = await this.prisma.gardenPlan.findFirst({
      where: {
        gardenId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        objects: {
          where: { deletedAt: null },
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    if (!plan) {
      plan = await this.prisma.gardenPlan.findFirst({
        where: {
          gardenId,
          deletedAt: null,
        },
        include: {
          objects: {
            where: { deletedAt: null },
            orderBy: { zIndex: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!plan) {
      // Автостворення плану за замовчуванням (якщо план ще не створений для саду)
      const defaultWidthCm = garden.mapWidth ? Math.round(Number(garden.mapWidth) * 100) : 5000;
      const defaultHeightCm = garden.mapHeight ? Math.round(Number(garden.mapHeight) * 100) : 5000;

      plan = await this.prisma.gardenPlan.create({
        data: {
          gardenId,
          name: 'Основний план',
          widthCm: Math.max(100, defaultWidthCm),
          heightCm: Math.max(100, defaultHeightCm),
          isActive: true,
          version: 1,
        },
        include: {
          objects: {
            where: { deletedAt: null },
            orderBy: { zIndex: 'asc' },
          },
        },
      });
    }

    return toGardenPlanDetailsDto(plan, plan.objects);
  }

  async get(ownerId: string, planId: string): Promise<GardenPlanDetailsDto> {
    await this.ownership.requireGardenPlan(planId, ownerId);

    const plan = await this.prisma.gardenPlan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        objects: {
          where: { deletedAt: null },
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    return toGardenPlanDetailsDto(plan, plan.objects);
  }

  async create(
    ownerId: string,
    gardenId: string,
    input: CreateGardenPlanInput,
  ): Promise<GardenPlanDto> {
    await this.ownership.requireGarden(gardenId, ownerId);

    const plan = await this.prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await tx.gardenPlan.updateMany({
          where: { gardenId, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.gardenPlan.create({
        data: {
          gardenId,
          name: input.name,
          widthCm: input.widthCm,
          heightCm: input.heightCm,
          boundary: input.boundary ? (input.boundary as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          northAngleDeg: input.northAngleDeg,
          gridSizeCm: input.gridSizeCm,
          isActive: input.isActive,
          version: 1,
        },
      });
    });

    return toGardenPlanDto(plan);
  }

  async update(
    ownerId: string,
    planId: string,
    input: UpdateGardenPlanInput,
  ): Promise<GardenPlanDto> {
    const existing = await this.ownership.requireGardenPlan(planId, ownerId);

    if (input.version !== undefined && existing.version !== input.version) {
      throw conflict('План саду змінено в іншій сесії. Оновіть дані перед збереженням.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await tx.gardenPlan.updateMany({
          where: { gardenId: existing.gardenId, isActive: true, id: { not: planId } },
          data: { isActive: false },
        });
      }

      return tx.gardenPlan.update({
        where: { id: planId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.widthCm !== undefined ? { widthCm: input.widthCm } : {}),
          ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
          ...(input.boundary !== undefined
            ? { boundary: input.boundary ? (input.boundary as unknown as Prisma.InputJsonValue) : Prisma.JsonNull }
            : {}),
          ...(input.northAngleDeg !== undefined ? { northAngleDeg: input.northAngleDeg } : {}),
          ...(input.gridSizeCm !== undefined ? { gridSizeCm: input.gridSizeCm } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          version: { increment: 1 },
        },
      });
    });

    return toGardenPlanDto(updated);
  }

  async delete(ownerId: string, planId: string): Promise<MessageResponse> {
    const existing = await this.ownership.requireGardenPlan(planId, ownerId);

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.planObject.updateMany({
        where: { planId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.gardenPlan.update({
        where: { id: planId },
        data: { deletedAt: now, isActive: false },
      });

      if (existing.isActive) {
        const nextActive = await tx.gardenPlan.findFirst({
          where: { gardenId: existing.gardenId, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });

        if (nextActive) {
          await tx.gardenPlan.update({
            where: { id: nextActive.id },
            data: { isActive: true },
          });
        }
      }
    });

    return { message: 'План саду успішно видалено' };
  }

  async duplicate(
    ownerId: string,
    planId: string,
    input: DuplicateGardenPlanInput,
  ): Promise<GardenPlanDetailsDto> {
    const _sourcePlan = await this.ownership.requireGardenPlan(planId, ownerId);

    const fullSource = await this.prisma.gardenPlan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        objects: {
          where: { deletedAt: null },
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    const newPlan = await this.prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await tx.gardenPlan.updateMany({
          where: { gardenId: fullSource.gardenId, isActive: true },
          data: { isActive: false },
        });
      }

      const createdPlan = await tx.gardenPlan.create({
        data: {
          gardenId: fullSource.gardenId,
          name: input.name ?? `${fullSource.name} (копія)`,
          widthCm: fullSource.widthCm,
          heightCm: fullSource.heightCm,
          boundary: fullSource.boundary ? (fullSource.boundary as Prisma.InputJsonValue) : Prisma.JsonNull,
          northAngleDeg: fullSource.northAngleDeg,
          gridSizeCm: fullSource.gridSizeCm,
          version: 1,
          isActive: input.isActive ?? false,
        },
      });

      if (fullSource.objects.length > 0) {
        await tx.planObject.createMany({
          data: fullSource.objects.map((obj) => ({
            planId: createdPlan.id,
            type: obj.type,
            label: obj.label,
            xCm: obj.xCm,
            yCm: obj.yCm,
            widthCm: obj.widthCm,
            heightCm: obj.heightCm,
            rotationDeg: obj.rotationDeg,
            zIndex: obj.zIndex,
            layer: obj.layer,
            color: obj.color,
            locked: obj.locked,
            meta: obj.meta ? (obj.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
            zoneId: obj.zoneId,
            plantId: obj.plantId,
          })),
        });
      }

      return tx.gardenPlan.findUniqueOrThrow({
        where: { id: createdPlan.id },
        include: {
          objects: {
            where: { deletedAt: null },
            orderBy: { zIndex: 'asc' },
          },
        },
      });
    });

    return toGardenPlanDetailsDto(newPlan, newPlan.objects);
  }

  async saveObjects(
    ownerId: string,
    planId: string,
    input: BatchPlanObjectsInput,
  ): Promise<SaveGardenPlanResponse> {
    const existing = await this.ownership.requireGardenPlan(planId, ownerId);

    if (existing.version !== input.version) {
      throw conflict('План саду змінено в іншій сесії. Оновіть дані з сервера перед збереженням.');
    }

    const currentCount = await this.prisma.planObject.count({
      where: { planId, deletedAt: null },
    });

    const deleteCount = input.objects.filter((o) => o.op === 'delete').length;
    const addCount = input.objects.filter((o) => o.op !== 'delete' && !o.id).length;
    const projectedCount = currentCount - deleteCount + addCount;

    if (projectedCount > MAX_PLAN_OBJECTS) {
      throw validationError(
        { objects: [`Перевищено ліміт ${MAX_PLAN_OBJECTS} обʼєктів на один план`] },
        'Забагато обʼєктів на плані',
      );
    }

    const idMap: Record<string, string> = {};

    const updatedPlan = await this.prisma.$transaction(async (tx) => {
      // 1. Оновлення параметрів плану, якщо передано
      if (input.planUpdate) {
        const pu = input.planUpdate;
        await tx.gardenPlan.update({
          where: { id: planId },
          data: {
            ...(pu.name !== undefined ? { name: pu.name } : {}),
            ...(pu.widthCm !== undefined ? { widthCm: pu.widthCm } : {}),
            ...(pu.heightCm !== undefined ? { heightCm: pu.heightCm } : {}),
            ...(pu.boundary !== undefined
              ? { boundary: pu.boundary ? (pu.boundary as unknown as Prisma.InputJsonValue) : Prisma.JsonNull }
              : {}),
            ...(pu.northAngleDeg !== undefined ? { northAngleDeg: pu.northAngleDeg } : {}),
            ...(pu.gridSizeCm !== undefined ? { gridSizeCm: pu.gridSizeCm } : {}),
            ...(pu.isActive !== undefined ? { isActive: pu.isActive } : {}),
          },
        });
      }

      // 2. Видалення об'єктів
      const deleteIds = input.objects
        .filter((o) => o.op === 'delete' && o.id)
        .map((o) => o.id as string);

      if (deleteIds.length > 0) {
        await tx.planObject.updateMany({
          where: { id: { in: deleteIds }, planId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }

      // 3. Upsert об'єктів
      const upserts = input.objects.filter((o) => o.op !== 'delete');
      for (const item of upserts) {
        if (item.id) {
          await tx.planObject.update({
            where: { id: item.id },
            data: {
              ...(item.type ? { type: item.type } : {}),
              ...(item.label !== undefined ? { label: item.label } : {}),
              ...(item.xCm !== undefined ? { xCm: item.xCm } : {}),
              ...(item.yCm !== undefined ? { yCm: item.yCm } : {}),
              ...(item.widthCm !== undefined ? { widthCm: item.widthCm } : {}),
              ...(item.heightCm !== undefined ? { heightCm: item.heightCm } : {}),
              ...(item.rotationDeg !== undefined ? { rotationDeg: item.rotationDeg } : {}),
              ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
              ...(item.layer ? { layer: item.layer } : {}),
              ...(item.color !== undefined ? { color: item.color } : {}),
              ...(item.locked !== undefined ? { locked: item.locked } : {}),
              ...(item.meta !== undefined
                ? { meta: item.meta ? (item.meta as Prisma.InputJsonValue) : Prisma.JsonNull }
                : {}),
              ...(item.zoneId !== undefined ? { zoneId: item.zoneId } : {}),
              ...(item.plantId !== undefined ? { plantId: item.plantId } : {}),
            },
          });
        } else {
          const created = await tx.planObject.create({
            data: {
              planId,
              type: item.type!,
              label: item.label ?? 'Обʼєкт',
              xCm: item.xCm!,
              yCm: item.yCm!,
              widthCm: item.widthCm!,
              heightCm: item.heightCm!,
              rotationDeg: item.rotationDeg ?? 0,
              zIndex: item.zIndex ?? 0,
              layer: item.layer ?? 'OTHER',
              color: item.color ?? null,
              locked: item.locked ?? false,
              meta: item.meta ? (item.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
              zoneId: item.zoneId ?? null,
              plantId: item.plantId ?? null,
            },
          });

          if (item.clientId) {
            idMap[item.clientId] = created.id;
          }
        }
      }

      // 4. Інкремент версії плану
      return tx.gardenPlan.update({
        where: { id: planId },
        data: { version: { increment: 1 } },
        include: {
          objects: {
            where: { deletedAt: null },
            orderBy: { zIndex: 'asc' },
          },
        },
      });
    });

    return {
      plan: toGardenPlanDetailsDto(updatedPlan, updatedPlan.objects),
      idMap,
    };
  }

  async createObject(
    ownerId: string,
    planId: string,
    input: CreatePlanObjectInput,
  ): Promise<PlanObjectDto> {
    await this.ownership.requireGardenPlan(planId, ownerId);

    const count = await this.prisma.planObject.count({
      where: { planId, deletedAt: null },
    });

    if (count >= MAX_PLAN_OBJECTS) {
      throw validationError(
        { objects: [`Досягнуто ліміт ${MAX_PLAN_OBJECTS} обʼєктів на плані`] },
        'Ліміт обʼєктів перевищено',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const obj = await tx.planObject.create({
        data: {
          planId,
          type: input.type,
          label: input.label,
          xCm: input.xCm,
          yCm: input.yCm,
          widthCm: input.widthCm,
          heightCm: input.heightCm,
          rotationDeg: input.rotationDeg,
          zIndex: input.zIndex,
          layer: input.layer,
          color: input.color ?? null,
          locked: input.locked,
          meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
          zoneId: input.zoneId ?? null,
          plantId: input.plantId ?? null,
        },
      });

      await tx.gardenPlan.update({
        where: { id: planId },
        data: { version: { increment: 1 } },
      });

      return obj;
    });

    return toPlanObjectDto(created);
  }

  async updateObject(
    ownerId: string,
    planId: string,
    objectId: string,
    input: UpdatePlanObjectInput,
  ): Promise<PlanObjectDto> {
    await this.ownership.requirePlanObject(objectId, ownerId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const obj = await tx.planObject.update({
        where: { id: objectId },
        data: {
          ...(input.type ? { type: input.type } : {}),
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.xCm !== undefined ? { xCm: input.xCm } : {}),
          ...(input.yCm !== undefined ? { yCm: input.yCm } : {}),
          ...(input.widthCm !== undefined ? { widthCm: input.widthCm } : {}),
          ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
          ...(input.rotationDeg !== undefined ? { rotationDeg: input.rotationDeg } : {}),
          ...(input.zIndex !== undefined ? { zIndex: input.zIndex } : {}),
          ...(input.layer ? { layer: input.layer } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.locked !== undefined ? { locked: input.locked } : {}),
          ...(input.meta !== undefined
            ? { meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.JsonNull }
            : {}),
          ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
          ...(input.plantId !== undefined ? { plantId: input.plantId } : {}),
        },
      });

      await tx.gardenPlan.update({
        where: { id: planId },
        data: { version: { increment: 1 } },
      });

      return obj;
    });

    return toPlanObjectDto(updated);
  }

  async deleteObject(
    ownerId: string,
    planId: string,
    objectId: string,
  ): Promise<MessageResponse> {
    await this.ownership.requirePlanObject(objectId, ownerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.planObject.update({
        where: { id: objectId },
        data: { deletedAt: new Date() },
      });

      await tx.gardenPlan.update({
        where: { id: planId },
        data: { version: { increment: 1 } },
      });
    });

    return { message: 'Обʼєкт плану видалено' };
  }
}
