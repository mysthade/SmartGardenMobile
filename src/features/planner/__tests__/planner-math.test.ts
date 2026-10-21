import {
  calculateDistances,
  calculateEdgeProperties,
  calculateTotalLineLength,
  checkObjectsOverlap,
  cmToMeters,
  cmToPx,
  computeLineBoundingBox,
  findSnapGuides,
  formatMeasurement,
  getEffectiveBoundary,
  getEffectiveLinePoints,
  getPolygonSignedArea,
  metersToCm,
  pxToCm,
  rotatePoint,
  snapValueToGrid,
} from '@smart-garden/validation';
import type { BoundaryPoint, RectCm } from '@smart-garden/validation';
import type { PlanObjectDto } from '@smart-garden/types';

describe('Garden Planner Math & Coordinate Round-Trip Tests (Етап 0)', () => {
  describe('Масштабування та перетворення координат (Round-Trip cm <-> px)', () => {
    it('зберігає точність при round-trip cm -> px -> cm для різних масштабів', () => {
      const testCases = [
        { cm: 0, scale: 0.5 },
        { cm: 50, scale: 0.1 },
        { cm: 125.75, scale: 0.35 },
        { cm: 1200, scale: 1.0 },
        { cm: 3500.5, scale: 2.5 },
        { cm: 10000, scale: 0.05 },
      ];

      for (const { cm, scale } of testCases) {
        const px = cmToPx(cm, scale);
        const roundTripCm = pxToCm(px, scale);
        expect(roundTripCm).toBeCloseTo(cm, 6);
      }
    });

    it('коректно перетворює метри у сантиметри і навпаки', () => {
      expect(metersToCm(3.5)).toBe(350);
      expect(cmToMeters(450)).toBe(4.5);
      expect(formatMeasurement(60)).toBe('60 см');
      expect(formatMeasurement(350)).toBe('3.5 м');
      expect(formatMeasurement(1200)).toBe('12 м');
    });

    it('snapValueToGrid привʼязує координати до кроку сітки', () => {
      expect(snapValueToGrid(123, 50)).toBe(100);
      expect(snapValueToGrid(135, 50)).toBe(150);
      expect(snapValueToGrid(99, 100)).toBe(100);
      expect(snapValueToGrid(49, 100)).toBe(0);
      expect(snapValueToGrid(42, 10)).toBe(40);
    });
  });

  describe('Межі ділянки (Plot Boundary & Area)', () => {
    const rectangularPlan = {
      widthCm: 2000, // 20 м
      heightCm: 1500, // 15 м
      boundary: null,
    };

    it('getEffectiveBoundary повертає 4 вершини прямокутника, якщо boundary відсутній', () => {
      const boundary = getEffectiveBoundary(rectangularPlan);
      expect(boundary).toHaveLength(4);
      expect(boundary).toEqual([
        { xCm: 0, yCm: 0 },
        { xCm: 2000, yCm: 0 },
        { xCm: 2000, yCm: 1500 },
        { xCm: 0, yCm: 1500 },
      ]);
    });

    it('розраховує площу прямокутної ділянки (300 м² = 3 000 000 см²)', () => {
      const boundary = getEffectiveBoundary(rectangularPlan);
      const signedArea = getPolygonSignedArea(boundary);
      // У системі з Y вниз, годинникова стрілка дає додатну площу
      expect(Math.abs(signedArea)).toBe(3_000_000);
      const areaM2 = Math.abs(signedArea) / 10000;
      expect(areaM2).toBe(300);
    });

    it('коректно рахує площу довільного L-подібного полігону', () => {
      // L-подібна ділянка: прямокутник 20x20м (400м²) мінус кут 10x10м (100м²) = 300м²
      const lPolygon: BoundaryPoint[] = [
        { xCm: 0, yCm: 0 },
        { xCm: 2000, yCm: 0 },
        { xCm: 2000, yCm: 1000 },
        { xCm: 1000, yCm: 1000 },
        { xCm: 1000, yCm: 2000 },
        { xCm: 0, yCm: 2000 },
      ];
      const area = Math.abs(getPolygonSignedArea(lPolygon));
      expect(area / 10000).toBe(300);
    });

    it('calculateEdgeProperties рахує довжину та кут ребра', () => {
      const p1: BoundaryPoint = { xCm: 0, yCm: 0 };
      const p2: BoundaryPoint = { xCm: 300, yCm: 400 };
      const { lengthCm, angleDeg } = calculateEdgeProperties(p1, p2);
      expect(lengthCm).toBe(500); // 3-4-5 трикутник
      expect(angleDeg).toBe(53);
    });
  });

  describe('Обʼєкти плану та лінійні структури (Real Fixtures)', () => {
    const fixtureHouse: PlanObjectDto = {
      id: 'obj-house-1',
      planId: 'plan-1',
      type: 'HOUSE',
      label: 'Житловий будинок',
      xCm: 200,
      yCm: 200,
      widthCm: 800,
      heightCm: 600,
      rotationDeg: 0,
      zIndex: 1,
      layer: 'BUILDINGS',
      color: '#c0653a',
      locked: false,
      meta: null,
      zoneId: null,
      plantId: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const fixtureFenceWithLinePoints: PlanObjectDto = {
      id: 'obj-fence-1',
      planId: 'plan-1',
      type: 'FENCE',
      label: 'Паркан фасадний',
      xCm: 0,
      yCm: 0,
      widthCm: 1500,
      heightCm: 20,
      rotationDeg: 0,
      zIndex: 2,
      layer: 'PATHS',
      color: '#78716c',
      locked: true,
      meta: {
        linePoints: [
          { xCm: 0, yCm: 0 },
          { xCm: 1000, yCm: 0 },
          { xCm: 1000, yCm: 500 },
        ],
      },
      zoneId: null,
      plantId: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('getEffectiveLinePoints витягує точки з meta.linePoints', () => {
      const pts = getEffectiveLinePoints(fixtureFenceWithLinePoints);
      expect(pts).toHaveLength(3);
      expect(pts[0]).toEqual({ xCm: 0, yCm: 0 });
      expect(pts[2]).toEqual({ xCm: 1000, yCm: 500 });
      expect(calculateTotalLineLength(pts)).toBe(1500);
    });

    it('getEffectiveLinePoints мігрує прямокутний обʼєкт без meta на льоту', () => {
      const legacyPath = {
        xCm: 100,
        yCm: 100,
        widthCm: 400,
        heightCm: 50,
        rotationDeg: 0,
        meta: null,
      };
      const pts = getEffectiveLinePoints(legacyPath);
      expect(pts).toHaveLength(2);
      expect(pts[0]!.xCm).toBe(100);
      expect(pts[1]!.xCm).toBe(500);
    });

    it('computeLineBoundingBox генерує AABB для лінії з відступами', () => {
      const pts: BoundaryPoint[] = [
        { xCm: 100, yCm: 200 },
        { xCm: 500, yCm: 200 },
      ];
      const box = computeLineBoundingBox(pts, 40);
      expect(box.xCm).toBe(80); // 100 - 20
      expect(box.yCm).toBe(180); // 200 - 20
      expect(box.widthCm).toBe(440); // 400 + 40
      expect(box.heightCm).toBe(40);
    });

    it('checkObjectsOverlap правильно визначає колізії прямокутних обʼєктів', () => {
      const shed: RectCm = { xCm: 900, yCm: 300, widthCm: 300, heightCm: 200 };
      // Будинок: x: 200..1000, y: 200..800
      // Сарай починається в x: 900, y: 300 -> перетинається
      expect(checkObjectsOverlap(fixtureHouse, shed)).toBe(true);

      const distantGazebo: RectCm = { xCm: 1200, yCm: 1000, widthCm: 300, heightCm: 300 };
      expect(checkObjectsOverlap(fixtureHouse, distantGazebo)).toBe(false);
    });

    it('rotatePoint повертає координати при повороті на 90 градусів', () => {
      const center = { x: 100, y: 100 };
      const point = { x: 150, y: 100 };
      const rotated = rotatePoint(point, center, 90);
      expect(rotated.x).toBeCloseTo(100, 5);
      expect(rotated.y).toBeCloseTo(150, 5);
    });

    it('findSnapGuides знаходить привʼязку до ребер сусіднього будинку', () => {
      const candidate: RectCm = { xCm: 1008, yCm: 200, widthCm: 200, heightCm: 200 };
      // Праве ребро будинку знаходиться в x = 200 + 800 = 1000.
      // Кандидат x = 1008 (різниця 8 см <= threshold 15 см).
      const result = findSnapGuides(candidate, [fixtureHouse], 2000, 1500, 15);
      expect(result.snappedX).toBe(1000);
      expect(result.guides.length).toBeGreaterThan(0);
    });

    it('calculateDistances рахує відстані до меж ділянки та найближчих сусідів', () => {
      const gazebo: RectCm = { xCm: 1200, yCm: 400, widthCm: 300, heightCm: 300 };
      const distances = calculateDistances(gazebo, [fixtureHouse], 2000, 1500);

      expect(distances.toPlot.leftCm).toBe(1200);
      expect(distances.toPlot.topCm).toBe(400);
      expect(distances.toPlot.rightCm).toBe(500); // 2000 - (1200 + 300)
      expect(distances.toPlot.bottomCm).toBe(800); // 1500 - (400 + 300)
      expect(distances.nearestNeighbor).toBeDefined();
      expect(distances.nearestNeighbor!.distanceCm).toBe(200); // 1200 - 1000
    });
  });
});
