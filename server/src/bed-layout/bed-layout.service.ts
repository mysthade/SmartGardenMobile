import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BedLayoutDto, BedLayoutPlantDto, BedLayoutSaveResponse } from '@smart-garden/types';
import {
  DEFAULT_PLANT_SIZE_M,
  isInsideAllowedArea,
  parseZoneSettings,
  type UpdateBedLayoutInput,
} from '@smart-garden/validation';
import { conflict, notFound, validationError } from '../common/errors/http-errors';
import { toZoneDto } from '../common/mappers/garden.mapper';
import { decimalToString } from '../common/utils/pagination.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BedLayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async get(ownerId: string, zoneId: string): Promise<BedLayoutDto> {
    const zone = await this.ownership.requireZone(zoneId, ownerId);
    const garden = await this.prisma.garden.findFirstOrThrow({
      where: { id: zone.gardenId, deletedAt: null },
      select: { id: true, name: true },
    });

    const plants = await this.prisma.plant.findMany({
      where: { zoneId, deletedAt: null },
      include: {
        plantType: {
          select: { id: true, name: true, scientificName: true, category: true, iconKey: true },
        },
        _count: {
          select: { problems: { where: { status: { not: 'RESOLVED' } } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      zone: toZoneDto(zone),
      garden,
      plants: plants.map((plant) => this.toLayoutPlant(plant)),
    };
  }

  async save(
    ownerId: string,
    zoneId: string,
    input: UpdateBedLayoutInput,
  ): Promise<BedLayoutSaveResponse> {
    const zone = await this.ownership.requireZone(zoneId, ownerId);

    if (zone.updatedAt.toISOString() !== new Date(input.zoneUpdatedAt).toISOString()) {
      throw conflict('Зону змінено в іншій сесії. Оновіть дані з сервера.');
    }

    const width = Number(input.bed.width);
    const height = Number(input.bed.height);
    const settings = parseZoneSettings(
      zone.type,
      input.settings !== undefined ? input.settings : zone.settings,
    );

    for (const item of input.plants) {
      if (item.op === 'delete') {
        continue;
      }
      const size = item.size != null ? Number(item.size) : DEFAULT_PLANT_SIZE_M;
      const x = Number(item.positionX);
      const y = Number(item.positionY);
      if (
        !isInsideAllowedArea({
          x,
          y,
          widthM: width,
          heightM: height,
          sizeM: size,
          zoneType: zone.type,
          settings,
        })
      ) {
        throw validationError(
          { plants: [`Рослина «${item.name ?? item.id}» виходить за дозволену зону`] },
          'Некоректні координати',
        );
      }
    }

    const idMap: Record<string, string> = {};

    await this.prisma.$transaction(async (tx) => {
      await tx.gardenZone.update({
        where: { id: zoneId },
        data: {
          ...(input.bed.name ? { name: input.bed.name } : {}),
          width: input.bed.width,
          height: input.bed.height,
          area: width * height,
          ...(input.settings !== undefined
            ? { settings: settings as unknown as Prisma.InputJsonValue }
            : {}),
        },
      });

      for (const item of input.plants) {
        if (item.op === 'delete' && item.id) {
          const owned = await tx.plant.findFirst({
            where: { id: item.id, zoneId, deletedAt: null },
          });
          if (!owned) {
            throw notFound('Рослину не знайдено');
          }
          await tx.plant.update({
            where: { id: item.id },
            data: { deletedAt: new Date() },
          });
          continue;
        }

        const plantTypeId = item.plantTypeId!;
        const plantType = await tx.plantType.findFirst({
          where: {
            id: plantTypeId,
            OR: [{ ownerId: null }, { ownerId }],
          },
        });
        if (!plantType) {
          throw validationError({ plantTypeId: ['Тип рослини недоступний'] });
        }

        const size = item.size ?? String(DEFAULT_PLANT_SIZE_M);
        const rotation = item.rotation ?? '0';

        if (item.id) {
          const updated = await tx.plant.updateMany({
            where: { id: item.id, zoneId, deletedAt: null, version: item.version },
            data: {
              plantTypeId,
              name: item.name!,
              variety: item.variety ?? null,
              description: item.description ?? null,
              quantity: item.quantity ?? 1,
              status: item.status,
              plantedAt: item.plantedAt ? new Date(item.plantedAt) : null,
              positionX: item.positionX!,
              positionY: item.positionY!,
              size,
              rotation,
              version: { increment: 1 },
            },
          });
          if (updated.count === 0) {
            throw conflict('Конфлікт версії рослини. Оновіть схему.');
          }
          if (item.clientId) {
            idMap[item.clientId] = item.id;
          }
        } else {
          const created = await tx.plant.create({
            data: {
              zoneId,
              plantTypeId,
              name: item.name!,
              variety: item.variety ?? null,
              description: item.description ?? null,
              quantity: item.quantity ?? 1,
              status: item.status ?? 'PLANNED',
              plantedAt: item.plantedAt ? new Date(item.plantedAt) : null,
              positionX: item.positionX!,
              positionY: item.positionY!,
              size,
              rotation,
            },
          });
          if (item.clientId) {
            idMap[item.clientId] = created.id;
          }
        }
      }
    });

    const layout = await this.get(ownerId, zoneId);
    return { layout, idMap };
  }

  private toLayoutPlant(plant: {
    id: string;
    zoneId: string;
    plantTypeId: string;
    name: string;
    variety: string | null;
    description: string | null;
    quantity: number;
    positionX: { toString(): string } | null;
    positionY: { toString(): string } | null;
    size: { toString(): string } | null;
    rotation: { toString(): string } | null;
    plantedAt: Date | null;
    status: BedLayoutPlantDto['status'];
    version: number;
    createdAt: Date;
    updatedAt: Date;
    plantType: {
      id: string;
      name: string;
      scientificName: string | null;
      category: BedLayoutPlantDto['plantType']['category'];
      iconKey: string | null;
    };
    _count: { problems: number };
  }): BedLayoutPlantDto {
    return {
      id: plant.id,
      zoneId: plant.zoneId,
      plantTypeId: plant.plantTypeId,
      name: plant.name,
      variety: plant.variety,
      description: plant.description,
      quantity: plant.quantity,
      positionX: decimalToString(plant.positionX) ?? '0',
      positionY: decimalToString(plant.positionY) ?? '0',
      size: decimalToString(plant.size) ?? String(DEFAULT_PLANT_SIZE_M),
      rotation: decimalToString(plant.rotation) ?? '0',
      plantedAt: plant.plantedAt?.toISOString() ?? null,
      status: plant.status,
      version: plant.version,
      createdAt: plant.createdAt.toISOString(),
      updatedAt: plant.updatedAt.toISOString(),
      plantType: plant.plantType,
      openProblemsCount: plant._count.problems,
    };
  }
}
