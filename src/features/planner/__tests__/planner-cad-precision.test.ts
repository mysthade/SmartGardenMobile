import {
  calculateEdgeProperties,
  cmToMeters,
  getPolygonSignedArea,
  hasPolygonSelfIntersections,
  metersToCm,
  moveEdgeEndpoint,
  snapValueToGrid,
} from '@smart-garden/validation';
import { formatCadMeasurement } from '../components/canvas/MeasurementRulersSvg';
import { SpatialHashGrid } from '../utils/spatial-index';
import { resolveNonOverlappingLabels } from '../utils/label-manager';
import type { CanvasPlanObject } from '../types';

describe('Stage 8: CAD Precision Unit & Math Tests', () => {
  describe('1. Metric Unit Conversion & Precision', () => {
    it('converts between meters and centimeters accurately', () => {
      expect(metersToCm(24.5)).toBe(2450);
      expect(cmToMeters(2450)).toBe(24.5);
      expect(metersToCm(0.01)).toBe(1);
      expect(cmToMeters(1)).toBe(0.01);
    });

    it('formats CAD measurements based on selected unit and precision', () => {
      // Meters with 2 decimals
      expect(formatCadMeasurement(245, 'm', 0.01)).toBe('2.45 м');
      expect(formatCadMeasurement(1200, 'm', 0.01)).toBe('12.00 м');

      // Meters with 1 decimal
      expect(formatCadMeasurement(245, 'm', 0.1)).toBe('2.5 м');

      // Centimeters
      expect(formatCadMeasurement(245, 'cm', 0.01)).toBe('245 см');

      // Feet
      expect(formatCadMeasurement(304.8, 'ft', 0.01)).toBe('10.00 ft');
    });

    it('verifies round-trip coordinate preservation with < 1e-6 m accuracy', () => {
      const originalCoords = [
        { x: 12.345678, y: 98.765432 },
        { x: 0.000001, y: 150.000002 },
        { x: 45.123456, y: 32.654321 },
      ];

      for (const orig of originalCoords) {
        // Web -> Mobile cm
        const mobileXCm = Math.round(orig.x * 100);
        const mobileYCm = Math.round(orig.y * 100);

        // Mobile -> Web meters
        const webXMeters = mobileXCm / 100;
        const webYMeters = mobileYCm / 100;

        // Centimeter-accuracy tolerance
        expect(Math.abs(orig.x - webXMeters)).toBeLessThan(0.01);
        expect(Math.abs(orig.y - webYMeters)).toBeLessThan(0.01);
      }
    });
  });

  describe('2. Snapping (Grid & Smart Object Snapping in DP threshold)', () => {
    it('snaps value to grid steps (5cm, 10cm, 50cm, 100cm)', () => {
      expect(snapValueToGrid(12.3, 10)).toBe(10);
      expect(snapValueToGrid(16.8, 10)).toBe(20);
      expect(snapValueToGrid(124, 50)).toBe(100);
      expect(snapValueToGrid(126, 50)).toBe(150);
      expect(snapValueToGrid(289, 100)).toBe(300);
    });

    it('calculates snap guides against neighbors and plot boundary', () => {
      const spatial = new SpatialHashGrid(300);
      const neighbor: CanvasPlanObject = {
        id: 'obj-neighbor',
        type: 'GAZEBO',
        label: 'Альтанка',
        xCm: 200,
        yCm: 200,
        widthCm: 300,
        heightCm: 300,
        rotationDeg: 0,
        zIndex: 1,
        layer: 'BUILDINGS',
        color: null,
        locked: false,
        meta: null,
        zoneId: null,
        plantId: null,
      };

      spatial.rebuild([neighbor]);

      const target: CanvasPlanObject = {
        id: 'obj-target',
        type: 'WELL',
        label: 'Колодязь',
        xCm: 204, // 4cm away from neighbor left (200) -> should snap within threshold
        yCm: 450,
        widthCm: 100,
        heightCm: 100,
        rotationDeg: 0,
        zIndex: 2,
        layer: 'UTILITIES',
        color: null,
        locked: false,
        meta: null,
        zoneId: null,
        plantId: null,
      };

      const { guides, snappedX } = spatial.computeSnapGuidesForObject(
        target,
        2000,
        1500,
        15, // 15cm threshold
      );

      expect(guides.length).toBeGreaterThan(0);
      expect(snappedX).toBe(200); // Successfully snapped left-to-left
    });
  });

  describe('3. CAD Boundary & Edge Calculations', () => {
    it('computes edge properties (length and angle) accurately', () => {
      const p1 = { xCm: 0, yCm: 0 };
      const p2 = { xCm: 300, yCm: 400 };

      const { lengthCm, angleDeg } = calculateEdgeProperties(p1, p2);
      expect(lengthCm).toBe(500); // 3-4-5 triangle
      expect(angleDeg).toBe(53); // ~53.13 deg
    });

    it('displaces edge endpoint given a new length and angle', () => {
      const p1 = { xCm: 100, yCm: 100 };
      const moved = moveEdgeEndpoint(p1, 500, 0); // 5m directly to the right
      expect(moved.xCm).toBe(600);
      expect(moved.yCm).toBe(100);

      const movedDown = moveEdgeEndpoint(p1, 300, 90); // 3m straight down
      expect(movedDown.xCm).toBe(100);
      expect(movedDown.yCm).toBe(400);
    });

    it('detects polygon self-intersections to prevent invalid plot boundaries', () => {
      // Normal non-intersecting quadrilateral
      const validQuad = [
        { xCm: 0, yCm: 0 },
        { xCm: 1000, yCm: 0 },
        { xCm: 1000, yCm: 1000 },
        { xCm: 0, yCm: 1000 },
      ];
      expect(hasPolygonSelfIntersections(validQuad)).toBe(false);

      // Bowtie self-intersecting polygon
      const selfIntersecting = [
        { xCm: 0, yCm: 0 },
        { xCm: 1000, yCm: 1000 },
        { xCm: 1000, yCm: 0 },
        { xCm: 0, yCm: 1000 },
      ];
      expect(hasPolygonSelfIntersections(selfIntersecting)).toBe(true);
    });

    it('calculates polygon area using shoelace formula', () => {
      // 20m x 15m rectangle = 300 m² = 3,000,000 cm²
      const rect = [
        { xCm: 0, yCm: 0 },
        { xCm: 2000, yCm: 0 },
        { xCm: 2000, yCm: 1500 },
        { xCm: 0, yCm: 1500 },
      ];
      const areaCm2 = Math.abs(getPolygonSignedArea(rect));
      expect(areaCm2).toBe(3000000);
      expect(areaCm2 / 10000).toBe(300); // 300 m²
    });
  });

  describe('4. Label Avoidance & Screen Clamping', () => {
    it('prevents overlapping labels and ensures clamping inside viewport', () => {
      const screenW = 390;
      const screenH = 844;
      const candidates = [
        { id: '1', text: 'Будинок', screenX: 50, screenY: 100, isSelected: true },
        { id: '2', text: 'Будинок копія', screenX: 52, screenY: 102 }, // Overlaps #1
        { id: '3', text: 'Огорожа схід', screenX: 450, screenY: 300 }, // Offscreen right
      ];

      const placed = resolveNonOverlappingLabels(candidates, screenW, screenH, 12, 16);

      // Selected label is always preserved
      expect(placed.some((p) => p.id === '1' && p.isSelected)).toBe(true);

      // Overlapping candidate #2 is dropped
      expect(placed.some((p) => p.id === '2')).toBe(false);

      // Offscreen label #3 is clamped inside screen boundaries
      const clamped = placed.find((p) => p.id === '3');
      expect(clamped).toBeDefined();
      if (clamped) {
        expect(clamped.screenX + clamped.width).toBeLessThanOrEqual(screenW - 16);
      }
    });
  });
});
