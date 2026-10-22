import { create } from 'zustand';
import type {
  GardenPlanDetailsDto,
  GardenPlanDto,
  PlanObjectDto,
  PlanObjectLayer,
  PlanObjectType,
} from '@smart-garden/types';
import { PLAN_OBJECT_PRESETS } from '@smart-garden/types';
import {
  checkObjectsOverlap,
  computeLineBoundingBox,
  getEffectiveBoundary,
  getEffectiveLinePoints,
  snapValueToGrid,
  type SnapGuide,
} from '@smart-garden/validation';
import type {
  Camera3DState,
  CameraPreset,
  CanvasPlanObject,
  CustomGuideline,
  GridSettings,
  LineDrawingState,
  PinnedMeasurementPin,
  PlannerSettings,
  PlannerTool,
  PlannerViewMode,
  PlanSnapshot,
  SaveStatus,
  ViewTransform,
} from '../types';

export interface GardenPlannerState {
  gardenId: string;
  gardenName: string;
  plans: GardenPlanDto[];
  plan: {
    id: string;
    name: string;
    widthCm: number;
    heightCm: number;
    boundary: Array<{ xCm: number; yCm: number }> | null;
    northAngleDeg: number;
    gridSizeCm: number;
    version: number;
    isActive: boolean;
  };
  objects: Record<string, CanvasPlanObject>;
  objectIds: string[];
  dirtyIds: string[];
  selectedIds: string[];
  hoveredId: string | null;
  view: ViewTransform;
  grid: GridSettings;
  settings: PlannerSettings;
  layersVisibility: Record<PlanObjectLayer, boolean>;
  layersLocked: Record<PlanObjectLayer, boolean>;
  activeTool: PlannerTool;
  selectedPresetForPlacement: PlanObjectType | null;
  selectedBoundaryVertexIdx: number | null;
  lineDrawingState: LineDrawingState | null;
  selectedLineVertex: { objectId: string; vertexIdx: number } | null;
  isDragging: boolean;
  activeGuides: SnapGuide[];
  customGuidelines: CustomGuideline[];
  measurePoints: Array<{ xCm: number; yCm: number }>;
  pinnedMeasurements: PinnedMeasurementPin[];
  areaPoints: Array<{ xCm: number; yCm: number }>;
  saveStatus: SaveStatus;
  lastError: string | null;
  isMultiSelectMode: boolean;
  history: { past: PlanSnapshot[]; future: PlanSnapshot[] };
  viewMode: PlannerViewMode;
  camera3D: Camera3DState;

  // Actions
  setViewMode: (mode: PlannerViewMode) => void;
  setCamera3D: (patch: Partial<Camera3DState>) => void;
  applyCameraPreset: (preset: CameraPreset) => void;
  resetCamera3D: () => void;
  toggleMultiSelect: () => void;
  hydrate: (planDetails: GardenPlanDetailsDto, allPlans: GardenPlanDto[], gardenName?: string) => void;
  select: (ids: string | string[], additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setView: (patch: Partial<ViewTransform>) => void;
  zoomBy: (factor: number, centerPoint?: { x: number; y: number }) => void;
  zoomToFit: (viewportWidth: number, viewportHeight: number) => void;
  resetView: () => void;
  setTool: (tool: PlannerTool) => void;
  setPlacementPreset: (type: PlanObjectType | null) => void;
  setSelectedBoundaryVertexIdx: (idx: number | null) => void;
  updateBoundary: (boundary: Array<{ xCm: number; yCm: number }>) => void;
  moveBoundaryVertex: (index: number, pos: { xCm: number; yCm: number }, commit?: boolean) => void;
  insertBoundaryVertex: (edgeIndex: number, pos: { xCm: number; yCm: number }) => void;
  deleteBoundaryVertex: (index: number) => void;
  resetBoundaryToRectangle: () => void;

  // LinePath actions
  startDrawingLine: (type: 'PATH' | 'FENCE', isCurved?: boolean) => void;
  addDrawingLinePoint: (posCm: { xCm: number; yCm: number }) => void;
  finishDrawingLine: () => void;
  cancelDrawingLine: () => void;
  setSelectedLineVertex: (val: { objectId: string; vertexIdx: number } | null) => void;
  moveLineObjectVertex: (objectId: string, vertexIdx: number, point: { xCm: number; yCm: number }, commit?: boolean) => void;
  insertLineObjectVertex: (objectId: string, edgeIdx: number, point: { xCm: number; yCm: number }) => void;
  deleteLineObjectVertex: (objectId: string, vertexIdx: number) => void;

  // Settings & toggles
  setGridStep: (stepCm: 5 | 10 | 50 | 100) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleRulers: () => void;
  setMeasurementUnit: (unit: 'm' | 'cm' | 'ft') => void;
  setMeasurementPrecision: (precision: 0.01 | 0.1 | 1) => void;
  toggleSlowDrag: () => void;
  toggleCheckRules: () => void;
  toggleLayerVisibility: (layer: PlanObjectLayer) => void;
  toggleLayerLock: (layer: PlanObjectLayer) => void;
  setNorthAngle: (deg: number) => void;
  updatePlanDimensions: (widthCm: number, heightCm: number) => void;
  updatePlanName: (name: string) => void;

  // Object manipulations
  addObjectFromPreset: (type: PlanObjectType, posCm?: { xCm: number; yCm: number }) => string;
  updateObjectFields: (id: string, patch: Partial<CanvasPlanObject>) => void;
  commitObjectTransform: (
    id: string,
    transform: {
      xCm?: number;
      yCm?: number;
      widthCm?: number;
      heightCm?: number;
      rotationDeg?: number;
    },
  ) => void;
  moveSelected: (dxCm: number, dyCm: number) => void;
  duplicateSelected: () => void;
  duplicateWithOffset: (dxCm: number, dyCm: number) => void;
  createArray: (count: number, stepXCm: number, stepYCm: number) => void;
  alignSelected: (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y') => void;
  distributeSelected: (axis: 'horizontal' | 'vertical') => void;
  deleteSelected: () => void;
  toggleLockSelected: () => void;
  bringForwardSelected: () => void;
  sendBackwardSelected: () => void;

  // Custom Guidelines & Measurements
  addCustomGuideline: (type: 'vertical' | 'horizontal', posCm: number) => void;
  removeCustomGuideline: (id: string) => void;
  addMeasurePoint: (pt: { xCm: number; yCm: number }) => void;
  clearMeasurePoints: () => void;
  saveMeasurePin: (label?: string) => void;
  removeMeasurePin: (id: string) => void;
  addAreaPoint: (pt: { xCm: number; yCm: number }) => void;
  clearAreaPoints: () => void;

  setIsDragging: (val: boolean) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
  computeCollisions: () => void;

  // History & Save
  undo: () => void;
  redo: () => void;
  markDirty: (dirtyId?: string) => void;
  setSaveStatus: (status: SaveStatus, error?: string | null) => void;
  applyIdMap: (idMap: Record<string, string>, newVersion: number) => void;
  getActiveObjects: () => CanvasPlanObject[];
}

function toCanvasObject(dto: PlanObjectDto): CanvasPlanObject | null {
  if (!dto || typeof dto !== 'object' || !dto.id) {
    return null;
  }

  const xCm = Number.isFinite(dto.xCm) ? Math.round(dto.xCm) : 0;
  const yCm = Number.isFinite(dto.yCm) ? Math.round(dto.yCm) : 0;
  const widthCm = Number.isFinite(dto.widthCm) && dto.widthCm >= 10 ? Math.round(dto.widthCm) : 100;
  const heightCm = Number.isFinite(dto.heightCm) && dto.heightCm >= 10 ? Math.round(dto.heightCm) : 100;
  const rotationDeg = Number.isFinite(dto.rotationDeg)
    ? Math.round(((dto.rotationDeg % 360) + 360) % 360)
    : 0;

  return {
    id: String(dto.id),
    type: dto.type || 'CUSTOM',
    label: dto.label || '',
    xCm,
    yCm,
    widthCm,
    heightCm,
    rotationDeg,
    zIndex: Number.isFinite(dto.zIndex) ? dto.zIndex : 0,
    layer: dto.layer || 'OTHER',
    color: dto.color || null,
    locked: Boolean(dto.locked),
    meta: dto.meta && typeof dto.meta === 'object' ? dto.meta : null,
    zoneId: dto.zoneId || null,
    plantId: dto.plantId || null,
  };
}

function pushSnapshot(state: GardenPlannerState): { past: PlanSnapshot[]; future: PlanSnapshot[] } {
  const currentSnapshot: PlanSnapshot = {
    objects: { ...state.objects },
    plan: {
      name: state.plan.name,
      widthCm: state.plan.widthCm,
      heightCm: state.plan.heightCm,
      boundary: state.plan.boundary ? [...state.plan.boundary] : null,
      northAngleDeg: state.plan.northAngleDeg,
      gridSizeCm: state.plan.gridSizeCm,
    },
  };
  const past = [...state.history.past, currentSnapshot].slice(-50);
  return { past, future: [] };
}

export const useGardenPlannerStore = create<GardenPlannerState>((set, get) => ({
  gardenId: '',
  gardenName: 'Мій сад',
  plans: [],
  plan: {
    id: '',
    name: 'Основний план',
    widthCm: 2000,
    heightCm: 1500,
    boundary: null,
    northAngleDeg: 0,
    gridSizeCm: 50,
    version: 1,
    isActive: true,
  },
  objects: {},
  objectIds: [],
  dirtyIds: [],
  selectedIds: [],
  hoveredId: null,
  view: { scale: 0.25, offsetX: 20, offsetY: 20 },
  grid: { enabled: true, stepCm: 10, snap: true },
  settings: {
    showCollisions: true,
    showRulers: true,
    objectSnap: true,
    lockAspectRatio: false,
    rotationSnap15: true,
    measurementUnit: 'm',
    measurementPrecision: 0.01,
    slowDrag: false,
    checkRules: true,
  },
  layersVisibility: {
    BUILDINGS: true,
    UTILITIES: true,
    PLANTS: true,
    PATHS: true,
    OTHER: true,
  },
  layersLocked: {
    BUILDINGS: false,
    UTILITIES: false,
    PLANTS: false,
    PATHS: false,
    OTHER: false,
  },
  activeTool: 'select',
  selectedPresetForPlacement: null,
  selectedBoundaryVertexIdx: null,
  lineDrawingState: null,
  selectedLineVertex: null,
  isDragging: false,
  activeGuides: [],
  customGuidelines: [],
  measurePoints: [],
  pinnedMeasurements: [],
  areaPoints: [],
  saveStatus: 'idle',
  lastError: null,
  isMultiSelectMode: false,
  history: { past: [], future: [] },
  viewMode: '2D',
  camera3D: {
    yawDeg: 0,
    pitchDeg: 45,
    distance: 1.0,
    targetX: 0,
    targetY: 0,
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setCamera3D: (patch) => {
    set((s) => ({
      camera3D: {
        ...s.camera3D,
        ...patch,
      },
    }));
  },

  applyCameraPreset: (preset) => {
    set((s) => {
      let yaw = s.camera3D.yawDeg;
      let pitch = s.camera3D.pitchDeg;
      switch (preset) {
        case 'top':
          yaw = 0;
          pitch = 85;
          break;
        case 'isometric':
          yaw = 45;
          pitch = 35.264;
          break;
        case 'perspective':
          yaw = 0;
          pitch = 45;
          break;
        case 'ground':
          yaw = s.camera3D.yawDeg;
          pitch = 6;
          break;
        case 'north':
          yaw = 0;
          pitch = 15;
          break;
        case 'east':
          yaw = 90;
          pitch = 15;
          break;
        case 'south':
          yaw = 180;
          pitch = 15;
          break;
        case 'west':
          yaw = 270;
          pitch = 15;
          break;
      }
      return {
        camera3D: {
          ...s.camera3D,
          yawDeg: yaw,
          pitchDeg: pitch,
        },
      };
    });
  },

  resetCamera3D: () => {
    set({
      camera3D: {
        yawDeg: 0,
        pitchDeg: 45,
        distance: 1.0,
        targetX: 0,
        targetY: 0,
      },
    });
  },

  toggleMultiSelect: () => {
    set((s) => ({ isMultiSelectMode: !s.isMultiSelectMode }));
  },

  hydrate: (planDetails, allPlans, gardenName) => {
    const objectsMap: Record<string, CanvasPlanObject> = {};
    const ids: string[] = [];

    const sortedObjects = [...(planDetails.objects ?? [])].sort(
      (a, b) => a.zIndex - b.zIndex,
    );
    for (const obj of sortedObjects) {
      const parsed = toCanvasObject(obj);
      if (parsed) {
        objectsMap[parsed.id] = parsed;
        ids.push(parsed.id);
      }
    }

    set({
      gardenId: planDetails.gardenId,
      gardenName: gardenName || 'Мій сад',
      plans: allPlans,
      plan: {
        id: planDetails.id,
        name: planDetails.name,
        widthCm: planDetails.widthCm,
        heightCm: planDetails.heightCm,
        boundary: planDetails.boundary,
        northAngleDeg: planDetails.northAngleDeg,
        gridSizeCm: planDetails.gridSizeCm,
        version: planDetails.version,
        isActive: planDetails.isActive,
      },
      objects: objectsMap,
      objectIds: ids,
      dirtyIds: [],
      selectedIds: [],
      hoveredId: null,
      activeTool: 'select',
      selectedBoundaryVertexIdx: null,
      selectedLineVertex: null,
      lineDrawingState: null,
      activeGuides: [],
      saveStatus: 'idle',
      lastError: null,
      history: { past: [], future: [] },
    });
  },

  select: (ids, additive = false) => {
    set((state) => {
      const incoming = Array.isArray(ids) ? ids : [ids];
      if (additive) {
        const next = new Set(state.selectedIds);
        for (const id of incoming) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        }
        return { selectedIds: Array.from(next) };
      }
      return { selectedIds: incoming };
    });
  },

  clearSelection: () => {
    set({ selectedIds: [], selectedBoundaryVertexIdx: null, selectedLineVertex: null });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: state.objectIds.filter((id) => {
        const o = state.objects[id];
        return o && !o.deleted && !state.layersLocked[o.layer];
      }),
    }));
  },

  setView: (patch) => {
    set((state) => ({ view: { ...state.view, ...patch } }));
  },

  zoomBy: (factor, centerPoint) => {
    set((state) => {
      const currentScale = state.view.scale;
      const newScale = Math.max(0.05, Math.min(6.0, currentScale * factor));
      if (newScale === currentScale) return state;

      if (!centerPoint) {
        return { view: { ...state.view, scale: newScale } };
      }

      // Keep center point stable during pinch/zoom
      const worldX = (centerPoint.x - state.view.offsetX) / currentScale;
      const worldY = (centerPoint.y - state.view.offsetY) / currentScale;

      const newOffsetX = centerPoint.x - worldX * newScale;
      const newOffsetY = centerPoint.y - worldY * newScale;

      return {
        view: { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY },
      };
    });
  },

  zoomToFit: (viewportWidth, viewportHeight) => {
    set((state) => {
      const padding = 16;
      const availW = Math.max(100, viewportWidth - padding * 2);
      const availH = Math.max(100, viewportHeight - padding * 2);
      const planW = Math.max(100, state.plan?.widthCm || 2000);
      const planH = Math.max(100, state.plan?.heightCm || 1500);
      const scaleX = availW / planW;
      const scaleY = availH / planH;
      const rawScale = Math.min(scaleX, scaleY);
      const scale = Number.isFinite(rawScale) ? Math.max(0.05, Math.min(6.0, rawScale)) : 0.25;
      const offsetX = (viewportWidth - planW * scale) / 2;
      const offsetY = (viewportHeight - planH * scale) / 2;
      return {
        view: {
          scale,
          offsetX: Number.isFinite(offsetX) ? offsetX : 20,
          offsetY: Number.isFinite(offsetY) ? offsetY : 20,
        },
      };
    });
  },

  resetView: () => {
    set({
      view: {
        scale: 0.25,
        offsetX: 20,
        offsetY: 20,
      },
    });
  },

  setTool: (tool) => {
    set({
      activeTool: tool,
      lineDrawingState: null,
      selectedBoundaryVertexIdx: null,
      selectedLineVertex: null,
    });
  },

  setPlacementPreset: (type) => {
    set({ selectedPresetForPlacement: type });
  },

  setSelectedBoundaryVertexIdx: (idx) => {
    set({ selectedBoundaryVertexIdx: idx });
  },

  updateBoundary: (boundary) => {
    set((state) => {
      const hist = pushSnapshot(state);
      return {
        plan: { ...state.plan, boundary },
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  moveBoundaryVertex: (index, pos, commit = true) => {
    set((state) => {
      const current = getEffectiveBoundary(state.plan);
      if (index < 0 || index >= current.length) return state;

      const next = current.map((p, i) => (i === index ? pos : p));
      const hist = commit ? pushSnapshot(state) : state.history;

      return {
        plan: { ...state.plan, boundary: next },
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  insertBoundaryVertex: (edgeIndex, pos) => {
    set((state) => {
      const current = getEffectiveBoundary(state.plan);
      const hist = pushSnapshot(state);
      const next = [...current];
      next.splice(edgeIndex + 1, 0, pos);
      return {
        plan: { ...state.plan, boundary: next },
        selectedBoundaryVertexIdx: edgeIndex + 1,
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  deleteBoundaryVertex: (index) => {
    set((state) => {
      const current = getEffectiveBoundary(state.plan);
      if (current.length <= 3) return state; // Minimum 3 points required

      const hist = pushSnapshot(state);
      const next = current.filter((_, i) => i !== index);
      return {
        plan: { ...state.plan, boundary: next },
        selectedBoundaryVertexIdx: null,
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  resetBoundaryToRectangle: () => {
    set((state) => {
      const hist = pushSnapshot(state);
      return {
        plan: { ...state.plan, boundary: null },
        selectedBoundaryVertexIdx: null,
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  startDrawingLine: (type, isCurved = false) => {
    set({
      activeTool: 'draw-line',
      lineDrawingState: { type, points: [], isCurved },
      selectedIds: [],
    });
  },

  addDrawingLinePoint: (posCm) => {
    set((state) => {
      if (!state.lineDrawingState) return state;
      const points = [...state.lineDrawingState.points, posCm];
      return {
        lineDrawingState: { ...state.lineDrawingState, points },
      };
    });
  },

  finishDrawingLine: () => {
    const state = get();
    if (!state.lineDrawingState || state.lineDrawingState.points.length < 2) {
      set({ lineDrawingState: null, activeTool: 'select' });
      return;
    }

    const { type, points, isCurved } = state.lineDrawingState;
    const preset = PLAN_OBJECT_PRESETS[type] ?? PLAN_OBJECT_PRESETS.PATH;
    const bbox = computeLineBoundingBox(points, 60);

    const newId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const maxZ = Math.max(0, ...Object.values(state.objects).map((o) => o.zIndex));

    const newObj: CanvasPlanObject = {
      id: newId,
      clientId: newId,
      isNew: true,
      type,
      label: preset.label,
      xCm: bbox.xCm,
      yCm: bbox.yCm,
      widthCm: bbox.widthCm,
      heightCm: bbox.heightCm,
      rotationDeg: 0,
      zIndex: maxZ + 1,
      layer: preset.layer,
      color: preset.defaultColor,
      locked: false,
      meta: {
        linePoints: points,
        isCurved,
        strokeWidthCm: 60,
      },
      zoneId: null,
      plantId: null,
    };

    const hist = pushSnapshot(state);

    set((s) => ({
      objects: { ...s.objects, [newId]: newObj },
      objectIds: [...s.objectIds, newId],
      dirtyIds: Array.from(new Set([...s.dirtyIds, newId])),
      selectedIds: [newId],
      lineDrawingState: null,
      activeTool: 'select',
      history: hist,
      saveStatus: 'dirty',
    }));
  },

  cancelDrawingLine: () => {
    set({ lineDrawingState: null, activeTool: 'select' });
  },

  setSelectedLineVertex: (val) => {
    set({ selectedLineVertex: val });
  },

  moveLineObjectVertex: (objectId, vertexIdx, point, commit = true) => {
    set((state) => {
      const obj = state.objects[objectId];
      if (!obj) return state;

      const points = getEffectiveLinePoints(obj);
      if (vertexIdx < 0 || vertexIdx >= points.length) return state;

      const nextPoints = points.map((p, i) => (i === vertexIdx ? point : p));
      const bbox = computeLineBoundingBox(nextPoints);

      const updated: CanvasPlanObject = {
        ...obj,
        xCm: bbox.xCm,
        yCm: bbox.yCm,
        widthCm: bbox.widthCm,
        heightCm: bbox.heightCm,
        meta: { ...obj.meta, linePoints: nextPoints },
      };

      const hist = commit ? pushSnapshot(state) : state.history;

      return {
        objects: { ...state.objects, [objectId]: updated },
        dirtyIds: Array.from(new Set([...state.dirtyIds, objectId])),
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  insertLineObjectVertex: (objectId, edgeIdx, point) => {
    set((state) => {
      const obj = state.objects[objectId];
      if (!obj) return state;

      const points = getEffectiveLinePoints(obj);
      const nextPoints = [...points];
      nextPoints.splice(edgeIdx + 1, 0, point);
      const bbox = computeLineBoundingBox(nextPoints);

      const updated: CanvasPlanObject = {
        ...obj,
        xCm: bbox.xCm,
        yCm: bbox.yCm,
        widthCm: bbox.widthCm,
        heightCm: bbox.heightCm,
        meta: { ...obj.meta, linePoints: nextPoints },
      };

      const hist = pushSnapshot(state);

      return {
        objects: { ...state.objects, [objectId]: updated },
        dirtyIds: Array.from(new Set([...state.dirtyIds, objectId])),
        selectedLineVertex: { objectId, vertexIdx: edgeIdx + 1 },
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  deleteLineObjectVertex: (objectId, vertexIdx) => {
    set((state) => {
      const obj = state.objects[objectId];
      if (!obj) return state;

      const points = getEffectiveLinePoints(obj);
      if (points.length <= 2) return state; // At least 2 points needed

      const nextPoints = points.filter((_, i) => i !== vertexIdx);
      const bbox = computeLineBoundingBox(nextPoints);

      const updated: CanvasPlanObject = {
        ...obj,
        xCm: bbox.xCm,
        yCm: bbox.yCm,
        widthCm: bbox.widthCm,
        heightCm: bbox.heightCm,
        meta: { ...obj.meta, linePoints: nextPoints },
      };

      const hist = pushSnapshot(state);

      return {
        objects: { ...state.objects, [objectId]: updated },
        dirtyIds: Array.from(new Set([...state.dirtyIds, objectId])),
        selectedLineVertex: null,
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  setGridStep: (stepCm) => {
    set((state) => ({ grid: { ...state.grid, stepCm } }));
  },

  toggleGrid: () => {
    set((state) => ({ grid: { ...state.grid, enabled: !state.grid.enabled } }));
  },

  toggleSnap: () => {
    set((state) => ({ grid: { ...state.grid, snap: !state.grid.snap } }));
  },

  toggleRulers: () => {
    set((state) => ({
      settings: { ...state.settings, showRulers: !state.settings.showRulers },
    }));
  },

  setMeasurementUnit: (measurementUnit) => {
    set((state) => ({
      settings: { ...state.settings, measurementUnit },
    }));
  },

  setMeasurementPrecision: (measurementPrecision) => {
    set((state) => ({
      settings: { ...state.settings, measurementPrecision },
    }));
  },

  toggleSlowDrag: () => {
    set((state) => ({
      settings: { ...state.settings, slowDrag: !state.settings.slowDrag },
    }));
  },

  toggleCheckRules: () => {
    set((state) => ({
      settings: { ...state.settings, checkRules: !state.settings.checkRules },
    }));
  },

  toggleLayerVisibility: (layer) => {
    set((state) => ({
      layersVisibility: {
        ...state.layersVisibility,
        [layer]: !state.layersVisibility[layer],
      },
    }));
  },

  toggleLayerLock: (layer) => {
    set((state) => ({
      layersLocked: {
        ...state.layersLocked,
        [layer]: !state.layersLocked[layer],
      },
    }));
  },

  setNorthAngle: (deg) => {
    set((state) => {
      const hist = pushSnapshot(state);
      return {
        plan: { ...state.plan, northAngleDeg: deg },
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  updatePlanDimensions: (widthCm, heightCm) => {
    set((state) => {
      const hist = pushSnapshot(state);
      return {
        plan: { ...state.plan, widthCm, heightCm },
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  updatePlanName: (name) => {
    set((state) => {
      const hist = pushSnapshot(state);
      return {
        plan: { ...state.plan, name },
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  addObjectFromPreset: (type, posCm) => {
    const state = get();
    if (state.objectIds.length >= 500) {
      set({ lastError: 'Досягнуто ліміт максимальної кількості обʼєктів на плані (500)' });
      return '';
    }
    const preset = PLAN_OBJECT_PRESETS[type] ?? PLAN_OBJECT_PRESETS.CUSTOM;
    const newId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const maxZ = Math.max(0, ...Object.values(state.objects).map((o) => o.zIndex));

    let xCm = posCm?.xCm ?? Math.round((state.plan.widthCm - preset.defaultWidthCm) / 2);
    let yCm = posCm?.yCm ?? Math.round((state.plan.heightCm - preset.defaultHeightCm) / 2);

    if (state.grid.snap) {
      xCm = snapValueToGrid(xCm, state.grid.stepCm);
      yCm = snapValueToGrid(yCm, state.grid.stepCm);
    }

    const newObj: CanvasPlanObject = {
      id: newId,
      clientId: newId,
      isNew: true,
      type,
      label: preset.label,
      xCm,
      yCm,
      widthCm: preset.defaultWidthCm,
      heightCm: preset.defaultHeightCm,
      rotationDeg: 0,
      zIndex: maxZ + 1,
      layer: preset.layer,
      color: preset.defaultColor,
      locked: false,
      meta: null,
      zoneId: null,
      plantId: null,
    };

    const hist = pushSnapshot(state);

    set((s) => ({
      objects: { ...s.objects, [newId]: newObj },
      objectIds: [...s.objectIds, newId],
      dirtyIds: Array.from(new Set([...s.dirtyIds, newId])),
      selectedIds: [newId],
      history: hist,
      saveStatus: 'dirty',
    }));

    get().computeCollisions();
    return newId;
  },

  updateObjectFields: (id, patch) => {
    set((state) => {
      const obj = state.objects[id];
      if (!obj) return state;

      const hist = pushSnapshot(state);
      const updated: CanvasPlanObject = { ...obj, ...patch };

      return {
        objects: { ...state.objects, [id]: updated },
        dirtyIds: Array.from(new Set([...state.dirtyIds, id])),
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  commitObjectTransform: (id, transform) => {
    set((state) => {
      const obj = state.objects[id];
      if (!obj || obj.locked) return state;

      const hist = pushSnapshot(state);
      const safeWidth =
        transform.widthCm !== undefined
          ? Math.max(10, Math.round(transform.widthCm))
          : obj.widthCm;
      const safeHeight =
        transform.heightCm !== undefined
          ? Math.max(10, Math.round(transform.heightCm))
          : obj.heightCm;
      const safeX =
        transform.xCm !== undefined && Number.isFinite(transform.xCm)
          ? Math.round(transform.xCm)
          : obj.xCm;
      const safeY =
        transform.yCm !== undefined && Number.isFinite(transform.yCm)
          ? Math.round(transform.yCm)
          : obj.yCm;
      const safeRot =
        transform.rotationDeg !== undefined
          ? Math.round(((transform.rotationDeg % 360) + 360) % 360)
          : obj.rotationDeg;

      const updated: CanvasPlanObject = {
        ...obj,
        ...transform,
        xCm: safeX,
        yCm: safeY,
        widthCm: safeWidth,
        heightCm: safeHeight,
        rotationDeg: safeRot,
      };

      return {
        objects: { ...state.objects, [id]: updated },
        dirtyIds: Array.from(new Set([...state.dirtyIds, id])),
        history: hist,
        saveStatus: 'dirty',
        activeGuides: [],
      };
    });
    get().computeCollisions();
  },

  moveSelected: (dxCm, dyCm) => {
    set((state) => {
      if (!state.selectedIds.length) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextDirty = new Set(state.dirtyIds);

      for (const id of state.selectedIds) {
        const obj = nextObjects[id];
        if (!obj || obj.locked) continue;

        let newX = obj.xCm + dxCm;
        let newY = obj.yCm + dyCm;

        if (state.grid.snap) {
          newX = snapValueToGrid(newX, state.grid.stepCm);
          newY = snapValueToGrid(newY, state.grid.stepCm);
        }

        // If line object, move its line points as well
        let newMeta = obj.meta;
        if (obj.meta?.linePoints && Array.isArray(obj.meta.linePoints)) {
          const shiftX = newX - obj.xCm;
          const shiftY = newY - obj.yCm;
          const updatedPoints = (obj.meta.linePoints as Array<{ xCm: number; yCm: number }>).map(
            (p) => ({ xCm: p.xCm + shiftX, yCm: p.yCm + shiftY }),
          );
          newMeta = { ...obj.meta, linePoints: updatedPoints };
        }

        nextObjects[id] = {
          ...obj,
          xCm: newX,
          yCm: newY,
          meta: newMeta,
        };
        nextDirty.add(id);
      }

      return {
        objects: nextObjects,
        dirtyIds: Array.from(nextDirty),
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  duplicateSelected: () => {
    set((state) => {
      if (!state.selectedIds.length) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextObjectIds = [...state.objectIds];
      const nextDirty = new Set(state.dirtyIds);
      const newSelected: string[] = [];

      let maxZ = Math.max(0, ...Object.values(state.objects).map((o) => o.zIndex));

      for (const id of state.selectedIds) {
        const obj = nextObjects[id];
        if (!obj || obj.deleted) continue;

        maxZ += 1;
        const newId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const offset = 50;

        const duplicatedMeta = obj.meta ? JSON.parse(JSON.stringify(obj.meta)) : null;
        if (duplicatedMeta?.linePoints && Array.isArray(duplicatedMeta.linePoints)) {
          duplicatedMeta.linePoints = duplicatedMeta.linePoints.map(
            (p: { xCm: number; yCm: number }) => ({
              xCm: p.xCm + offset,
              yCm: p.yCm + offset,
            }),
          );
        }

        const clone: CanvasPlanObject = {
          ...obj,
          id: newId,
          clientId: newId,
          isNew: true,
          label: `${obj.label} (копія)`,
          xCm: obj.xCm + offset,
          yCm: obj.yCm + offset,
          zIndex: maxZ,
          meta: duplicatedMeta,
        };

        nextObjects[newId] = clone;
        nextObjectIds.push(newId);
        nextDirty.add(newId);
        newSelected.push(newId);
      }

      return {
        objects: nextObjects,
        objectIds: nextObjectIds,
        dirtyIds: Array.from(nextDirty),
        selectedIds: newSelected,
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  duplicateWithOffset: (dxCm, dyCm) => {
    set((state) => {
      if (!state.selectedIds.length) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextObjectIds = [...state.objectIds];
      const nextDirty = new Set(state.dirtyIds);
      const newSelected: string[] = [];

      let maxZ = Math.max(0, ...Object.values(state.objects).map((o) => o.zIndex));

      for (const id of state.selectedIds) {
        const obj = nextObjects[id];
        if (!obj || obj.deleted) continue;

        maxZ += 1;
        const newId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const duplicatedMeta = obj.meta ? JSON.parse(JSON.stringify(obj.meta)) : null;

        const clone: CanvasPlanObject = {
          ...obj,
          id: newId,
          clientId: newId,
          isNew: true,
          label: `${obj.label} (копія)`,
          xCm: Math.round(obj.xCm + dxCm),
          yCm: Math.round(obj.yCm + dyCm),
          zIndex: maxZ,
          meta: duplicatedMeta,
        };

        nextObjects[newId] = clone;
        nextObjectIds.push(newId);
        nextDirty.add(newId);
        newSelected.push(newId);
      }

      return {
        objects: nextObjects,
        objectIds: nextObjectIds,
        dirtyIds: Array.from(nextDirty),
        selectedIds: newSelected,
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  createArray: (count, stepXCm, stepYCm) => {
    set((state) => {
      if (state.selectedIds.length !== 1 || count < 1) return state;
      const primaryId = state.selectedIds[0]!;
      const obj = state.objects[primaryId];
      if (!obj || obj.deleted) return state;

      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextObjectIds = [...state.objectIds];
      const nextDirty = new Set(state.dirtyIds);
      const newSelected: string[] = [primaryId];

      let maxZ = Math.max(0, ...Object.values(state.objects).map((o) => o.zIndex));

      for (let i = 1; i <= count; i++) {
        maxZ += 1;
        const newId = `tmp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
        const duplicatedMeta = obj.meta ? JSON.parse(JSON.stringify(obj.meta)) : null;

        const clone: CanvasPlanObject = {
          ...obj,
          id: newId,
          clientId: newId,
          isNew: true,
          label: `${obj.label} #${i + 1}`,
          xCm: Math.round(obj.xCm + stepXCm * i),
          yCm: Math.round(obj.yCm + stepYCm * i),
          zIndex: maxZ,
          meta: duplicatedMeta,
        };

        nextObjects[newId] = clone;
        nextObjectIds.push(newId);
        nextDirty.add(newId);
        newSelected.push(newId);
      }

      return {
        objects: nextObjects,
        objectIds: nextObjectIds,
        dirtyIds: Array.from(nextDirty),
        selectedIds: newSelected,
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  alignSelected: (alignment) => {
    set((state) => {
      if (state.selectedIds.length < 2) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextDirty = new Set(state.dirtyIds);

      const validObjs = state.selectedIds
        .map((id) => nextObjects[id])
        .filter((o): o is CanvasPlanObject => Boolean(o && !o.locked));
      if (validObjs.length < 2) return state;

      let targetVal = 0;
      if (alignment === 'left') {
        targetVal = Math.min(...validObjs.map((o) => o.xCm));
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, xCm: targetVal };
          nextDirty.add(obj.id);
        }
      } else if (alignment === 'right') {
        targetVal = Math.max(...validObjs.map((o) => o.xCm + o.widthCm));
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, xCm: targetVal - obj.widthCm };
          nextDirty.add(obj.id);
        }
      } else if (alignment === 'top') {
        targetVal = Math.min(...validObjs.map((o) => o.yCm));
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, yCm: targetVal };
          nextDirty.add(obj.id);
        }
      } else if (alignment === 'bottom') {
        targetVal = Math.max(...validObjs.map((o) => o.yCm + o.heightCm));
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, yCm: targetVal - obj.heightCm };
          nextDirty.add(obj.id);
        }
      } else if (alignment === 'center-x') {
        const minX = Math.min(...validObjs.map((o) => o.xCm));
        const maxX = Math.max(...validObjs.map((o) => o.xCm + o.widthCm));
        const targetMidX = (minX + maxX) / 2;
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, xCm: Math.round(targetMidX - obj.widthCm / 2) };
          nextDirty.add(obj.id);
        }
      } else if (alignment === 'center-y') {
        const minY = Math.min(...validObjs.map((o) => o.yCm));
        const maxY = Math.max(...validObjs.map((o) => o.yCm + o.heightCm));
        const targetMidY = (minY + maxY) / 2;
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, yCm: Math.round(targetMidY - obj.heightCm / 2) };
          nextDirty.add(obj.id);
        }
      }

      return {
        objects: nextObjects,
        dirtyIds: Array.from(nextDirty),
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  distributeSelected: (axis) => {
    set((state) => {
      if (state.selectedIds.length < 3) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextDirty = new Set(state.dirtyIds);

      const validObjs = state.selectedIds
        .map((id) => nextObjects[id])
        .filter((o): o is CanvasPlanObject => Boolean(o && !o.locked));
      if (validObjs.length < 3) return state;

      if (axis === 'horizontal') {
        validObjs.sort((a, b) => a.xCm - b.xCm);
        const first = validObjs[0]!;
        const last = validObjs[validObjs.length - 1]!;
        const totalSpan = last.xCm + last.widthCm - first.xCm;
        const totalWidths = validObjs.reduce((acc, o) => acc + o.widthCm, 0);
        const gap = Math.max(0, (totalSpan - totalWidths) / (validObjs.length - 1));

        let currentX = first.xCm;
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, xCm: Math.round(currentX) };
          nextDirty.add(obj.id);
          currentX += obj.widthCm + gap;
        }
      } else {
        validObjs.sort((a, b) => a.yCm - b.yCm);
        const first = validObjs[0]!;
        const last = validObjs[validObjs.length - 1]!;
        const totalSpan = last.yCm + last.heightCm - first.yCm;
        const totalHeights = validObjs.reduce((acc, o) => acc + o.heightCm, 0);
        const gap = Math.max(0, (totalSpan - totalHeights) / (validObjs.length - 1));

        let currentY = first.yCm;
        for (const obj of validObjs) {
          nextObjects[obj.id] = { ...obj, yCm: Math.round(currentY) };
          nextDirty.add(obj.id);
          currentY += obj.heightCm + gap;
        }
      }

      return {
        objects: nextObjects,
        dirtyIds: Array.from(nextDirty),
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  addCustomGuideline: (type, posCm) => {
    set((state) => ({
      customGuidelines: [
        ...state.customGuidelines,
        { id: `guide-${Date.now()}`, type, posCm: Math.round(posCm) },
      ],
    }));
  },

  removeCustomGuideline: (id) => {
    set((state) => ({
      customGuidelines: state.customGuidelines.filter((g) => g.id !== id),
    }));
  },

  addMeasurePoint: (pt) => {
    set((state) => ({
      measurePoints: [...state.measurePoints, { xCm: Math.round(pt.xCm), yCm: Math.round(pt.yCm) }],
    }));
  },

  clearMeasurePoints: () => {
    set({ measurePoints: [] });
  },

  saveMeasurePin: (label) => {
    set((state) => {
      if (state.measurePoints.length < 2) return state;
      const pin: PinnedMeasurementPin = {
        id: `pin-${Date.now()}`,
        points: [...state.measurePoints],
        label: label || 'Вимірювання',
      };
      return {
        pinnedMeasurements: [...state.pinnedMeasurements, pin],
        measurePoints: [],
      };
    });
  },

  removeMeasurePin: (id) => {
    set((state) => ({
      pinnedMeasurements: state.pinnedMeasurements.filter((p) => p.id !== id),
    }));
  },

  addAreaPoint: (pt) => {
    set((state) => ({
      areaPoints: [...state.areaPoints, { xCm: Math.round(pt.xCm), yCm: Math.round(pt.yCm) }],
    }));
  },

  clearAreaPoints: () => {
    set({ areaPoints: [] });
  },

  deleteSelected: () => {
    set((state) => {
      if (!state.selectedIds.length) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextDirty = new Set(state.dirtyIds);

      for (const id of state.selectedIds) {
        const obj = nextObjects[id];
        if (!obj || obj.locked) continue;

        if (obj.isNew) {
          delete nextObjects[id];
        } else {
          nextObjects[id] = { ...obj, deleted: true };
        }
        nextDirty.add(id);
      }

      const nextObjectIds = state.objectIds.filter((id) => Boolean(nextObjects[id]));

      return {
        objects: nextObjects,
        objectIds: nextObjectIds,
        dirtyIds: Array.from(nextDirty),
        selectedIds: [],
        history: hist,
        saveStatus: 'dirty',
      };
    });
    get().computeCollisions();
  },

  toggleLockSelected: () => {
    set((state) => {
      if (!state.selectedIds.length) return state;
      const hist = pushSnapshot(state);
      const nextObjects = { ...state.objects };
      const nextDirty = new Set(state.dirtyIds);

      for (const id of state.selectedIds) {
        const obj = nextObjects[id];
        if (!obj) continue;
        nextObjects[id] = { ...obj, locked: !obj.locked };
        nextDirty.add(id);
      }

      return {
        objects: nextObjects,
        dirtyIds: Array.from(nextDirty),
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  bringForwardSelected: () => {
    set((state) => {
      if (state.selectedIds.length !== 1) return state;
      const id = state.selectedIds[0]!;
      const obj = state.objects[id];
      if (!obj) return state;

      const maxZ = Math.max(0, ...Object.values(state.objects).map((o) => o.zIndex));
      const hist = pushSnapshot(state);

      return {
        objects: { ...state.objects, [id]: { ...obj, zIndex: maxZ + 1 } },
        dirtyIds: Array.from(new Set([...state.dirtyIds, id])),
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  sendBackwardSelected: () => {
    set((state) => {
      if (state.selectedIds.length !== 1) return state;
      const id = state.selectedIds[0]!;
      const obj = state.objects[id];
      if (!obj) return state;

      const minZ = Math.min(...Object.values(state.objects).map((o) => o.zIndex));
      const hist = pushSnapshot(state);

      return {
        objects: { ...state.objects, [id]: { ...obj, zIndex: Math.max(0, minZ - 1) } },
        dirtyIds: Array.from(new Set([...state.dirtyIds, id])),
        history: hist,
        saveStatus: 'dirty',
      };
    });
  },

  setIsDragging: (val) => {
    set({ isDragging: val });
  },

  setActiveGuides: (guides) => {
    set({ activeGuides: guides });
  },

  computeCollisions: () => {
    const state = get();
    if (!state.settings.showCollisions) return;

    const activeList = Object.values(state.objects).filter((o) => !o.deleted);
    const collisionsMap: Record<string, boolean> = {};

    for (let i = 0; i < activeList.length; i++) {
      const a = activeList[i]!;
      for (let j = i + 1; j < activeList.length; j++) {
        const b = activeList[j]!;
        // Skip paths and fences from collision highlights
        if (a.type === 'PATH' || b.type === 'PATH' || a.type === 'FENCE' || b.type === 'FENCE') {
          continue;
        }

        if (checkObjectsOverlap(a, b)) {
          collisionsMap[a.id] = true;
          collisionsMap[b.id] = true;
        }
      }
    }

    set((s) => {
      const next = { ...s.objects };
      let changed = false;
      for (const obj of activeList) {
        const hasCollision = Boolean(collisionsMap[obj.id]);
        if (obj.hasCollision !== hasCollision) {
          next[obj.id] = { ...obj, hasCollision };
          changed = true;
        }
      }
      return changed ? { objects: next } : s;
    });
  },

  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) return state;

      const previous = state.history.past[state.history.past.length - 1]!;
      const newPast = state.history.past.slice(0, -1);

      const currentSnapshot: PlanSnapshot = {
        objects: { ...state.objects },
        plan: {
          name: state.plan.name,
          widthCm: state.plan.widthCm,
          heightCm: state.plan.heightCm,
          boundary: state.plan.boundary ? [...state.plan.boundary] : null,
          northAngleDeg: state.plan.northAngleDeg,
          gridSizeCm: state.plan.gridSizeCm,
        },
      };

      const newFuture = [currentSnapshot, ...state.history.future].slice(0, 50);

      return {
        objects: previous.objects,
        objectIds: Object.keys(previous.objects),
        plan: { ...state.plan, ...previous.plan },
        selectedIds: [],
        history: { past: newPast, future: newFuture },
        saveStatus: 'dirty',
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) return state;

      const next = state.history.future[0]!;
      const newFuture = state.history.future.slice(1);

      const currentSnapshot: PlanSnapshot = {
        objects: { ...state.objects },
        plan: {
          name: state.plan.name,
          widthCm: state.plan.widthCm,
          heightCm: state.plan.heightCm,
          boundary: state.plan.boundary ? [...state.plan.boundary] : null,
          northAngleDeg: state.plan.northAngleDeg,
          gridSizeCm: state.plan.gridSizeCm,
        },
      };

      const newPast = [...state.history.past, currentSnapshot].slice(-50);

      return {
        objects: next.objects,
        objectIds: Object.keys(next.objects),
        plan: { ...state.plan, ...next.plan },
        selectedIds: [],
        history: { past: newPast, future: newFuture },
        saveStatus: 'dirty',
      };
    });
  },

  markDirty: (dirtyId) => {
    set((state) => ({
      saveStatus: 'dirty',
      dirtyIds: dirtyId
        ? Array.from(new Set([...state.dirtyIds, dirtyId]))
        : state.dirtyIds,
    }));
  },

  setSaveStatus: (status, error = null) => {
    set({ saveStatus: status, lastError: error });
  },

  applyIdMap: (idMap, newVersion) => {
    set((state) => {
      const nextObjects = { ...state.objects };
      let changed = false;

      for (const [clientId, serverId] of Object.entries(idMap)) {
        if (nextObjects[clientId]) {
          const old = nextObjects[clientId]!;
          delete nextObjects[clientId];
          nextObjects[serverId] = {
            ...old,
            id: serverId,
            clientId,
            isNew: false,
          };
          changed = true;
        }
      }

      // Remove objects marked as deleted
      for (const id of Object.keys(nextObjects)) {
        if (nextObjects[id]?.deleted) {
          delete nextObjects[id];
          changed = true;
        }
      }

      const nextIds = Object.keys(nextObjects);

      return {
        objects: changed ? nextObjects : state.objects,
        objectIds: changed ? nextIds : state.objectIds,
        dirtyIds: [],
        plan: { ...state.plan, version: newVersion },
        saveStatus: 'saved',
        lastError: null,
      };
    });
  },

  getActiveObjects: () => {
    const s = get();
    return s.objectIds
      .map((id) => s.objects[id])
      .filter((o): o is CanvasPlanObject => Boolean(o && !o.deleted));
  },
}));

export const usePlannerStore = useGardenPlannerStore;
