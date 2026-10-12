import {
  axisLengthForRows,
  maxRowsForAxis,
  placePoint,
  rowStripLengthM,
  shouldSnapToRows,
  snapPointToRow,
  spacingFromRowCount,
  suggestedPlantSizeM,
} from '@/src/features/zone-editor/lib/geometry';
import { defaultZoneSettings } from '@smart-garden/validation';

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
    // rowCount за замовчуванням для BED
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

  it('клампить у межі зони', () => {
    const p = placePoint({ ...base, x: 10, y: -5 });
    expect(p.x).toBeLessThanOrEqual(4 - 0.05);
    expect(p.y).toBeGreaterThanOrEqual(0.05);
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
});
