import type { Garden, GardenZone, Plant, PlantType } from '@prisma/client';
import type { GardenDto, PlantDto, PlantTypeDto, ZoneDto, ZoneSettings } from '@smart-garden/types';
import { parseZoneSettings } from '@smart-garden/validation';
import { dateToIso, decimalToString } from '../utils/pagination.util';

export function toGardenDto(garden: Garden): GardenDto {
  return {
    id: garden.id,
    ownerId: garden.ownerId,
    name: garden.name,
    description: garden.description,
    locationName: garden.locationName,
    latitude: decimalToString(garden.latitude),
    longitude: decimalToString(garden.longitude),
    area: decimalToString(garden.area),
    mapWidth: decimalToString(garden.mapWidth),
    mapHeight: decimalToString(garden.mapHeight),
    imageUrl: garden.imageUrl,
    createdAt: garden.createdAt.toISOString(),
    updatedAt: garden.updatedAt.toISOString(),
  };
}

export function toZoneDto(zone: GardenZone): ZoneDto {
  const settings = parseZoneSettings(zone.type, zone.settings) as ZoneSettings;
  return {
    id: zone.id,
    gardenId: zone.gardenId,
    name: zone.name,
    type: zone.type,
    description: zone.description,
    area: decimalToString(zone.area),
    positionX: decimalToString(zone.positionX),
    positionY: decimalToString(zone.positionY),
    width: decimalToString(zone.width),
    height: decimalToString(zone.height),
    color: zone.color,
    imageUrl: zone.imageUrl,
    settings,
    createdAt: zone.createdAt.toISOString(),
    updatedAt: zone.updatedAt.toISOString(),
  };
}

export function toPlantTypeDto(plantType: PlantType): PlantTypeDto {
  return {
    id: plantType.id,
    name: plantType.name,
    scientificName: plantType.scientificName,
    description: plantType.description,
    defaultImageUrl: plantType.defaultImageUrl,
    category: plantType.category,
    ownerId: plantType.ownerId,
    iconKey: plantType.iconKey,
    recommendedMinMoisture: plantType.recommendedMinMoisture,
    recommendedMaxMoisture: plantType.recommendedMaxMoisture,
    recommendedTemperatureMin: decimalToString(plantType.recommendedTemperatureMin),
    recommendedTemperatureMax: decimalToString(plantType.recommendedTemperatureMax),
    typicalGrowingDays: plantType.typicalGrowingDays,
    createdAt: plantType.createdAt.toISOString(),
    updatedAt: plantType.updatedAt.toISOString(),
  };
}

export function toPlantDto(
  plant: Plant & {
    zone: { gardenId: string };
    plantType?: Pick<PlantType, 'id' | 'name' | 'scientificName' | 'category' | 'iconKey'>;
    _count?: { problems?: number };
  },
): PlantDto {
  return {
    id: plant.id,
    zoneId: plant.zoneId,
    gardenId: plant.zone.gardenId,
    plantTypeId: plant.plantTypeId,
    name: plant.name,
    variety: plant.variety,
    description: plant.description,
    quantity: plant.quantity,
    occupiedArea: decimalToString(plant.occupiedArea),
    positionX: decimalToString(plant.positionX),
    positionY: decimalToString(plant.positionY),
    size: decimalToString(plant.size),
    rotation: decimalToString(plant.rotation),
    plantedAt: dateToIso(plant.plantedAt),
    expectedHarvestAt: dateToIso(plant.expectedHarvestAt),
    finishedAt: dateToIso(plant.finishedAt),
    status: plant.status,
    mainImageUrl: plant.mainImageUrl,
    version: plant.version,
    createdAt: plant.createdAt.toISOString(),
    updatedAt: plant.updatedAt.toISOString(),
    openProblemsCount: plant._count?.problems,
    plantType: plant.plantType
      ? {
          id: plant.plantType.id,
          name: plant.plantType.name,
          scientificName: plant.plantType.scientificName,
          category: plant.plantType.category,
          iconKey: plant.plantType.iconKey,
        }
      : undefined,
  };
}
