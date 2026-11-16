import {
  applySnap,
  clampPlantCenter,
  computePxPerMeter,
  isPlantInsideBed,
  metersToPixels,
  normalizePlantPlacement,
  pixelsToMeters,
  snapToGrid,
} from '@smart-garden/validation';

describe('bed coordinates (shared)', () => {
  it('clamps marker so it stays inside the bed', () => {
    expect(clampPlantCenter(-1, -1, 4, 2, 0.4)).toEqual({ x: 0.2, y: 0.2 });
    expect(clampPlantCenter(10, 10, 4, 2, 0.4)).toEqual({ x: 3.8, y: 1.8 });
  });

  it('snaps then clamps', () => {
    expect(snapToGrid(1.12, 0.25)).toBe(1);
    expect(
      normalizePlantPlacement({
        x: 1.12,
        y: 0.88,
        bedWidthM: 4,
        bedHeightM: 2,
        snap: true,
        gridStepM: 0.25,
      }),
    ).toEqual({ x: 1, y: 1 });
  });

  it('round-trips meters and pixels after stage resize', () => {
    const logical = { x: 1.5, y: 0.75 };
    const pxA = computePxPerMeter({
      stageWidthPx: 800,
      stageHeightPx: 400,
      bedWidthM: 4,
      bedHeightM: 2,
      padding: 1,
    });
    const pxB = computePxPerMeter({
      stageWidthPx: 1600,
      stageHeightPx: 800,
      bedWidthM: 4,
      bedHeightM: 2,
      padding: 1,
    });
    expect(pixelsToMeters(metersToPixels(logical.x, pxA), pxA)).toBeCloseTo(logical.x);
    expect(pixelsToMeters(metersToPixels(logical.x, pxB), pxB)).toBeCloseTo(logical.x);
  });

  it('flags out-of-bounds centers', () => {
    expect(isPlantInsideBed(0, 0, 4, 2, 0.4)).toBe(false);
    expect(isPlantInsideBed(0.2, 0.2, 4, 2, 0.4)).toBe(true);
    expect(applySnap({ x: 1.1, y: 2.2 }, false, 0.25)).toEqual({ x: 1.1, y: 2.2 });
  });
});
