import { SpatialHashGrid } from '../utils/spatial-index';
import type { CanvasPlanObject } from '../types';

describe('SpatialHashGrid & Viewport Culling Optimization Tests', () => {
  const createMockObject = (id: string, xCm: number, yCm: number, widthCm = 200, heightCm = 200): CanvasPlanObject => ({
    id,
    type: 'CUSTOM',
    label: `Object ${id}`,
    xCm,
    yCm,
    widthCm,
    heightCm,
    rotationDeg: 0,
    zIndex: 1,
    layer: 'OTHER',
    color: '#3b82f6',
    locked: false,
    meta: null,
    zoneId: null,
    plantId: null,
  });

  it('1. SpatialHashGrid індексує обʼєкти та знаходить сусідів у радіусі', () => {
    const grid = new SpatialHashGrid(300);
    const objA = createMockObject('A', 100, 100);
    const objB = createMockObject('B', 250, 150); // Близький сусід (~150 см)
    const objFar = createMockObject('Far', 2000, 2000); // Далекий обʼєкт (>2000 см)

    grid.rebuild([objA, objB, objFar]);

    const neighbors = grid.queryNeighbors(objA, 400);
    const neighborIds = neighbors.map((n) => n.id);

    expect(neighborIds).toContain('B');
    expect(neighborIds).not.toContain('Far');
    expect(neighborIds).not.toContain('A'); // сам себе виключає
  });

  it('2. computeSnapGuidesForObject знаходить вертикальні й горизонтальні напрямні вирівнювання', () => {
    const grid = new SpatialHashGrid(300);
    const obj1 = createMockObject('1', 500, 500, 200, 200);
    const obj2 = createMockObject('2', 505, 800, 200, 200); // майже на тій самій X (delta = 5 см < 15 см)

    grid.rebuild([obj1, obj2]);

    const { guides, snappedX } = grid.computeSnapGuidesForObject(obj2, 2000, 2000, 15);
    expect(guides.length).toBeGreaterThan(0);
    expect(snappedX).toBe(500); // вирівнявся до obj1.xCm
  });

  it('3. computeSnapGuidesForObject вирівнює до меж ділянки (X=0, plotWidth)', () => {
    const grid = new SpatialHashGrid(300);
    const nearBoundary = createMockObject('nearEdge', 8, 500, 100, 100);

    grid.rebuild([nearBoundary]);

    const { guides, snappedX } = grid.computeSnapGuidesForObject(nearBoundary, 2000, 2000, 15);
    expect(guides.some((g) => g.type === 'vertical' && g.posCm === 0)).toBe(true);
    expect(snappedX).toBe(0);
  });

  it('4. Масштабованість на 300 обʼєктах: запит просторового індексу виконується за < 2 мс', () => {
    const grid = new SpatialHashGrid(300);
    const objects: CanvasPlanObject[] = [];

    for (let i = 0; i < 300; i++) {
      const row = Math.floor(i / 15);
      const col = i % 15;
      objects.push(createMockObject(`obj-${i}`, col * 350, row * 350, 150, 150));
    }

    grid.rebuild(objects);

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      grid.queryNeighbors(objects[i]!, 400);
    }
    const duration = performance.now() - start;

    expect(duration / 50).toBeLessThan(2); // середня тривалість < 2 мс на запит
  });

  it('5. Viewport Culling логіка коректно відсікає обʼєкти за межами екрана', () => {
    const minWorldX = 0;
    const minWorldY = 0;
    const maxWorldX = 1000;
    const maxWorldY = 800;

    const visibleCandidate = createMockObject('vis', 500, 400, 100, 100);
    const offscreenCandidate = createMockObject('off', 2500, 3000, 100, 100);

    const isVisible = (obj: CanvasPlanObject) =>
      obj.xCm + obj.widthCm >= minWorldX &&
      obj.xCm <= maxWorldX &&
      obj.yCm + obj.heightCm >= minWorldY &&
      obj.yCm <= maxWorldY;

    expect(isVisible(visibleCandidate)).toBe(true);
    expect(isVisible(offscreenCandidate)).toBe(false);
  });
});
