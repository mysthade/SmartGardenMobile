import { describe, expect, it } from 'vitest';
import {
  calculateDistances,
  calculateEdgeProperties,
  calculateTotalLineLength,
  checkObjectsOverlap,
  checkPolygonsOverlap,
  cmToMeters,
  cmToPx,
  computeLineBoundingBox,
  ensurePolygonClockwise,
  findSnapGuides,
  formatMeasurement,
  getAABB,
  getEffectiveBoundary,
  getEffectiveLinePoints,
  getRotatedCorners,
  hasPolygonSelfIntersections,
  isObjectOutOfBounds,
  isPolygonClockwise,
  metersToCm,
  moveEdgeEndpoint,
  pxToCm,
  rotatePoint,
  snapValueToGrid,
  type RectCm,
} from '../planner-math';

describe('planner-math: Pure Geometry & Unit Transformations', () => {
  describe('cmToPx and pxToCm conversion', () => {
    it('converts cm to px correctly at given scale', () => {
      expect(cmToPx(100, 0.5)).toBe(50);
      expect(cmToPx(350, 0.2)).toBe(70);
      expect(cmToPx(0, 1)).toBe(0);
    });

    it('converts px to cm correctly at given scale', () => {
      expect(pxToCm(50, 0.5)).toBe(100);
      expect(pxToCm(70, 0.2)).toBe(350);
      expect(pxToCm(100, 0)).toBe(0);
    });

    it('round-trips cm -> px -> cm accurately', () => {
      const scale = 0.25;
      const initialCm = 425;
      const px = cmToPx(initialCm, scale);
      const convertedBack = pxToCm(px, scale);
      expect(convertedBack).toBeCloseTo(initialCm, 5);
    });
  });

  describe('meters <-> cm and formatMeasurement', () => {
    it('converts meters to cm and vice versa', () => {
      expect(metersToCm(2.5)).toBe(250);
      expect(cmToMeters(250)).toBe(2.5);
      expect(metersToCm(0)).toBe(0);
      expect(cmToMeters(0)).toBe(0);
    });

    it('formats measurement in cm when < 100cm and in meters when >= 100cm', () => {
      expect(formatMeasurement(45)).toBe('45 см');
      expect(formatMeasurement(99.4)).toBe('99 см');
      expect(formatMeasurement(100)).toBe('1 м');
      expect(formatMeasurement(350)).toBe('3.5 м');
      expect(formatMeasurement(1205)).toBe('12.05 м');
    });
  });

  describe('snapValueToGrid', () => {
    it('snaps values to nearest grid step', () => {
      expect(snapValueToGrid(48, 10)).toBe(50);
      expect(snapValueToGrid(42, 10)).toBe(40);
      expect(snapValueToGrid(73, 50)).toBe(50);
      expect(snapValueToGrid(76, 50)).toBe(100);
      expect(snapValueToGrid(140, 100)).toBe(100);
      expect(snapValueToGrid(160, 100)).toBe(200);
    });

    it('handles zero or negative grid size safely', () => {
      expect(snapValueToGrid(48, 0)).toBe(48);
      expect(snapValueToGrid(48, -10)).toBe(48);
    });
  });

  describe('rotatePoint, getRotatedCorners and getAABB', () => {
    it('rotates a point around origin / center correctly', () => {
      const center = { x: 100, y: 100 };
      const point = { x: 200, y: 100 }; // 100 units to the right
      const rotated90 = rotatePoint(point, center, 90);
      expect(rotated90.x).toBeCloseTo(100, 4);
      expect(rotated90.y).toBeCloseTo(200, 4);

      const rotated180 = rotatePoint(point, center, 180);
      expect(rotated180.x).toBeCloseTo(0, 4);
      expect(rotated180.y).toBeCloseTo(100, 4);
    });

    it('computes 4 vertices of unrotated rectangle', () => {
      const rect: RectCm = { xCm: 10, yCm: 20, widthCm: 100, heightCm: 50, rotationDeg: 0 };
      const vertices = getRotatedCorners(rect);
      expect(vertices).toHaveLength(4);
      expect(vertices[0]).toEqual({ x: 10, y: 20 });
      expect(vertices[1]).toEqual({ x: 110, y: 20 });
      expect(vertices[2]).toEqual({ x: 110, y: 70 });
      expect(vertices[3]).toEqual({ x: 10, y: 70 });
    });

    it('computes correct rotated bounding box with getAABB', () => {
      const rect: RectCm = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100, rotationDeg: 0 };
      const corners0 = getRotatedCorners(rect);
      const box0 = getAABB(corners0);
      expect(box0.minX).toBe(0);
      expect(box0.minY).toBe(0);
      expect(box0.maxX).toBe(100);
      expect(box0.maxY).toBe(100);

      // 45 degrees rotated 100x100 box around center (50, 50)
      const rect45: RectCm = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100, rotationDeg: 45 };
      const corners45 = getRotatedCorners(rect45);
      const box45 = getAABB(corners45);
      const halfDiagonal = (100 * Math.SQRT2) / 2;
      expect(box45.minX).toBeCloseTo(50 - halfDiagonal, 2);
      expect(box45.maxX).toBeCloseTo(50 + halfDiagonal, 2);
    });
  });

  describe('Collision Detection (SAT algorithm)', () => {
    it('detects overlap of axis-aligned rectangles', () => {
      const r1: RectCm = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100 };
      const r2: RectCm = { xCm: 50, yCm: 50, widthCm: 100, heightCm: 100 };
      const r3: RectCm = { xCm: 200, yCm: 200, widthCm: 50, heightCm: 50 };

      expect(checkObjectsOverlap(r1, r2)).toBe(true);
      expect(checkObjectsOverlap(r1, r3)).toBe(false);
      expect(checkObjectsOverlap(r2, r3)).toBe(false);
    });

    it('detects overlap when rectangles are rotated', () => {
      const r1: RectCm = { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100, rotationDeg: 0 };
      const r2: RectCm = { xCm: 110, yCm: 0, widthCm: 100, heightCm: 100, rotationDeg: 0 };
      expect(checkObjectsOverlap(r1, r2)).toBe(false);

      // Rotating r1 by 45 degrees extends its corner past x=100 up to ~120, causing overlap
      const r1Rotated: RectCm = { ...r1, rotationDeg: 45 };
      expect(checkObjectsOverlap(r1Rotated, r2)).toBe(true);
    });

    it('checks general polygon overlap with checkPolygonsOverlap', () => {
      const triangleA = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      const triangleB = [
        { x: 4, y: 2 },
        { x: 14, y: 2 },
        { x: 9, y: 12 },
      ];
      const triangleC = [
        { x: 50, y: 50 },
        { x: 60, y: 50 },
        { x: 55, y: 60 },
      ];

      expect(checkPolygonsOverlap(triangleA, triangleB)).toBe(true);
      expect(checkPolygonsOverlap(triangleA, triangleC)).toBe(false);
    });
  });

  describe('isObjectOutOfBounds', () => {
    it('detects when object is inside rectangular plot', () => {
      const obj: RectCm = { xCm: 10, yCm: 10, widthCm: 100, heightCm: 100 };
      expect(isObjectOutOfBounds(obj, 500, 500)).toBe(false);
    });

    it('detects when object violates plot boundaries', () => {
      expect(isObjectOutOfBounds({ xCm: -10, yCm: 10, widthCm: 50, heightCm: 50 }, 500, 500)).toBe(true);
      expect(isObjectOutOfBounds({ xCm: 10, yCm: -5, widthCm: 50, heightCm: 50 }, 500, 500)).toBe(true);
      expect(isObjectOutOfBounds({ xCm: 480, yCm: 10, widthCm: 50, heightCm: 50 }, 500, 500)).toBe(true);
      expect(isObjectOutOfBounds({ xCm: 10, yCm: 480, widthCm: 50, heightCm: 50 }, 500, 500)).toBe(true);
    });
  });

  describe('findSnapGuides', () => {
    it('snaps candidate object to plot borders within threshold', () => {
      const candidate: RectCm = { xCm: 4, yCm: 8, widthCm: 100, heightCm: 100 };
      const snapResult = findSnapGuides(candidate, [], 1000, 1000, 10);

      expect(snapResult.snappedX).toBe(0);
      expect(snapResult.snappedY).toBe(0);
      expect(snapResult.guides.length).toBeGreaterThanOrEqual(2);
    });

    it('snaps candidate object to neighboring objects edges', () => {
      const other: RectCm = { xCm: 200, yCm: 100, widthCm: 100, heightCm: 100 };
      const candidate: RectCm = { xCm: 304, yCm: 103, widthCm: 50, heightCm: 50 };
      const snapResult = findSnapGuides(candidate, [other], 1000, 1000, 10);

      expect(snapResult.snappedX).toBe(300);
      expect(snapResult.snappedY).toBe(100);
    });
  });

  describe('calculateDistances', () => {
    it('calculates distances to plot boundaries and nearest neighbor', () => {
      const selected: RectCm = { xCm: 50, yCm: 80, widthCm: 100, heightCm: 100 };
      const neighbor: RectCm = { xCm: 250, yCm: 80, widthCm: 100, heightCm: 100 };

      const distances = calculateDistances(selected, [neighbor], 1000, 800);
      expect(distances.toPlot.leftCm).toBe(50);
      expect(distances.toPlot.topCm).toBe(80);
      expect(distances.toPlot.rightCm).toBe(1000 - (50 + 100)); // 850
      expect(distances.toPlot.bottomCm).toBe(800 - (80 + 100)); // 620

      expect(distances.nearestNeighbor).toBeDefined();
      expect(distances.nearestNeighbor?.distanceCm).toBe(100);
    });
  });

  describe('Polygon & Boundary Math', () => {
    it('generates 4-point rectangle fallback when boundary is missing or < 3 points', () => {
      const fallback = getEffectiveBoundary({ widthCm: 600, heightCm: 400 });
      expect(fallback).toEqual([
        { xCm: 0, yCm: 0 },
        { xCm: 600, yCm: 0 },
        { xCm: 600, yCm: 400 },
        { xCm: 0, yCm: 400 },
      ]);

      const customPoly = [
        { xCm: 0, yCm: 0 },
        { xCm: 500, yCm: 50 },
        { xCm: 400, yCm: 400 },
      ];
      expect(getEffectiveBoundary({ widthCm: 600, heightCm: 400, boundary: customPoly })).toEqual(customPoly);
    });

    it('correctly detects clockwise orientation and can ensure clockwise order', () => {
      // CW in screen coords (Y down): (0,0) -> (100,0) -> (100,100) -> (0,100)
      const cw = [
        { xCm: 0, yCm: 0 },
        { xCm: 100, yCm: 0 },
        { xCm: 100, yCm: 100 },
        { xCm: 0, yCm: 100 },
      ];
      expect(isPolygonClockwise(cw)).toBe(true);

      const ccw = [...cw].reverse();
      expect(isPolygonClockwise(ccw)).toBe(false);

      const fixed = ensurePolygonClockwise(ccw);
      expect(isPolygonClockwise(fixed)).toBe(true);
    });

    it('detects self-intersections in complex polygons', () => {
      // Simple rectangle - no self-intersection
      const simple = [
        { xCm: 0, yCm: 0 },
        { xCm: 100, yCm: 0 },
        { xCm: 100, yCm: 100 },
        { xCm: 0, yCm: 100 },
      ];
      expect(hasPolygonSelfIntersections(simple)).toBe(false);

      // Figure-8 (bowtie) self-intersecting polygon
      const bowTie = [
        { xCm: 0, yCm: 0 },
        { xCm: 100, yCm: 100 },
        { xCm: 100, yCm: 0 },
        { xCm: 0, yCm: 100 },
      ];
      expect(hasPolygonSelfIntersections(bowTie)).toBe(true);
    });

    it('calculates edge properties and moves endpoints', () => {
      const p1 = { xCm: 0, yCm: 0 };
      const p2 = { xCm: 300, yCm: 400 };
      const props = calculateEdgeProperties(p1, p2);
      expect(props.lengthCm).toBe(500);

      const moved = moveEdgeEndpoint(p1, 1000, 0);
      expect(moved).toEqual({ xCm: 1000, yCm: 0 });
    });
  });

  describe('LinePath: Geometry & Migration', () => {
    it('migrates legacy rectangular object to 2-point LinePath along its rotation angle', () => {
      // Прямокутник 500x25 см без повороту в (100, 100)
      const legacy = {
        xCm: 100,
        yCm: 100,
        widthCm: 500,
        heightCm: 25,
        rotationDeg: 0,
      };
      const pts = getEffectiveLinePoints(legacy);
      expect(pts.length).toBe(2);
      expect(pts[0]).toEqual({ xCm: 100, yCm: 113 });
      expect(pts[1]).toEqual({ xCm: 600, yCm: 113 });
    });

    it('returns meta.linePoints when present', () => {
      const modern = {
        xCm: 50,
        yCm: 50,
        widthCm: 300,
        heightCm: 80,
        rotationDeg: 0,
        meta: {
          linePoints: [
            { xCm: 10, yCm: 20 },
            { xCm: 150, yCm: 80 },
            { xCm: 300, yCm: 200 },
          ],
        },
      };
      const pts = getEffectiveLinePoints(modern);
      expect(pts.length).toBe(3);
      expect(pts[1]).toEqual({ xCm: 150, yCm: 80 });
    });

    it('computes total line length and bounding box accurately', () => {
      const line = [
        { xCm: 0, yCm: 0 },
        { xCm: 300, yCm: 400 },
        { xCm: 600, yCm: 400 },
      ];
      // 500 + 300 = 800
      expect(calculateTotalLineLength(line)).toBe(800);

      const aabb = computeLineBoundingBox(line, 80);
      expect(aabb.widthCm).toBeGreaterThanOrEqual(600);
      expect(aabb.heightCm).toBeGreaterThanOrEqual(400);
    });
  });
});

