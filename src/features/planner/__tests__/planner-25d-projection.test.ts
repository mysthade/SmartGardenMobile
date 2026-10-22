import {
  projectPoint25D,
  computeDepthZ,
  sortObjectsByDepth,
  computeExtrudedBox25D,
  pointsToSvgPath,
} from '../utils/projection-25d';
import { getModel3DConfig, MODEL_3D_CONFIGS } from '../constants/planner-3d-models';
import { useGardenPlannerStore } from '../store/use-planner-store';
import type { CanvasPlanObject } from '../types';

describe('2.5D Projection & Math Engine', () => {
  const centerCm = { x: 1000, y: 750 };
  const offset = { x: 200, y: 300 };
  const scale = 0.2;

  test('projectPoint25D correctly projects coordinates with yaw and pitch', () => {
    // Center point at ground (Z = 0) with zero yaw
    const ptCenter = projectPoint25D(1000, 750, 0, centerCm, 0, 45, scale, offset);
    expect(ptCenter.x).toBeCloseTo(offset.x);
    expect(ptCenter.y).toBeCloseTo(offset.y);

    // Height Z shifts screen Y vertically upwards (negative Y in SVG)
    const ptElevated = projectPoint25D(1000, 750, 300, centerCm, 0, 45, scale, offset);
    expect(ptElevated.x).toBeCloseTo(offset.x);
    expect(ptElevated.y).toBeLessThan(ptCenter.y); // higher Z = smaller screen Y (upwards)
  });

  test('computeDepthZ calculates depth along camera line of sight', () => {
    // Looking from South (yaw = 0): larger Y is closer to camera (greater depth)
    const depthFar = computeDepthZ(1000, 200, centerCm, 0, 45);
    const depthNear = computeDepthZ(1000, 1400, centerCm, 0, 45);
    expect(depthNear).toBeGreaterThan(depthFar);

    // Looking from North (yaw = 180): larger Y is further from camera
    const depthNorthFar = computeDepthZ(1000, 1400, centerCm, 180, 45);
    const depthNorthNear = computeDepthZ(1000, 200, centerCm, 180, 45);
    expect(depthNorthNear).toBeGreaterThan(depthNorthFar);
  });

  test('sortObjectsByDepth orders objects from back to front (painter algorithm)', () => {
    const mockObjects: CanvasPlanObject[] = [
      {
        id: 'house-1',
        type: 'HOUSE',
        label: 'Будинок',
        xCm: 200,
        yCm: 1200, // Near bottom
        widthCm: 800,
        heightCm: 600,
        rotationDeg: 0,
        zIndex: 1,
        layer: 'BUILDINGS',
        color: null,
        locked: false,
        meta: null,
        zoneId: null,
        plantId: null,
      },
      {
        id: 'shed-1',
        type: 'SHED',
        label: 'Сарай',
        xCm: 200,
        yCm: 200, // Near top (far)
        widthCm: 300,
        heightCm: 200,
        rotationDeg: 0,
        zIndex: 2,
        layer: 'BUILDINGS',
        color: null,
        locked: false,
        meta: null,
        zoneId: null,
        plantId: null,
      },
      {
        id: 'path-1',
        type: 'PATH',
        label: 'Доріжка',
        xCm: 100,
        yCm: 1250, // Ground object
        widthCm: 200,
        heightCm: 80,
        rotationDeg: 0,
        zIndex: 0,
        layer: 'PATHS',
        color: null,
        locked: false,
        meta: null,
        zoneId: null,
        plantId: null,
      },
    ];

    const sorted = sortObjectsByDepth(mockObjects, centerCm, 0, 45);
    // PATH should always be drawn first (at ground level)
    expect(sorted[0]?.id).toBe('path-1');
    // Then far object (shed)
    expect(sorted[1]?.id).toBe('shed-1');
    // Finally near object (house)
    expect(sorted[2]?.id).toBe('house-1');
  });

  test('computeExtrudedBox25D produces top face, visible side faces, and ground shadow', () => {
    const obj: CanvasPlanObject = {
      id: 'house',
      type: 'HOUSE',
      label: 'Дім',
      xCm: 800,
      yCm: 600,
      widthCm: 400,
      heightCm: 300,
      rotationDeg: 0,
      zIndex: 1,
      layer: 'BUILDINGS',
      color: '#c0653a',
      locked: false,
      meta: null,
      zoneId: null,
      plantId: null,
    };

    const box = computeExtrudedBox25D(obj, 530, '#c0653a', centerCm, 35, 45, scale, offset);
    expect(box.topFace.length).toBe(4);
    expect(box.sideFaces.length).toBeGreaterThan(0);
    expect(box.shadowFace).toBeDefined();

    const pathStr = pointsToSvgPath(box.topFace);
    expect(pathStr.startsWith('M ')).toBe(true);
    expect(pathStr.endsWith(' Z')).toBe(true);
  });

  test('3D Model Config Registry covers all 22 types from Stage 0 table', () => {
    const allTypes = Object.keys(MODEL_3D_CONFIGS);
    expect(allTypes.length).toBe(22);

    expect(getModel3DConfig('HOUSE').heightCm).toBe(530);
    expect(getModel3DConfig('TREE').heightCm).toBe(380);
    expect(getModel3DConfig('SHED').heightCm).toBe(230);
    expect(getModel3DConfig('PATH').heightCm).toBe(4);
    expect(getModel3DConfig('WELL').primitive).toBe('compound');
  });

  test('Store viewMode and camera presets switch without marking plan dirty', () => {
    const store = useGardenPlannerStore.getState();
    const initialDirtyCount = store.dirtyIds.length;
    const initialSaveStatus = store.saveStatus;

    // Switch view mode
    store.setViewMode('2.5D');
    expect(useGardenPlannerStore.getState().viewMode).toBe('2.5D');

    // Apply presets
    store.applyCameraPreset('isometric');
    expect(useGardenPlannerStore.getState().camera3D.yawDeg).toBe(45);
    expect(useGardenPlannerStore.getState().camera3D.pitchDeg).toBeCloseTo(35.264);

    store.applyCameraPreset('top');
    expect(useGardenPlannerStore.getState().camera3D.pitchDeg).toBe(85);

    store.applyCameraPreset('ground');
    expect(useGardenPlannerStore.getState().camera3D.pitchDeg).toBe(6);

    // Reset view (resets North up: yawDeg = 0, target: 0, 0)
    store.resetCamera3D();
    expect(useGardenPlannerStore.getState().camera3D.yawDeg).toBe(0);
    expect(useGardenPlannerStore.getState().camera3D.targetX).toBe(0);
    expect(useGardenPlannerStore.getState().camera3D.targetY).toBe(0);

    // Verify plan is NOT marked as dirty and autosave is untouched
    expect(useGardenPlannerStore.getState().dirtyIds.length).toBe(initialDirtyCount);
    expect(useGardenPlannerStore.getState().saveStatus).toBe(initialSaveStatus);

    // Restore to 2D
    store.setViewMode('2D');
    expect(useGardenPlannerStore.getState().viewMode).toBe('2D');
  });
});
