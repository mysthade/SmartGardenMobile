import * as THREE from 'three';
import {
  cleanPolygonVertices,
  createBoundaryBufferGeometry,
  getSignedArea,
  isPointInTriangle,
  triangulatePolygon2D,
  type PolygonPoint,
} from '../utils/polygon-triangulation';

describe('polygon-triangulation (Ear-Clipping & BufferGeometry)', () => {
  it('correctly calculates signed area and orientation', () => {
    // Clockwise square (in screen coords where Y points down)
    const cwSquare: PolygonPoint[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 100, yCm: 0 },
      { xCm: 100, yCm: 100 },
      { xCm: 0, yCm: 100 },
    ];
    // Shoelace area of 100x100 square is 10000 cm^2
    expect(getSignedArea(cwSquare)).toBe(10000);

    // Empty or < 3 points
    expect(getSignedArea([])).toBe(0);
    expect(getSignedArea([{ xCm: 0, yCm: 0 }])).toBe(0);
  });

  it('correctly tests point in triangle', () => {
    // Triangle: (0,0), (10, 0), (0, 10)
    expect(isPointInTriangle(2, 2, 0, 0, 10, 0, 0, 10)).toBe(true);
    // Point outside
    expect(isPointInTriangle(15, 15, 0, 0, 10, 0, 0, 10)).toBe(false);
    expect(isPointInTriangle(-1, -1, 0, 0, 10, 0, 0, 10)).toBe(false);
  });

  it('cleans duplicate and collinear vertices within 1cm threshold', () => {
    const dirtyPoints: PolygonPoint[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 0.2, yCm: 0.1 }, // duplicate < 1cm
      { xCm: 100, yCm: 0 },
      { xCm: 100, yCm: 100 },
      { xCm: 0, yCm: 100 },
      { xCm: 0.1, yCm: 0.2 }, // duplicate of first point
    ];

    const cleaned = cleanPolygonVertices(dirtyPoints);
    expect(cleaned.length).toBe(4);
    expect(cleaned[0]).toEqual({ xCm: 0, yCm: 0 });
    expect(cleaned[1]).toEqual({ xCm: 100, yCm: 0 });
    expect(cleaned[2]).toEqual({ xCm: 100, yCm: 100 });
    expect(cleaned[3]).toEqual({ xCm: 0, yCm: 100 });
  });

  it('triangulates convex square into 2 triangles (6 indices)', () => {
    const square: PolygonPoint[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 100, yCm: 0 },
      { xCm: 100, yCm: 100 },
      { xCm: 0, yCm: 100 },
    ];

    const indices = triangulatePolygon2D(square);
    expect(indices.length).toBe(6); // 2 triangles * 3 vertices
    expect(indices.every((idx) => idx >= 0 && idx < 4)).toBe(true);
  });

  it('triangulates a 3-point triangle directly', () => {
    const tri: PolygonPoint[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 50, yCm: 100 },
      { xCm: 100, yCm: 0 },
    ];

    const indices = triangulatePolygon2D(tri);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('handles degenerate polygon with < 3 points without throwing', () => {
    expect(triangulatePolygon2D([])).toEqual([]);
    expect(triangulatePolygon2D([{ xCm: 10, yCm: 10 }])).toEqual([]);
    expect(triangulatePolygon2D([{ xCm: 0, yCm: 0 }, { xCm: 10, yCm: 10 }])).toEqual([]);
  });

  it('triangulates concave L-shaped polygon (6 vertices) without infinite loops', () => {
    // L-shaped polygon
    const lShape: PolygonPoint[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 50, yCm: 0 },
      { xCm: 50, yCm: 50 },
      { xCm: 100, yCm: 50 },
      { xCm: 100, yCm: 100 },
      { xCm: 0, yCm: 100 },
    ];

    const indices = triangulatePolygon2D(lShape);
    // An n-gon has (n - 2) triangles: 6 - 2 = 4 triangles = 12 indices
    expect(indices.length).toBe(12);
    expect(indices.every((idx) => idx >= 0 && idx < 6)).toBe(true);
  });

  it('creates and caches THREE.BufferGeometry for 3D boundary', () => {
    const boundary: PolygonPoint[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 1000, yCm: 0 },
      { xCm: 1000, yCm: 1000 },
      { xCm: 0, yCm: 1000 },
    ];

    const geom1 = createBoundaryBufferGeometry(boundary, 10, 10);
    expect(geom1).not.toBeNull();
    expect(geom1 instanceof THREE.BufferGeometry).toBe(true);

    if (geom1) {
      expect(geom1.getAttribute('position')).toBeDefined();
      expect(geom1.getAttribute('normal')).toBeDefined();
      expect(geom1.getAttribute('uv')).toBeDefined();
      expect(geom1.getIndex()).not.toBeNull();

      // Normal points up along Y axis
      const normals = geom1.getAttribute('normal').array;
      expect(normals[1]).toBe(1); // Y normal is 1
    }

    // Repeated call with same points hits cache and returns the exact same instance
    const geom2 = createBoundaryBufferGeometry(boundary, 10, 10);
    expect(geom2).toBe(geom1);
  });
});
