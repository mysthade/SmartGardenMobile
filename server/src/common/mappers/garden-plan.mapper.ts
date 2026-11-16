import type { GardenPlan, PlanObject } from '@prisma/client';
import type { GardenPlanDetailsDto, GardenPlanDto, PlanObjectDto } from '@smart-garden/types';
import { getEffectiveBoundary } from '@smart-garden/validation';

export function toGardenPlanDto(plan: GardenPlan): GardenPlanDto {
  return {
    id: plan.id,
    gardenId: plan.gardenId,
    name: plan.name,
    widthCm: plan.widthCm,
    heightCm: plan.heightCm,
    boundary: getEffectiveBoundary({
      widthCm: plan.widthCm,
      heightCm: plan.heightCm,
      boundary: plan.boundary as Array<{ xCm: number; yCm: number }> | null,
    }),
    northAngleDeg: plan.northAngleDeg,
    gridSizeCm: plan.gridSizeCm,
    version: plan.version,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toPlanObjectDto(obj: PlanObject): PlanObjectDto {
  return {
    id: obj.id,
    planId: obj.planId,
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
    meta: (obj.meta as Record<string, unknown> | null) ?? null,
    zoneId: obj.zoneId,
    plantId: obj.plantId,
    createdAt: obj.createdAt.toISOString(),
    updatedAt: obj.updatedAt.toISOString(),
  };
}

export function toGardenPlanDetailsDto(
  plan: GardenPlan,
  objects: PlanObject[],
): GardenPlanDetailsDto {
  return {
    ...toGardenPlanDto(plan),
    objects: objects.map(toPlanObjectDto),
  };
}
