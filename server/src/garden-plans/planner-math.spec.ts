import {
  calculateDistances,
  checkObjectsOverlap,
  cmToMeters,
  cmToPx,
  findSnapGuides,
  formatMeasurement,
  getAABB,
  getRotatedCorners,
  isObjectOutOfBounds,
  metersToCm,
  pxToCm,
  snapValueToGrid,
} from '@smart-garden/validation';

describe('Planner Mathematics', () => {
  describe('Conversions & formatting', () => {
    it('converts cm to pixels and back', () => {
      const scale = 0.5; // 1 cm = 0.5 px
      expect(cmToPx(200, scale)).toBe(100);
      expect(pxToCm(100, scale)).toBe(200);
    });

    it('converts meters to cm and back', () => {
      expect(metersToCm(5.5)).toBe(550);
      expect(cmToMeters(550)).toBe(5.5);
    });

    it('formats measurement values cleanly', () => {
      expect(formatMeasurement(60)).toBe('60 см');
      expect(formatMeasurement(350)).toBe('3.5 м');
      expect(formatMeasurement(100)).toBe('1 м');
    });

    it('snaps value to grid steps', () => {
      expect(snapValueToGrid(123, 50)).toBe(100);
      expect(snapValueToGrid(126, 50)).toBe(150);
      expect(snapValueToGrid(48, 10)).toBe(50);
    });
  });

  describe('Rotations & Bounding Boxes', () => {
    it('calculates unrotated corners correctly', () => {
      const rect = { xCm: 10, yCm: 20, widthCm: 100, heightCm: 50, rotationDeg: 0 };
      const corners = getRotatedCorners(rect);
      expect(corners).toEqual([
        { x: 10, y: 20 },
        { x: 110, y: 20 },
        { x: 110, y: 70 },
        { x: 10, y: 70 },
      ]);
    });

    it('calculates AABB correctly for rotated corners', () => {
      const rect = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100, rotationDeg: 45 };
      const corners = getRotatedCorners(rect);
      const aabb = getAABB(corners);
      // Diagonal of 100x100 is ~141.42
      expect(Math.round(aabb.width)).toBe(141);
      expect(Math.round(aabb.height)).toBe(141);
    });
  });

  describe('Collisions & Overlaps (SAT)', () => {
    it('detects overlap between two intersecting axis-aligned rectangles', () => {
      const a = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100 };
      const b = { xCm: 50, yCm: 50, widthCm: 100, heightCm: 100 };
      expect(checkObjectsOverlap(a, b)).toBe(true);
    });

    it('returns false for disjoint rectangles', () => {
      const a = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100 };
      const b = { xCm: 200, yCm: 200, widthCm: 100, heightCm: 100 };
      expect(checkObjectsOverlap(a, b)).toBe(false);
    });

    it('handles rotated polygons collision correctly', () => {
      // Two rectangles that would overlap in AABB but do not in rotated space
      const a = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100, rotationDeg: 0 };
      const b = { xCm: 120, yCm: 120, widthCm: 100, heightCm: 20, rotationDeg: 45 };
      expect(checkObjectsOverlap(a, b)).toBe(false);
    });
  });

  describe('Out of bounds', () => {
    it('returns false when object is completely inside plot', () => {
      const rect = { xCm: 100, yCm: 100, widthCm: 200, heightCm: 200 };
      expect(isObjectOutOfBounds(rect, 5000, 5000)).toBe(false);
    });

    it('returns true when object exceeds plot bounds', () => {
      const rect = { xCm: 4900, yCm: 100, widthCm: 200, heightCm: 200 };
      expect(isObjectOutOfBounds(rect, 5000, 5000)).toBe(true);
    });

    it('returns true when negative coordinate', () => {
      const rect = { xCm: -10, yCm: 100, widthCm: 200, heightCm: 200 };
      expect(isObjectOutOfBounds(rect, 5000, 5000)).toBe(true);
    });
  });

  describe('Snapping Guides', () => {
    it('snaps candidate left edge to plot boundary', () => {
      const candidate = { xCm: 7, yCm: 200, widthCm: 100, heightCm: 100 };
      const result = findSnapGuides(candidate, [], 5000, 5000, 15);
      expect(result.snappedX).toBe(0);
      expect(result.guides.some((g) => g.type === 'vertical' && g.posCm === 0)).toBe(true);
    });

    it('snaps to neighbor right edge', () => {
      const neighbor = { xCm: 100, yCm: 100, widthCm: 200, heightCm: 200 }; // right edge = 300
      const candidate = { xCm: 308, yCm: 100, widthCm: 100, heightCm: 100 }; // 8 cm away (< 15)
      const result = findSnapGuides(candidate, [neighbor], 5000, 5000, 15);
      expect(result.snappedX).toBe(300);
    });
  });

  describe('Distances calculation', () => {
    it('calculates distances to plot boundaries', () => {
      const target = { xCm: 200, yCm: 300, widthCm: 100, heightCm: 100 };
      const distances = calculateDistances(target, [], 1000, 1000);
      expect(distances.toPlot.leftCm).toBe(200);
      expect(distances.toPlot.topCm).toBe(300);
      expect(distances.toPlot.rightCm).toBe(700);
      expect(distances.toPlot.bottomCm).toBe(600);
    });
  });
});
