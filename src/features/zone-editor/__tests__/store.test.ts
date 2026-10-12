import { useZoneEditorStore } from '@/src/features/zone-editor/store';
import { markerTone } from '@/src/features/zone-editor/store';
import type { CanvasPlant } from '@/src/features/zone-editor/store';
import { defaultZoneSettings } from '@smart-garden/validation';
import { shouldSnapToRows } from '@/src/features/zone-editor/lib/geometry';

const bedSettings = defaultZoneSettings('BED');

const basePlant = (overrides: Partial<Pick<CanvasPlant, 'status' | 'openProblemsCount'>> = {}): CanvasPlant => ({
  id: 'p1',
  plantTypeId: 't1',
  name: 'Томат',
  variety: null,
  description: null,
  quantity: 1,
  positionX: 1,
  positionY: 1,
  size: 0.4,
  rotation: 0,
  plantedAt: null,
  status: 'GROWING',
  version: 1,
  plantType: {
    id: 't1',
    name: 'Томат',
    scientificName: '',
    category: 'VEGETABLE',
    iconKey: '🍅',
  },
  openProblemsCount: 0,
  ...overrides,
});

describe('markerTone', () => {
  it('FINISHED → done', () => {
    expect(markerTone(basePlant({ status: 'FINISHED' }))).toBe('done');
  });

  it('HAS_PROBLEM або відкритих проблем > 0 → danger', () => {
    expect(markerTone(basePlant({ status: 'HAS_PROBLEM', openProblemsCount: 1 }))).toBe('danger');
  });

  it('PLANNED → attention', () => {
    expect(markerTone(basePlant({ status: 'PLANNED' }))).toBe('attention');
  });

  it('за замовчуванням ok', () => {
    expect(markerTone(basePlant())).toBe('ok');
  });
});

describe('shouldSnapToRows', () => {
  it('BED за замовчуванням true', () => {
    expect(shouldSnapToRows(bedSettings)).toBe(true);
  });

  it('FIELD завжди true', () => {
    expect(shouldSnapToRows(defaultZoneSettings('FIELD'))).toBe(true);
  });

  it('ORCHARD — false', () => {
    expect(shouldSnapToRows(defaultZoneSettings('ORCHARD'))).toBe(false);
  });
});

describe('store initial state', () => {
  it('не падає при getState', () => {
    const state = useZoneEditorStore.getState();
    expect(state.zoneId).toBe('');
    expect(state.plants).toEqual({});
    expect(state.history).toEqual({ past: [], future: [] });
  });
});

describe('hydrate — рослини з вебу без позиції', () => {
  const layoutNull = {
    zone: {
      id: 'z1',
      gardenId: 'g1',
      name: 'мвапвап',
      type: 'BED' as const,
      width: '4',
      height: '2',
      settings: bedSettings,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    garden: { id: 'g1', name: 'Сад' },
    plants: [
      {
        id: 'plant-null',
        zoneId: 'z1',
        plantTypeId: 't1',
        name: 'Інжир',
        variety: null,
        description: null,
        quantity: 1,
        // null — як у зон, створених у вебі через форму (без редактора)
        positionX: null,
        positionY: null,
        size: null,
        rotation: null,
        plantedAt: null,
        status: 'PLANNED' as const,
        version: 1,
        createdAt: '',
        updatedAt: '',
        plantType: {
          id: 't1',
          name: 'Інжир',
          scientificName: '',
          category: 'OTHER' as const,
          iconKey: '🪴',
        },
        openProblemsCount: 0,
      },
    ],
  };

  it('розставляє NaN-координати у вільне місце зони', () => {
    useZoneEditorStore.getState().hydrate(layoutNull as never);
    const plant = useZoneEditorStore.getState().plants['plant-null'];
    expect(plant).toBeDefined();
    expect(Number.isFinite(plant.positionX)).toBe(true);
    expect(Number.isFinite(plant.positionY)).toBe(true);
    // центр рослини в межах зони 4×2
    expect(plant.positionX).toBeGreaterThanOrEqual(0);
    expect(plant.positionY).toBeGreaterThanOrEqual(0);
    expect(plant.positionX).toBeLessThanOrEqual(4);
    expect(plant.positionY).toBeLessThanOrEqual(2);
  });

  it('позначає зону як dirty, щоб автозбереження зберегло нові позиції', () => {
    useZoneEditorStore.getState().hydrate(layoutNull as never);
    expect(useZoneEditorStore.getState().saveStatus).toBe('dirty');
  });

  it('серіалізований бекендом \'0\' теж вважається «без позиції»', () => {
    const layoutZero = {
      ...layoutNull,
      plants: [
        {
          ...layoutNull.plants[0],
          // саме так бекенд віддає NULL: decimalToString(positionX) ?? '0'
          positionX: '0',
          positionY: '0',
          size: '0.4',
          rotation: '0',
        },
      ],
    };
    useZoneEditorStore.getState().hydrate(layoutZero as never);
    const plant = useZoneEditorStore.getState().plants['plant-null'];
    expect(Number.isFinite(plant.positionX)).toBe(true);
    // не стоїть рівно в куті (0,0)
    expect(plant.positionX === 0 && plant.positionY === 0).toBe(false);
  });

  it('кілька рослин без позиції не накладаються одна на одну', () => {
    const many = {
      ...layoutNull,
      plants: Array.from({ length: 4 }, (_, i) => ({
        ...layoutNull.plants[0],
        id: `plant-${i}`,
        positionX: null,
        positionY: null,
      })),
    };
    useZoneEditorStore.getState().hydrate(many as never);
    const plants = useZoneEditorStore.getState().plants;
    const placed = Object.values(plants);
    expect(placed).toHaveLength(4);
    // усі мають фінальні координати в межах зони
    for (const p of placed) {
      expect(Number.isFinite(p.positionX)).toBe(true);
      expect(Number.isFinite(p.positionY)).toBe(true);
    }
    // перевіряємо попарну відстань — жодна пара не накладається (радіус ~0.2)
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const d = Math.hypot(
          placed[i].positionX - placed[j].positionX,
          placed[i].positionY - placed[j].positionY,
        );
        expect(d).toBeGreaterThan(0);
      }
    }
  });
});


