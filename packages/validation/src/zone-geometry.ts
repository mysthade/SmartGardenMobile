/**
 * Zone geometry helpers in meters (world space), plus screen ↔ world transforms.
 */

import type { ZoneType } from '@smart-garden/types';
import {
  defaultZoneSettings,
  parseZoneSettings,
  type GreenhouseSettings,
  type ZoneSettingsInput,
} from './zone-settings';

export const DEFAULT_PLANT_SIZE_M = 0.4;

export type WorldPoint = { x: number; y: number };
/** @deprecated use WorldPoint */
export type BedPoint = WorldPoint;

export type ViewTransform = {
  pxPerMeter: number;
  originX: number;
  originY: number;
};

export function snapToGrid(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

export function applySnap(point: WorldPoint, snap: boolean, gridStepM: number): WorldPoint {
  if (!snap) {
    return point;
  }
  return {
    x: snapToGrid(point.x, gridStepM),
    y: snapToGrid(point.y, gridStepM),
  };
}

export function metersToPixels(meters: number, pxPerMeter: number): number {
  return meters * pxPerMeter;
}

export function pixelsToMeters(pixels: number, pxPerMeter: number): number {
  if (pxPerMeter === 0) {
    return 0;
  }
  return pixels / pxPerMeter;
}

export function computePxPerMeter(input: {
  stageWidthPx: number;
  stageHeightPx: number;
  bedWidthM: number;
  bedHeightM: number;
  padding?: number;
  scale?: number;
}): number {
  const padding = input.padding ?? 0.9;
  const scale = input.scale ?? 1;
  if (input.bedWidthM <= 0 || input.bedHeightM <= 0) {
    return 1;
  }
  const fit = Math.min(
    input.stageWidthPx / input.bedWidthM,
    input.stageHeightPx / input.bedHeightM,
  );
  return fit * padding * scale;
}

export function worldToScreen(point: WorldPoint, view: ViewTransform): WorldPoint {
  return {
    x: view.originX + metersToPixels(point.x, view.pxPerMeter),
    y: view.originY + metersToPixels(point.y, view.pxPerMeter),
  };
}

export function screenToWorld(point: WorldPoint, view: ViewTransform): WorldPoint {
  return {
    x: pixelsToMeters(point.x - view.originX, view.pxPerMeter),
    y: pixelsToMeters(point.y - view.originY, view.pxPerMeter),
  };
}

export function getPlantBounds(center: WorldPoint, sizeM: number) {
  const r = Math.max(sizeM, 0) / 2;
  return {
    minX: center.x - r,
    maxX: center.x + r,
    minY: center.y - r,
    maxY: center.y + r,
    radius: r,
  };
}

function clampRect(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  sizeM: number,
): WorldPoint {
  const radius = Math.max(sizeM, 0) / 2;
  const maxX = Math.max(widthM - radius, radius);
  const maxY = Math.max(heightM - radius, radius);
  return {
    x: Math.min(Math.max(x, radius), maxX),
    y: Math.min(Math.max(y, radius), maxY),
  };
}

function isInsideRect(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  sizeM: number,
): boolean {
  const c = clampRect(x, y, widthM, heightM, sizeM);
  return Math.abs(c.x - x) < 1e-9 && Math.abs(c.y - y) < 1e-9;
}

function clampEllipse(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  sizeM: number,
): WorldPoint {
  const radius = Math.max(sizeM, 0) / 2;
  const cx = widthM / 2;
  const cy = heightM / 2;
  const rx = Math.max(widthM / 2 - radius, 0.01);
  const ry = Math.max(heightM / 2 - radius, 0.01);
  const dx = x - cx;
  const dy = y - cy;
  const n = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (n <= 1 || n === 0) {
    return { x, y };
  }
  const scale = Math.sqrt(1 / n);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function isInsideEllipse(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  sizeM: number,
): boolean {
  const c = clampEllipse(x, y, widthM, heightM, sizeM);
  return Math.abs(c.x - x) < 1e-9 && Math.abs(c.y - y) < 1e-9;
}

/** Greenhouse: central aisle runs along the long axis (height), beds on left/right. */
export function getGreenhousePathBounds(
  widthM: number,
  heightM: number,
  settings: Pick<GreenhouseSettings, 'pathWidthM'>,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const pathW = Math.min(settings.pathWidthM, widthM * 0.8);
  const mid = widthM / 2;
  return {
    minX: mid - pathW / 2,
    maxX: mid + pathW / 2,
    minY: 0,
    maxY: heightM,
  };
}

function isOnGreenhousePath(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  sizeM: number,
  settings: Pick<GreenhouseSettings, 'pathWidthM'>,
): boolean {
  const path = getGreenhousePathBounds(widthM, heightM, settings);
  const r = Math.max(sizeM, 0) / 2;
  // Marker intersects the path strip
  return x + r > path.minX && x - r < path.maxX && y + r > path.minY && y - r < path.maxY;
}

function clampOffGreenhousePath(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  sizeM: number,
  settings: Pick<GreenhouseSettings, 'pathWidthM'>,
): WorldPoint {
  let point = clampRect(x, y, widthM, heightM, sizeM);
  if (!isOnGreenhousePath(point.x, point.y, widthM, heightM, sizeM, settings)) {
    return point;
  }
  const path = getGreenhousePathBounds(widthM, heightM, settings);
  const mid = widthM / 2;
  const r = Math.max(sizeM, 0) / 2;
  if (point.x < mid) {
    point = { ...point, x: Math.max(r, path.minX - r) };
  } else {
    point = { ...point, x: Math.min(widthM - r, path.maxX + r) };
  }
  return clampRect(point.x, point.y, widthM, heightM, sizeM);
}

export function resolveZoneSettings(type: ZoneType, settings?: unknown): ZoneSettingsInput {
  return parseZoneSettings(type, settings ?? defaultZoneSettings(type));
}

export function clampToZone(input: {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  sizeM?: number;
  zoneType: ZoneType;
  settings?: unknown;
}): WorldPoint {
  const sizeM = input.sizeM ?? DEFAULT_PLANT_SIZE_M;
  const settings = resolveZoneSettings(input.zoneType, input.settings);

  if (settings.type === 'FLOWERBED') {
    if (settings.shape === 'circle' || settings.shape === 'ellipse') {
      return clampEllipse(input.x, input.y, input.widthM, input.heightM, sizeM);
    }
    return clampRect(input.x, input.y, input.widthM, input.heightM, sizeM);
  }

  if (settings.type === 'OTHER' && settings.shape === 'ellipse') {
    return clampEllipse(input.x, input.y, input.widthM, input.heightM, sizeM);
  }

  if (settings.type === 'GREENHOUSE') {
    return clampOffGreenhousePath(input.x, input.y, input.widthM, input.heightM, sizeM, settings);
  }

  return clampRect(input.x, input.y, input.widthM, input.heightM, sizeM);
}

export function isInsideZone(input: {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  sizeM?: number;
  zoneType: ZoneType;
  settings?: unknown;
}): boolean {
  const sizeM = input.sizeM ?? DEFAULT_PLANT_SIZE_M;
  const settings = resolveZoneSettings(input.zoneType, input.settings);

  if (settings.type === 'FLOWERBED') {
    if (settings.shape === 'circle' || settings.shape === 'ellipse') {
      return isInsideEllipse(input.x, input.y, input.widthM, input.heightM, sizeM);
    }
    return isInsideRect(input.x, input.y, input.widthM, input.heightM, sizeM);
  }

  if (settings.type === 'OTHER' && settings.shape === 'ellipse') {
    return isInsideEllipse(input.x, input.y, input.widthM, input.heightM, sizeM);
  }

  return isInsideRect(input.x, input.y, input.widthM, input.heightM, sizeM);
}

export function isInsideAllowedArea(input: {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  sizeM?: number;
  zoneType: ZoneType;
  settings?: unknown;
}): boolean {
  const sizeM = input.sizeM ?? DEFAULT_PLANT_SIZE_M;
  if (!isInsideZone({ ...input, sizeM })) {
    return false;
  }
  const settings = resolveZoneSettings(input.zoneType, input.settings);
  if (settings.type === 'GREENHOUSE') {
    return !isOnGreenhousePath(input.x, input.y, input.widthM, input.heightM, sizeM, settings);
  }
  return true;
}

/** Clamp circular marker inside rectangular bed (legacy). */
export function clampPlantCenter(
  x: number,
  y: number,
  bedWidthM: number,
  bedHeightM: number,
  sizeM = DEFAULT_PLANT_SIZE_M,
): WorldPoint {
  return clampRect(x, y, bedWidthM, bedHeightM, sizeM);
}

export function normalizePlantPlacement(input: {
  x: number;
  y: number;
  bedWidthM: number;
  bedHeightM: number;
  sizeM?: number;
  snap?: boolean;
  gridStepM?: number;
  zoneType?: ZoneType;
  settings?: unknown;
}): WorldPoint {
  const sizeM = input.sizeM ?? DEFAULT_PLANT_SIZE_M;
  const snapped = applySnap(
    { x: input.x, y: input.y },
    Boolean(input.snap),
    input.gridStepM ?? 0.25,
  );
  return clampToZone({
    x: snapped.x,
    y: snapped.y,
    widthM: input.bedWidthM,
    heightM: input.bedHeightM,
    sizeM,
    zoneType: input.zoneType ?? 'BED',
    settings: input.settings,
  });
}

/** True if marker center is fully inside rectangular bed (legacy). */
export function isPlantInsideBed(
  x: number,
  y: number,
  bedWidthM: number,
  bedHeightM: number,
  sizeM = DEFAULT_PLANT_SIZE_M,
): boolean {
  return isInsideRect(x, y, bedWidthM, bedHeightM, sizeM);
}
