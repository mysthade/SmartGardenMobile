import {
  clampToZone,
  getGreenhousePathBounds,
  isInsideAllowedArea,
  isInsideZone,
  normalizePlantPlacement,
  screenToWorld,
  snapToGrid,
  worldToScreen,
  type ViewTransform,
} from '@smart-garden/validation';

describe('zone geometry', () => {
  it('snaps to grid', () => {
    expect(snapToGrid(1.12, 0.25)).toBe(1);
  });

  it('clamps flowerbed ellipse', () => {
    const inside = clampToZone({
      x: 2,
      y: 1,
      widthM: 4,
      heightM: 2,
      sizeM: 0.4,
      zoneType: 'FLOWERBED',
      settings: { type: 'FLOWERBED', shape: 'ellipse' },
    });
    expect(
      isInsideZone({
        ...inside,
        widthM: 4,
        heightM: 2,
        sizeM: 0.4,
        zoneType: 'FLOWERBED',
        settings: { type: 'FLOWERBED', shape: 'ellipse' },
      }),
    ).toBe(true);

    const edge = clampToZone({
      x: 10,
      y: 10,
      widthM: 4,
      heightM: 2,
      sizeM: 0.4,
      zoneType: 'FLOWERBED',
      settings: { type: 'FLOWERBED', shape: 'ellipse' },
    });
    expect(
      isInsideZone({
        ...edge,
        widthM: 4,
        heightM: 2,
        sizeM: 0.4,
        zoneType: 'FLOWERBED',
        settings: { type: 'FLOWERBED', shape: 'ellipse' },
      }),
    ).toBe(true);
  });

  it('rejects greenhouse central path', () => {
    const settings = {
      type: 'GREENHOUSE' as const,
      innerBedCount: 2,
      pathWidthM: 0.6,
      entrance: 'south' as const,
    };
    const path = getGreenhousePathBounds(4, 6, settings);
    const midX = (path.minX + path.maxX) / 2;
    expect(
      isInsideAllowedArea({
        x: midX,
        y: 3,
        widthM: 4,
        heightM: 6,
        sizeM: 0.4,
        zoneType: 'GREENHOUSE',
        settings,
      }),
    ).toBe(false);

    const placed = normalizePlantPlacement({
      x: midX,
      y: 3,
      bedWidthM: 4,
      bedHeightM: 6,
      zoneType: 'GREENHOUSE',
      settings,
      snap: false,
    });
    expect(
      isInsideAllowedArea({
        ...placed,
        widthM: 4,
        heightM: 6,
        sizeM: 0.4,
        zoneType: 'GREENHOUSE',
        settings,
      }),
    ).toBe(true);
  });

  it('round-trips screen and world after resize', () => {
    const viewA: ViewTransform = { pxPerMeter: 100, originX: 40, originY: 20 };
    const viewB: ViewTransform = { pxPerMeter: 200, originX: 80, originY: 40 };
    const world = { x: 1.5, y: 0.75 };
    const screenA = worldToScreen(world, viewA);
    expect(screenToWorld(screenA, viewA).x).toBeCloseTo(world.x);
    expect(screenToWorld(screenA, viewA).y).toBeCloseTo(world.y);
    const screenB = worldToScreen(world, viewB);
    expect(screenToWorld(screenB, viewB).x).toBeCloseTo(world.x);
  });
});
