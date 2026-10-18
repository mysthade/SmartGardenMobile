import {
  axisLengthForRows,
  clampMarkerInZone,
  computePxPerMeter,
  maxRowsForAxis,
  metersToPixels,
  pixelsToMeters,
  placePoint,
  rowStripLengthM,
  screenToWorld,
  shouldSnapToRows,
  snapPointToRow,
  spacingFromRowCount,
  suggestedPlantSizeM,
  worldToScreen,
  type ViewTransform,
} from '@/src/features/zone-editor/lib/geometry';
import { defaultZoneSettings, parseZoneSettings } from '@smart-garden/validation';

const bedSettings = defaultZoneSettings('BED');

describe('axisLengthForRows / spacing', () => {
  it('бере правильну вісь', () => {
    expect(axisLengthForRows(4, 2, 'horizontal')).toBe(2);
    expect(axisLengthForRows(4, 2, 'vertical')).toBe(4);
  });

  it('maxRowsForAxis обмежує 1..200', () => {
    expect(maxRowsForAxis(2)).toBe(40);
    expect(maxRowsForAxis(0)).toBe(1);
    expect(maxRowsForAxis(1000)).toBe(200);
  });

  it('spacingFromRowCount ділить вісь', () => {
    expect(spacingFromRowCount(2, 4)).toBe(0.5);
  });
});

describe('shouldSnapToRows', () => {
  it('BED за замовчуванням true', () => {
    expect(shouldSnapToRows(bedSettings)).toBe(true);
  });

  it('FIELD завжди true', () => {
    expect(shouldSnapToRows(defaultZoneSettings('FIELD'))).toBe(true);
  });

  it('ORCHARD — false', () => {
    expect(shouldSnapToRows(defaultZoneSettings('ORCHARD'))).toBe(false);
  });
});

describe('snapPointToRow', () => {
  it('BED horizontal садить Y у центр смуги', () => {
    const p = snapPointToRow({ x: 1.2, y: 0.3, widthM: 4, heightM: 2, settings: bedSettings });
    expect(p.x).toBe(1.2);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(2);
  });

  it('повертає точку без змін, якщо рядів немає', () => {
    const p = snapPointToRow({ x: 1, y: 1, widthM: 4, heightM: 2, settings: defaultZoneSettings('ORCHARD') });
    expect(p).toEqual({ x: 1, y: 1 });
  });
});

describe('suggestedPlantSizeM', () => {
  it('не перевищує бажаний розмір', () => {
    const s = suggestedPlantSizeM({ widthM: 4, heightM: 2, settings: bedSettings, preferred: 0.4 });
    expect(s).toBeLessThanOrEqual(0.4);
    expect(s).toBeGreaterThan(0);
  });

  it('повертає preferred, якщо рядів немає', () => {
    const s = suggestedPlantSizeM({ widthM: 4, heightM: 2, settings: defaultZoneSettings('ORCHARD'), preferred: 0.5 });
    expect(s).toBe(0.5);
  });
});

describe('rowStripLengthM', () => {
  it('null для типів без рядів', () => {
    expect(rowStripLengthM(4, 2, defaultZoneSettings('ORCHARD'))).toBeNull();
  });

  it('число для BED', () => {
    expect(rowStripLengthM(4, 2, bedSettings)).toBeGreaterThan(0);
  });
});

describe('placePoint', () => {
  const base = {
    sizeM: 0.2,
    widthM: 4,
    heightM: 2,
    zoneType: 'ORCHARD' as const,
    settings: defaultZoneSettings('ORCHARD'),
    snap: false,
    gridStepM: 0.25,
  };

  it('клампить у межі зони з урахуванням радіуса маркера', () => {
    const p = placePoint({ ...base, x: 10, y: -5 });
    expect(p.x).toBeLessThanOrEqual(4 - 0.1);
    expect(p.y).toBeGreaterThanOrEqual(0.1);
  });

  it('snap округлює до кроку сітки', () => {
    const p = placePoint({ ...base, x: 1.13, y: 1.13, snap: true });
    expect(p.x).toBeCloseTo(1.25, 5);
    expect(p.y).toBeCloseTo(1.25, 5);
  });

  it('BED зберігає центр ряду по Y', () => {
    const bedBase = { ...base, zoneType: 'BED' as const, settings: bedSettings };
    const rowed = snapPointToRow({ x: 1, y: 0.5, widthM: 4, heightM: 2, settings: bedSettings });
    const p = placePoint({ ...bedBase, x: 1, y: 0.5, snap: false });
    expect(p.y).toBeCloseTo(rowed.y, 5);
  });

  it('вертикальні ряди не дозволяють центру бути менше ніж радіус (не обрізаються зліва)', () => {
    const vertSettings = parseZoneSettings('BED', {
      type: 'BED',
      rowCount: 20,
      rowDirection: 'vertical',
      snapToRows: true,
    });
    // sizeM = 0.4 -> radius = 0.2m. First vertical row center = 0.1m.
    const p = placePoint({
      x: 0,
      y: 0.5,
      sizeM: 0.4,
      widthM: 4,
      heightM: 2,
      zoneType: 'BED',
      settings: vertSettings,
      snap: false,
    });
    // Центр маркера не повинен бути меншим за радіус (0.2m)
    expect(p.x).toBeGreaterThanOrEqual(0.2);
    expect(p.x - 0.2).toBeGreaterThanOrEqual(0);
  });
});

describe('Web-Mobile координатна сумісність та реальні фікстури', () => {
  // Реальні записи рослин із БД
  const fixtures = [
    { name: 'Айва', x: 1.25, y: 0.25, size: 0.4, zoneW: 10, zoneH: 5 },
    { name: 'Помідор 1', x: 1.0, y: 1.0, size: 0.4, zoneW: 4, zoneH: 2 },
    { name: 'Інжир', x: 1.5, y: 0.25, size: 0.144, zoneW: 4, zoneH: 2 },
    { name: 'Аґрус', x: 0.9, y: 1.25, size: 0.144, zoneW: 4, zoneH: 2 },
    { name: 'Баклажан', x: 0.1, y: 0.072, size: 0.144, zoneW: 4, zoneH: 2 },
  ];

  const view: ViewTransform = {
    pxPerMeter: 120,
    originX: 32,
    originY: 48,
  };

  it('round-trip перетворення метри -> пікселі -> метри збігається до 1e-6', () => {
    for (const f of fixtures) {
      const screen = worldToScreen({ x: f.x, y: f.y }, view);
      const roundTrip = screenToWorld(screen, view);

      expect(Math.abs(roundTrip.x - f.x)).toBeLessThan(1e-6);
      expect(Math.abs(roundTrip.y - f.y)).toBeLessThan(1e-6);
    }
  });

  it('прямі формули metersToPixels / pixelsToMeters збігаються з web-трансформом', () => {
    for (const f of fixtures) {
      const pxX = view.originX + metersToPixels(f.x, view.pxPerMeter);
      const pxY = view.originY + metersToPixels(f.y, view.pxPerMeter);

      const screen = worldToScreen({ x: f.x, y: f.y }, view);
      expect(screen.x).toBeCloseTo(pxX, 9);
      expect(screen.y).toBeCloseTo(pxY, 9);

      const backX = pixelsToMeters(screen.x - view.originX, view.pxPerMeter);
      const backY = pixelsToMeters(screen.y - view.originY, view.pxPerMeter);
      expect(backX).toBeCloseTo(f.x, 9);
      expect(backY).toBeCloseTo(f.y, 9);
    }
  });

  it('computePxPerMeter зберігає пропорції та padding', () => {
    const stageWidthPx = 360;
    const stageHeightPx = 520;
    const pxPerM = computePxPerMeter({
      stageWidthPx,
      stageHeightPx,
      bedWidthM: 4,
      bedHeightM: 2,
      padding: 0.88,
      scale: 1,
    });

    const zoneWPx = 4 * pxPerM;
    const zoneHPx = 2 * pxPerM;
    expect(zoneWPx).toBeLessThanOrEqual(stageWidthPx);
    expect(zoneHPx).toBeLessThanOrEqual(stageHeightPx);
  });

  it('clampMarkerInZone утримує крайні рослини від виходу за межі грядки', () => {
    const point = { x: 0.05, y: 1.98 };
    const sizeM = 0.4; // radius = 0.2m
    const clamped = clampMarkerInZone(point, sizeM, 4, 2);

    expect(clamped.x).toBe(0.2);
    expect(clamped.y).toBe(1.8);
    // Коло повністю всередині [0..4, 0..2]
    expect(clamped.x - 0.2).toBeGreaterThanOrEqual(0);
    expect(clamped.x + 0.2).toBeLessThanOrEqual(4);
    expect(clamped.y - 0.2).toBeGreaterThanOrEqual(0);
    expect(clamped.y + 0.2).toBeLessThanOrEqual(2);
  });
});
