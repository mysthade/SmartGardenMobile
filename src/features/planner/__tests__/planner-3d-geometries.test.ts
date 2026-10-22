import * as THREE from 'three';
import {
  createGableRoofGeometry,
  createPyramidRoofGeometry,
  createBoundaryRibbonGeometry,
  createPlotGridGeometry,
} from '../utils/3d-geometries';

describe('3D Procedural Geometries (Seam-free roofs, boundary ribbon, grid)', () => {
  it('1. createGableRoofGeometry creates triangular prism with separate face normals', () => {
    const geom = createGableRoofGeometry();
    expect(geom).toBeInstanceOf(THREE.BufferGeometry);

    const pos = geom.getAttribute('position');
    expect(pos).toBeDefined();
    // 6 faces (front, back, left gable, right gable, 2 bottom tris) = 8 triangles * 3 = 24 vertices
    expect(pos.count).toBe(24);

    const norm = geom.getAttribute('normal');
    expect(norm).toBeDefined();
    expect(norm.count).toBe(24);

    // Verify no NaN values in positions or normals
    for (let i = 0; i < pos.count * 3; i++) {
      expect(Number.isNaN(pos.array[i])).toBe(false);
      expect(Number.isNaN(norm.array[i])).toBe(false);
    }
  });

  it('2. createPyramidRoofGeometry creates 4-sided pyramid with flat face normals', () => {
    const geom = createPyramidRoofGeometry();
    expect(geom).toBeInstanceOf(THREE.BufferGeometry);

    const pos = geom.getAttribute('position');
    // 4 sides * 3 verts + 2 bottom base tris * 3 verts = 18 vertices
    expect(pos.count).toBe(18);

    const norm = geom.getAttribute('normal');
    expect(norm.count).toBe(18);

    for (let i = 0; i < pos.count * 3; i++) {
      expect(Number.isNaN(pos.array[i])).toBe(false);
      expect(Number.isNaN(norm.array[i])).toBe(false);
    }
  });

  it('3. createBoundaryRibbonGeometry creates extruded ribbon quad strip', () => {
    const boundary = [
      { xCm: 0, yCm: 0 },
      { xCm: 1000, yCm: 0 },
      { xCm: 1000, yCm: 800 },
      { xCm: 0, yCm: 800 },
    ];

    const geom = createBoundaryRibbonGeometry(boundary, 10, 8, 0.16);
    expect(geom).not.toBeNull();
    if (!geom) return;

    const pos = geom.getAttribute('position');
    // 4 edges * 2 triangles * 3 vertices = 24 vertices
    expect(pos.count).toBe(24);

    // Elevated slightly above ground to prevent z-fighting
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      expect(y).toBeCloseTo(0.026);
    }
  });

  it('4. createPlotGridGeometry creates grid line segments', () => {
    const geom = createPlotGridGeometry(10, 10, 1.0);
    expect(geom).toBeInstanceOf(THREE.BufferGeometry);

    const pos = geom.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);
    // Every line segment has 2 vertices
    expect(pos.count % 2).toBe(0);
  });
});
