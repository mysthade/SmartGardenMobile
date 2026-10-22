import type {
  PlanObjectLayer,
  PlanObjectType,
} from '@smart-garden/types';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export type PlannerTool =
  | 'select'
  | 'pan'
  | 'place'
  | 'boundary'
  | 'draw-line'
  | 'multiselect'
  | 'measure'
  | 'area';

export interface CanvasPlanObject {
  id: string;
  clientId?: string;
  isNew?: boolean;
  deleted?: boolean;
  type: PlanObjectType;
  label: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  rotationDeg: number;
  zIndex: number;
  layer: PlanObjectLayer;
  color: string | null;
  locked: boolean;
  meta: Record<string, unknown> | null;
  zoneId: string | null;
  plantId: string | null;
  hasCollision?: boolean;
}

export interface PlanSnapshot {
  objects: Record<string, CanvasPlanObject>;
  plan: {
    name: string;
    widthCm: number;
    heightCm: number;
    boundary: Array<{ xCm: number; yCm: number }> | null;
    northAngleDeg: number;
    gridSizeCm: number;
  };
}

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface GridSettings {
  enabled: boolean;
  stepCm: 5 | 10 | 50 | 100;
  snap: boolean;
}

export interface CustomGuideline {
  id: string;
  type: 'vertical' | 'horizontal';
  posCm: number;
}

export interface PinnedMeasurementPin {
  id: string;
  points: Array<{ xCm: number; yCm: number }>;
  label: string;
}

export interface PlannerSettings {
  showCollisions: boolean;
  showRulers: boolean;
  objectSnap: boolean;
  lockAspectRatio: boolean;
  rotationSnap15: boolean;
  measurementUnit: 'm' | 'cm' | 'ft';
  measurementPrecision: 0.01 | 0.1 | 1;
  slowDrag: boolean;
  checkRules: boolean;
}

export interface LineDrawingState {
  type: 'PATH' | 'FENCE';
  points: Array<{ xCm: number; yCm: number }>;
  isCurved: boolean;
}

export type PlannerViewMode = '2D' | '2.5D' | '3D';

export type CameraPreset =
  | 'top'
  | 'isometric'
  | 'perspective'
  | 'ground'
  | 'north'
  | 'east'
  | 'south'
  | 'west';

export interface Camera3DState {
  yawDeg: number;
  pitchDeg: number;
  distance: number;
  targetX: number;
  targetY: number;
}

