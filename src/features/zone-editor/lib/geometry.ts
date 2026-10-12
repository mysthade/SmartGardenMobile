/**
 * Рядова/секторна логіка редактора зони (у метрах).
 *
 * Це мобільний порт apps/web/src/features/zone-editor/lib/zone-geometry.ts.
 * Базова геометрія (кламп, snap, перетворення координат) береться з
 * @smart-garden/validation, а тут додається лише логіка «рядів/секторів» для
 * BED та FIELD, щоб рослини сідали по центру посадкових смуг.
 */

import type { ZoneType } from '@smart-garden/types';
import {
  DEFAULT_PLANT_SIZE_M,
  applySnap,
  clampToZone,
  snapToGrid,
  type ZoneSettingsInput,
} from '@smart-garden/validation';

export type MeterPoint = { x: number; y: number };

/** Мінімальна практична відстань між рядами (метри). */
export const MIN_ROW_SPACING_M = 0.05;
/** Верхня межа кількості рядів/секторів. */
export const MAX_ROW_COUNT = 200;
/** Найменший діаметр маркера, що ще вміщується у щільний ряд (метри). */
export const MIN_PLANT_SIZE_M = 0.03;

type RowLayout = { count: number; direction: 'horizontal' | 'vertical' };

/** Довжина осі, вздовж якої розкладаються ряди. */
export function axisLengthForRows(
  widthM: number,
  heightM: number,
  direction: 'horizontal' | 'vertical',
): number {
  return direction === 'horizontal' ? heightM : widthM;
}

export function maxRowsForAxis(axisLengthM: number): number {
  const fit = Math.floor(Math.max(axisLengthM, MIN_ROW_SPACING_M) / MIN_ROW_SPACING_M);
  return Math.max(1, Math.min(MAX_ROW_COUNT, fit));
}

export function spacingFromRowCount(axisLengthM: number, rowCount: number): number {
  return axisLengthM / Math.max(rowCount, 1);
}

/** Визначає рядову структуру для типу зони (BED або FIELD), або null. */
export function rowLayoutFor(settings: ZoneSettingsInput): RowLayout | null {
  if (settings.type === 'BED') {
    return { count: Math.max(1, Math.floor(settings.rowCount) || 1), direction: settings.rowDirection };
  }
  if (settings.type === 'FIELD') {
    return { count: Math.max(1, Math.floor(settings.sectorCount) || 1), direction: settings.rowDirection };
  }
  return null;
}

/** Чи треба прив'язувати рослини до центрів рядів/секторів. */
export function shouldSnapToRows(settings: ZoneSettingsInput): boolean {
  if (settings.type === 'BED') {
    return settings.snapToRows !== false;
  }
  return settings.type === 'FIELD';
}

/** Довжина однієї посадкової смуги вздовж осі рядів (метри). */
export function rowStripLengthM(
  widthM: number,
  heightM: number,
  settings: ZoneSettingsInput,
): number | null {
  const layout = rowLayoutFor(settings);
  if (!layout) {
    return null;
  }
  return axisLengthForRows(widthM, heightM, layout.direction) / layout.count;
}

/**
 * Діаметр рослини, що вміщується у смугу ряду (з запасом).
 * Якщо рядів немає — повертає бажаний розмір.
 */
export function suggestedPlantSizeM(params: {
  widthM: number;
  heightM: number;
  settings: ZoneSettingsInput;
  preferred?: number;
}): number {
  const preferred = params.preferred ?? DEFAULT_PLANT_SIZE_M;
  const strip = rowStripLengthM(params.widthM, params.heightM, params.settings);
  if (strip == null) {
    return preferred;
  }
  const fit = strip * 0.72;
  return Math.min(preferred, Math.max(MIN_PLANT_SIZE_M, fit));
}

/** Прив'язує точку до центру найближчого ряду/сектора. */
export function snapPointToRow(params: {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  settings: ZoneSettingsInput;
}): MeterPoint {
  const layout = rowLayoutFor(params.settings);
  if (!layout) {
    return { x: params.x, y: params.y };
  }

  if (layout.direction === 'horizontal') {
    const strip = params.heightM / layout.count;
    const index = Math.min(
      layout.count - 1,
      Math.max(0, Math.floor(params.y / Math.max(strip, 1e-9))),
    );
    return { x: params.x, y: (index + 0.5) * strip };
  }

  const strip = params.widthM / layout.count;
  const index = Math.min(
    layout.count - 1,
    Math.max(0, Math.floor(params.x / Math.max(strip, 1e-9))),
  );
  return { x: (index + 0.5) * strip, y: params.y };
}

/**
 * Обчислює фінальну позицію рослини (метри) з урахуванням:
 * рядів (BED/FIELD), опціонального snap-to-grid і клампу в межі зони.
 * Використовується і при додаванні, і при перетягуванні.
 */
export function placePoint(params: {
  x: number;
  y: number;
  sizeM: number;
  widthM: number;
  heightM: number;
  zoneType: ZoneType;
  settings: ZoneSettingsInput;
  snap: boolean;
  gridStepM: number;
}): MeterPoint {
  let point: MeterPoint = { x: params.x, y: params.y };
  const hasRowLayout = shouldSnapToRows(params.settings);

  if (hasRowLayout) {
    point = snapPointToRow({
      x: point.x,
      y: point.y,
      widthM: params.widthM,
      heightM: params.heightM,
      settings: params.settings,
    });
  }

  if (params.snap) {
    // Відцентровуємо ряд: snap лише вздовж вільної осі (вздовж ряду).
    if (params.settings.type === 'BED' || params.settings.type === 'FIELD') {
      const direction = params.settings.rowDirection;
      if (direction === 'horizontal') {
        point = { x: snapToGrid(point.x, params.gridStepM), y: point.y };
      } else {
        point = { x: point.x, y: snapToGrid(point.y, params.gridStepM) };
      }
    } else {
      point = applySnap(point, true, params.gridStepM);
    }
  }

  const clamped = clampToZone({
    x: point.x,
    y: point.y,
    widthM: params.widthM,
    heightM: params.heightM,
    sizeM: params.sizeM,
    zoneType: params.zoneType,
    settings: params.settings,
  });

  // Зберігаємо центр ряду по фіксованій осі, щоб кламп не «виштовхував»
  // маркер з верхнього/нижнього (або крайнього) ряду.
  if (hasRowLayout && (params.settings.type === 'BED' || params.settings.type === 'FIELD')) {
    if (params.settings.rowDirection === 'horizontal') {
      return { x: clamped.x, y: point.y };
    }
    return { x: point.x, y: clamped.y };
  }

  return clamped;
}
