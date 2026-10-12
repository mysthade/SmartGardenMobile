/**
 * Стан редактора зони (мобільний порт zone-editor-store.ts з вебу).
 * Позиції рослин зберігаються у МЕТРАХ (не пікселях).
 */

import type {
  BedLayoutDto,
  BedLayoutPlantDto,
  PlantStatus,
  PlantTypeCategory,
  PlantTypeDto,
  ZoneType,
} from '@smart-garden/types';
import {
  DEFAULT_PLANT_SIZE_M,
  defaultZoneSettings,
  parseZoneSettings,
  type ZoneSettingsInput,
} from '@smart-garden/validation';
import { create } from 'zustand';
import { placePoint, suggestedPlantSizeM } from './lib/geometry';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export type CanvasPlant = {
  id: string;
  clientId?: string;
  isNew?: boolean;
  deleted?: boolean;
  plantTypeId: string;
  name: string;
  variety: string | null;
  description: string | null;
  quantity: number;
  positionX: number;
  positionY: number;
  size: number;
  rotation: number;
  plantedAt: string | null;
  status: PlantStatus;
  version: number;
  plantType: Pick<PlantTypeDto, 'id' | 'name' | 'scientificName' | 'category' | 'iconKey'>;
  openProblemsCount: number;
};

/** Знімок для undo/redo. */
type Snapshot = {
  plants: Record<string, CanvasPlant>;
  zone: { name: string; widthM: number; heightM: number };
  settings: ZoneSettingsInput;
};

export type ZoneEditorState = {
  zoneId: string;
  gardenId: string;
  gardenName: string;
  zoneType: ZoneType;
  settings: ZoneSettingsInput;
  zone: { name: string; widthM: number; heightM: number; updatedAt: string };
  plants: Record<string, CanvasPlant>;
  selectedId: string | null;
  catalog: { q: string; category: PlantTypeCategory | 'ALL'; tab: 'catalog' | 'mine' };
  view: { scale: number; offsetX: number; offsetY: number };
  showGrid: boolean;
  snapToGrid: boolean;
  gridStepM: number;
  isDragging: boolean;
  saveStatus: SaveStatus;
  lastError: string | null;
  history: { past: Snapshot[]; future: Snapshot[] };

  hydrate: (layout: BedLayoutDto) => void;
  select: (id: string | null) => void;
  setCatalog: (patch: Partial<ZoneEditorState['catalog']>) => void;
  addPlantFromType: (type: PlantTypeDto, at: { x: number; y: number }) => void;
  commitPlantPosition: (id: string, xM: number, yM: number) => void;
  previewPlantPosition: (id: string, xM: number, yM: number) => void;
  updatePlantFields: (id: string, patch: Partial<CanvasPlant>) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  setView: (patch: Partial<ZoneEditorState['view']>) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setDragging: (value: boolean) => void;
  undo: () => void;
  redo: () => void;
  markDirty: () => void;
  setSaveStatus: (status: SaveStatus, error?: string | null) => void;
  applyIdMap: (idMap: Record<string, string>, layout: BedLayoutDto) => void;
  getActivePlants: () => CanvasPlant[];
  getSelectedPlant: () => CanvasPlant | null;
};

function toCanvasPlant(plant: BedLayoutPlantDto): CanvasPlant {
  const rawX = Number(plant.positionX);
  const rawY = Number(plant.positionY);
  const rawSize = Number(plant.size);
  // Рослини, створені у вебі через форму (не в редакторі), мають positionX/Y = NULL,
  // які бекенд серіалізує як рядок '0'. Рослина, дійсно перетягнута в редакторі,
  // ніколи не стоїть рівно в (0,0) — placePoint тримає центр на відстані radius
  // від краю. Тому (0,0) — надійний маркер «немає позиції»: ставимо NaN, і
  // hydrate() розкидає таку рослину по вільному місцю зони.
  const unplaced = rawX === 0 && rawY === 0;
  return {
    id: plant.id,
    plantTypeId: plant.plantTypeId,
    name: plant.name,
    variety: plant.variety,
    description: plant.description,
    quantity: plant.quantity,
    positionX: !unplaced && Number.isFinite(rawX) ? rawX : Number.NaN,
    positionY: !unplaced && Number.isFinite(rawY) ? rawY : Number.NaN,
    size: Number.isFinite(rawSize) && rawSize > 0 ? rawSize : DEFAULT_PLANT_SIZE_M,
    rotation: Number(plant.rotation) || 0,
    plantedAt: plant.plantedAt,
    status: plant.status,
    version: plant.version,
    plantType: plant.plantType,
    openProblemsCount: plant.openProblemsCount,
  };
}

function snapshotFrom(state: Pick<ZoneEditorState, 'plants' | 'zone' | 'settings'>): Snapshot {
  return {
    plants: { ...state.plants },
    zone: { name: state.zone.name, widthM: state.zone.widthM, heightM: state.zone.heightM },
    settings: { ...state.settings },
  };
}

function pushHistory(state: ZoneEditorState): Pick<ZoneEditorState, 'history'> {
  const past = [...state.history.past, snapshotFrom(state)].slice(-50);
  return { history: { past, future: [] } };
}

function newClientId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `tmp-${rand}`;
}

/** Обчислює фінальну позицію з урахуванням рядів, snap і меж зони. */
function computePlacement(
  state: ZoneEditorState,
  x: number,
  y: number,
  sizeM: number,
  snap = state.snapToGrid,
): { x: number; y: number } {
  return placePoint({
    x,
    y,
    sizeM,
    widthM: state.zone.widthM,
    heightM: state.zone.heightM,
    zoneType: state.zoneType,
    settings: state.settings,
    snap,
    gridStepM: state.gridStepM,
  });
}

function plantSizeForZone(state: ZoneEditorState, preferred?: number): number {
  return suggestedPlantSizeM({
    widthM: state.zone.widthM,
    heightM: state.zone.heightM,
    settings: state.settings,
    preferred,
  });
}

/**
 * Знаходить вільне місце у зоні для рослини без координат (null/NaN),
 * уникаючи накладання на вже розміщені маркери.
 */
function findFreeSpot(
  existing: CanvasPlant[],
  sizeM: number,
  zone: { widthM: number; heightM: number },
  settings: ZoneSettingsInput,
  zoneType: ZoneType,
): { x: number; y: number } {
  const radius = sizeM / 2;
  const step = Math.max(sizeM * 0.9, 0.05);
  const minClear = sizeM * 1.05;
  let fallback: { x: number; y: number } | null = null;
  for (let y = radius; y <= zone.heightM - radius + 1e-6; y += step) {
    for (let x = radius; x <= zone.widthM - radius + 1e-6; x += step) {
      const candidate = placePoint({
        x,
        y,
        sizeM,
        widthM: zone.widthM,
        heightM: zone.heightM,
        zoneType,
        settings,
        snap: true,
        gridStepM: 0.25,
      });
      if (!fallback) {
        fallback = candidate;
      }
      const overlaps = existing.some(
        (p) =>
          Math.hypot(p.positionX - candidate.x, p.positionY - candidate.y) < minClear,
      );
      if (!overlaps) {
        return candidate;
      }
    }
  }
  return (
    fallback ?? placePoint({ x: zone.widthM / 2, y: zone.heightM / 2, sizeM, widthM: zone.widthM, heightM: zone.heightM, zoneType, settings, snap: true, gridStepM: 0.25 })
  );
}


export const useZoneEditorStore = create<ZoneEditorState>((set, get) => ({
  zoneId: '',
  gardenId: '',
  gardenName: '',
  zoneType: 'BED',
  settings: defaultZoneSettings('BED'),
  zone: { name: '', widthM: 4, heightM: 2, updatedAt: '' },
  plants: {},
  selectedId: null,
  catalog: { q: '', category: 'ALL', tab: 'catalog' },
  view: { scale: 1, offsetX: 0, offsetY: 0 },
  showGrid: true,
  snapToGrid: true,
  gridStepM: 0.25,
  isDragging: false,
  saveStatus: 'idle',
  lastError: null,
  history: { past: [], future: [] },

  hydrate: (layout) => {
    const prev = get();
    const sameZone = prev.zoneId === layout.zone.id;
    const zoneType = layout.zone.type;
    const settings = parseZoneSettings(zoneType, layout.zone.settings);
    const zone = {
      name: layout.zone.name,
      widthM: Number(layout.zone.width) || 4,
      heightM: Number(layout.zone.height) || 2,
      updatedAt: layout.zone.updatedAt,
    };
    const fitSize = suggestedPlantSizeM({ widthM: zone.widthM, heightM: zone.heightM, settings });
    const plants: Record<string, CanvasPlant> = {};
    const placed: CanvasPlant[] = [];
    // Спочатку розміщуємо рослини з валідними координатами, потім — ті, що
    // були створені у вебі через форму без позиції (null/NaN): розкидаємо їх
    // по вільних місцях зони, щоб їх було видно і можна було перетягувати.
    const withCoords = layout.plants.map(toCanvasPlant);
    const missingCoords = withCoords.filter(
      (p) => !Number.isFinite(p.positionX) || !Number.isFinite(p.positionY),
    );
    for (const plant of withCoords) {
      const sized: CanvasPlant = { ...plant, size: Math.min(plant.size, fitSize) };
      if (Number.isFinite(sized.positionX) && Number.isFinite(sized.positionY)) {
        plants[sized.id] = sized;
        placed.push(sized);
      }
    }
    for (const plant of missingCoords) {
      const sized: CanvasPlant = { ...plant, size: Math.min(plant.size, fitSize) };
      const spot = findFreeSpot(placed, sized.size, zone, settings, zoneType);
      const fixed: CanvasPlant = { ...sized, positionX: spot.x, positionY: spot.y };
      plants[fixed.id] = fixed;
      placed.push(fixed);
    }
    const preservedSelection =
      sameZone && prev.selectedId && plants[prev.selectedId] ? prev.selectedId : null;
    set({
      zoneId: layout.zone.id,
      gardenId: layout.garden.id,
      gardenName: layout.garden.name,
      zoneType,
      settings,
      zone,
      plants,
      selectedId: preservedSelection,
      isDragging: false,
      saveStatus: missingCoords.length > 0 ? 'dirty' : sameZone ? prev.saveStatus : 'idle',
      lastError: sameZone ? prev.lastError : null,
      history: sameZone ? prev.history : { past: [], future: [] },
      view: sameZone ? prev.view : { scale: 1, offsetX: 0, offsetY: 0 },
    });
  },

  select: (id) => set({ selectedId: id }),

  setCatalog: (patch) => set((state) => ({ catalog: { ...state.catalog, ...patch } })),

  addPlantFromType: (type, at) => {
    const state = get();
    const sizeM = plantSizeForZone(state);
    const placed = computePlacement(state, at.x, at.y, sizeM);
    const clientId = newClientId();
    const plant: CanvasPlant = {
      id: clientId,
      clientId,
      isNew: true,
      plantTypeId: type.id,
      name: type.name,
      variety: null,
      description: null,
      quantity: 1,
      positionX: placed.x,
      positionY: placed.y,
      size: sizeM,
      rotation: 0,
      plantedAt: null,
      status: 'PLANNED',
      version: 1,
      plantType: {
        id: type.id,
        name: type.name,
        scientificName: type.scientificName,
        category: type.category,
        iconKey: type.iconKey,
      },
      openProblemsCount: 0,
    };
    set({
      ...pushHistory(state),
      plants: { ...state.plants, [clientId]: plant },
      selectedId: clientId,
      saveStatus: 'dirty',
    });
  },

  previewPlantPosition: (id, xM, yM) => {
    const state = get();
    const plant = state.plants[id];
    if (!plant || plant.deleted) {
      return;
    }
    const placed = computePlacement(state, xM, yM, plant.size, false);
    set({
      plants: { ...state.plants, [id]: { ...plant, positionX: placed.x, positionY: placed.y } },
    });
  },

  commitPlantPosition: (id, xM, yM) => {
    const state = get();
    const plant = state.plants[id];
    if (!plant || plant.deleted) {
      return;
    }
    const sizeM = plantSizeForZone(state, plant.size);
    const placed = computePlacement(state, xM, yM, sizeM);
    set({
      ...pushHistory(state),
      plants: {
        ...state.plants,
        [id]: { ...plant, size: sizeM, positionX: placed.x, positionY: placed.y },
      },
      isDragging: false,
      saveStatus: 'dirty',
    });
  },

  updatePlantFields: (id, patch) => {
    const state = get();
    const plant = state.plants[id];
    if (!plant) {
      return;
    }
    set({
      ...pushHistory(state),
      plants: { ...state.plants, [id]: { ...plant, ...patch } },
      saveStatus: 'dirty',
    });
  },

  duplicateSelected: () => {
    const state = get();
    if (!state.selectedId) {
      return;
    }
    const source = state.plants[state.selectedId];
    if (!source || source.deleted) {
      return;
    }
    const sizeM = source.size;
    const placed = computePlacement(state, source.positionX + 0.25, source.positionY + 0.25, sizeM);
    const clientId = newClientId();
    const copy: CanvasPlant = {
      ...source,
      id: clientId,
      clientId,
      isNew: true,
      version: 1,
      size: sizeM,
      positionX: placed.x,
      positionY: placed.y,
      name: `${source.name} (копія)`,
    };
    set({
      ...pushHistory(state),
      plants: { ...state.plants, [clientId]: copy },
      selectedId: clientId,
      saveStatus: 'dirty',
    });
  },

  deleteSelected: () => {
    const state = get();
    if (!state.selectedId) {
      return;
    }
    const plant = state.plants[state.selectedId];
    if (!plant) {
      return;
    }
    const next = { ...state.plants };
    if (plant.isNew) {
      delete next[state.selectedId];
    } else {
      next[state.selectedId] = { ...plant, deleted: true };
    }
    set({
      ...pushHistory(state),
      plants: next,
      selectedId: null,
      saveStatus: 'dirty',
    });
  },

  setView: (patch) => set((state) => ({ view: { ...state.view, ...patch } })),

  zoomBy: (factor) =>
    set((state) => ({
      view: {
        ...state.view,
        scale: Math.min(4, Math.max(0.3, state.view.scale * factor)),
      },
    })),

  resetView: () => set({ view: { scale: 1, offsetX: 0, offsetY: 0 } }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleSnap: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  setDragging: (value) => set({ isDragging: value }),

  undo: () => {
    const state = get();
    const previous = state.history.past[state.history.past.length - 1];
    if (!previous) {
      return;
    }
    const past = state.history.past.slice(0, -1);
    const future = [snapshotFrom(state), ...state.history.future];
    set({
      plants: previous.plants,
      zone: { ...state.zone, ...previous.zone },
      settings: previous.settings,
      history: { past, future },
      saveStatus: 'dirty',
    });
  },

  redo: () => {
    const state = get();
    const next = state.history.future[0];
    if (!next) {
      return;
    }
    set({
      plants: next.plants,
      zone: { ...state.zone, ...next.zone },
      settings: next.settings,
      history: {
        past: [...state.history.past, snapshotFrom(state)],
        future: state.history.future.slice(1),
      },
      saveStatus: 'dirty',
    });
  },

  markDirty: () => set({ saveStatus: 'dirty' }),

  setSaveStatus: (status, error = null) => set({ saveStatus: status, lastError: error }),

  applyIdMap: (idMap, layout) => {
    const selected = get().selectedId;
    const mapped = selected && idMap[selected] ? idMap[selected] : selected;
    get().hydrate(layout);
    if (mapped && get().plants[mapped]) {
      set({ selectedId: mapped });
    }
  },

  getActivePlants: () => Object.values(get().plants).filter((plant) => !plant.deleted),

  getSelectedPlant: () => {
    const id = get().selectedId;
    if (!id) {
      return null;
    }
    return get().plants[id] ?? null;
  },
}));

/** Візуальний тон маркера за статусом рослини. */
export function markerTone(plant: CanvasPlant): 'ok' | 'attention' | 'danger' | 'done' {
  if (plant.status === 'FINISHED') {
    return 'done';
  }
  if (plant.status === 'HAS_PROBLEM' || plant.openProblemsCount > 0) {
    return 'danger';
  }
  if (plant.status === 'PLANNED') {
    return 'attention';
  }
  return 'ok';
}

