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
  | 'multiselect';

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
  stepCm: 10 | 50 | 100;
  snap: boolean;
}

export interface PlannerSettings {
  showCollisions: boolean;
  showRulers: boolean;
  objectSnap: boolean;
  lockAspectRatio: boolean;
  rotationSnap15: boolean;
}

export interface LineDrawingState {
  type: 'PATH' | 'FENCE';
  points: Array<{ xCm: number; yCm: number }>;
  isCurved: boolean;
}
