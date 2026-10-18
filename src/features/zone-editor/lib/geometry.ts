/**
 * Рядова та секторна геометрія мобільного редактора зони.
 *
 * Використовує функції з @smart-garden/validation (ті самі, що й веб),
 * щоб розрахунки позицій, масштабування та клампування повністю збігалися з вебом.
 */

import type { ZoneType } from '@smart-garden/types';
import {
  DEFAULT_PLANT_SIZE_M,
  applySnap,
  clampToZone,
  computePxPerMeter,
  isInsideAllowedArea,
  isInsideZone,
  metersToPixels,
  pixelsToMeters,
  resolveZoneSettings,
  screenToWorld,
  snapToGrid,
  worldToScreen,
  type ViewTransform,
  type WorldPoint,
  type ZoneSettingsInput,
} from '@smart-garden/validation';

export type MeterPoint = { x: number; y: number };
export type MeterLine = { x1: number; y1: number; x2: number; y2: number };

export {
  DEFAULT_PLANT_SIZE_M,
  applySnap,
  clampToZone,
  computePxPerMeter,
  isInsideAllowedArea,
  isInsideZone,
  metersToPixels,
  pixelsToMeters,
  resolveZoneSettings,
  screenToWorld,
  snapToGrid,
  worldToScreen,
  type ViewTransform,
  type WorldPoint,
};

/** Аліаси для прямої сумісності з валідаційним пакетом */
export const snapToGridValue = snapToGrid;
export const isValidPlantPosition = isInsideAllowedArea;

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

export function rowCountFromSpacing(axisLengthM: number, spacingM: number): number {
  const spacing = Math.max(spacingM, MIN_ROW_SPACING_M);
  return Math.max(1, Math.min(MAX_ROW_COUNT, Math.round(axisLengthM / spacing)));
}

/** Рядки/роздільники між посадковими смугами (для сітки полотна). */
export function getEvenRowDividers(params: {
  widthM: number;
  heightM: number;
  rowCount: number;
  rowDirection: 'horizontal' | 'vertical';
}): MeterLine[] {
  const count = Math.max(1, Math.floor(params.rowCount));
  const lines: MeterLine[] = [];

  if (params.rowDirection === 'horizontal') {
    for (let i = 1; i < count; i += 1) {
      const y = (params.heightM * i) / count;
      lines.push({ x1: 0, y1: y, x2: params.widthM, y2: y });
    }
  } else {
    for (let i = 1; i < count; i += 1) {
      const x = (params.widthM * i) / count;
      lines.push({ x1: x, y1: 0, x2: x, y2: params.heightM });
    }
  }

  return lines;
}

export function bedPreviewMeta(
  settings: ZoneSettingsInput,
  widthM: number,
  heightM: number,
): {
  rowCount: number;
  spacingM: number;
  maxRows: number;
  direction: 'horizontal' | 'vertical';
} | null {
  if (settings.type !== 'BED') {
    return null;
  }
  const direction = settings.rowDirection;
  const axis = axisLengthForRows(widthM, heightM, direction);
  const maxRows = maxRowsForAxis(axis);
  const rowCount = Math.max(1, Math.min(maxRows, Math.floor(settings.rowCount) || 1));
  return {
    rowCount,
    spacingM: spacingFromRowCount(axis, rowCount),
    maxRows,
    direction,
  };
}

/** Визначає рядову структуру для типу зони (BED або FIELD), або null. */
export function rowLayout(settings: ZoneSettingsInput): RowLayout | null {
  if (settings.type === 'BED') {
    return { count: Math.max(1, Math.floor(settings.rowCount) || 1), direction: settings.rowDirection };
  }
  if (settings.type === 'FIELD') {
    return { count: Math.max(1, Math.floor(settings.sectorCount) || 1), direction: settings.rowDirection };
  }
  return null;
}

export const rowLayoutFor = rowLayout;

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
  const layout = rowLayout(settings);
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
  const layout = rowLayout(params.settings);
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
 * Клампить центр маркера всередині зони з урахуванням радіуса,
 * щоб коло не виходило за межі зони [0..widthM, 0..heightM].
 */
export function clampMarkerInZone(
  point: WorldPoint,
  sizeM: number,
  widthM: number,
  heightM: number,
): WorldPoint {
  const radius = Math.max(sizeM, 0) / 2;
  const minX = radius;
  const maxX = Math.max(radius, widthM - radius);
  const minY = radius;
  const maxY = Math.max(radius, heightM - radius);
  return {
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.min(Math.max(point.y, minY), maxY),
  };
}

/**
 * Обчислює фінальну позицію рослини (метри) з урахуванням:
 * рядів (BED/FIELD), опціонального snap-to-grid і клампу в межі зони.
 *
 * Центр маркера клампується з урахуванням radius (sizeM / 2),
 * тому маркер ніколи не вилазить за краї грядки.
 */
export function placePoint(params: {
  x: number;
  y: number;
  sizeM: number;
  widthM: number;
  heightM: number;
  zoneType: ZoneType;
  settings: ZoneSettingsInput;
  snap?: boolean;
  gridStepM?: number;
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

  if (params.snap && params.gridStepM) {
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

  const radiusM = Math.max(params.sizeM, 0) / 2;
  if (hasRowLayout && (params.settings.type === 'BED' || params.settings.type === 'FIELD')) {
    if (params.settings.rowDirection === 'horizontal') {
      // Горизонтальні ряди: вільна вісь x клампується за clampToZone,
      // фіксована вісь рядів y клампується в межах [radiusM, heightM - radiusM],
      // щоб маркер крайнього верхнього/нижнього ряду не обрізався.
      const clampedY = Math.min(
        Math.max(point.y, radiusM),
        Math.max(radiusM, params.heightM - radiusM),
      );
      return { x: clamped.x, y: clampedY };
    }
    // Вертикальні ряди: вільна вісь y клампується за clampToZone,
    // фіксована вісь рядів x клампується в межах [radiusM, widthM - radiusM],
    // щоб маркер крайнього лівого/правого ряду не обрізався.
    const clampedX = Math.min(
      Math.max(point.x, radiusM),
      Math.max(radiusM, params.widthM - radiusM),
    );
    return { x: clampedX, y: clamped.y };
  }

  return clamped;
}
