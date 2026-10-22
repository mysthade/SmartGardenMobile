import { useZoneEditorStore } from '@/src/features/zone-editor/store';
import { usePlannerStore } from '@/src/features/planner/store/use-planner-store';
import { useWeatherStore } from '@/src/features/weather/lib/weather-store';
import { harvestUsageStore } from '@/src/features/harvests/lib/harvest-usage-store';
import { themes } from '@/src/theme/tokens';
import type { HarvestDto, PlantDto } from '@smart-garden/types';
import type { HarvestStockUsage } from '@/src/features/harvests/types';

// Mock SecureStore
jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

describe('App Key Scenarios Smoke Tests', () => {
  describe('1. Theme Switching and Tokens', () => {
    it('provides valid light and dark themes with all required color tokens', () => {
      expect(themes.light).toBeDefined();
      expect(themes.dark).toBeDefined();
      expect(themes.light.bg).toBeDefined();
      expect(themes.light.ac).toBeDefined();
      expect(themes.dark.bg).toBeDefined();
      expect(themes.dark.ac).toBeDefined();
      expect(themes.light.name).toBe('light');
      expect(themes.dark.name).toBe('dark');
    });
  });

  describe('2. Zone Editor: Hydration, Selection, and Position Updates', () => {
    it('initializes store, selects elements and updates plant positions', () => {
      const mockLayout = {
        zoneId: 'zone-1',
        gardenId: 'garden-1',
        gardenName: 'Мій Сад',
        garden: { id: 'garden-1', name: 'Мій Сад' },
        zoneType: 'BED' as const,
        zone: {
          id: 'zone-1',
          gardenId: 'garden-1',
          name: 'Грядка 1',
          type: 'BED' as const,
          description: null,
          area: '8',
          positionX: '0',
          positionY: '0',
          width: '4',
          height: '2',
          color: null,
          imageUrl: null,
          settings: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        settings: {
          type: 'BED' as const,
          rowCount: 2,
          rowDirection: 'horizontal' as const,
          rowSpacingM: 0.5,
          snapToRows: true,
        },
        plants: [
          {
            id: 'plant-1',
            plantTypeId: 'type-tomato',
            name: 'Томат',
            variety: 'Чері',
            description: null,
            quantity: 1,
            positionX: '1.0',
            positionY: '0.5',
            size: '0.4',
            rotation: '0',
            plantedAt: null,
            status: 'GROWING' as const,
            version: 1,
            plantType: {
              id: 'type-tomato',
              name: 'Томат',
              scientificName: 'Solanum lycopersicum',
              category: 'VEGETABLE' as const,
              iconKey: null,
            },
            openProblemsCount: 0,
          },
        ],
      };

      useZoneEditorStore.getState().hydrate(mockLayout as never);
      expect(useZoneEditorStore.getState().plants['plant-1']).toBeDefined();
      expect(useZoneEditorStore.getState().plants['plant-1'].positionX).toBeCloseTo(1.0);

      // Move plant position (snaps to rows at 0.5m spacing: 1.2 -> 1.25)
      useZoneEditorStore.getState().commitPlantPosition('plant-1', 2.0, 1.2);
      expect(useZoneEditorStore.getState().plants['plant-1'].positionX).toBeCloseTo(2.0);
      expect(useZoneEditorStore.getState().plants['plant-1'].positionY).toBeCloseTo(1.25);
      expect(useZoneEditorStore.getState().saveStatus).toBe('dirty');
    });
  });

  describe('3. Planner 2D, 2.5D and 3D View Modes', () => {
    it('switches between 2D, 2.5D and 3D view modes', () => {
      const store = usePlannerStore.getState();
      expect(store.viewMode).toBe('2D');

      store.setViewMode('2.5D');
      expect(usePlannerStore.getState().viewMode).toBe('2.5D');

      store.setViewMode('3D');
      expect(usePlannerStore.getState().viewMode).toBe('3D');

      store.setViewMode('2D');
      expect(usePlannerStore.getState().viewMode).toBe('2D');
    });

    it('adds objects from presets and maintains history undo/redo', () => {
      const store = usePlannerStore.getState();
      const objId = store.addObjectFromPreset('GREENHOUSE', { xCm: 100, yCm: 150 });
      expect(objId).toBeDefined();
      expect(usePlannerStore.getState().objects[objId]).toBeDefined();

      usePlannerStore.getState().undo();
      expect(usePlannerStore.getState().objects[objId]).toBeUndefined();

      usePlannerStore.getState().redo();
      expect(usePlannerStore.getState().objects[objId]).toBeDefined();
    });
  });

  describe('4. Harvests, Inventory and Stock Usage Calculations', () => {
    it('calculates remaining stock balance accurately across usage entries', () => {
      const mockPlants: PlantDto[] = [
        {
          id: 'plant-1',
          zoneId: 'zone-1',
          gardenId: 'garden-1',
          plantTypeId: 'type-tomato',
          name: 'Томат',
          variety: null,
          description: null,
          quantity: 1,
          occupiedArea: null,
          positionX: null,
          positionY: null,
          size: null,
          rotation: null,
          plantedAt: null,
          expectedHarvestAt: null,
          finishedAt: null,
          status: 'HARVESTING',
          mainImageUrl: null,
          version: 1,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
      ];

      const harvests: HarvestDto[] = [
        {
          id: 'h1',
          plantId: 'plant-1',
          quantity: '10.5',
          unit: 'KILOGRAM',
          damagedQuantity: null,
          quality: 'EXCELLENT',
          notes: null,
          quantityGrams: '10500',
          harvestedAt: '2026-10-20T10:00:00Z',
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-10-20T10:00:00Z',
        },
      ];

      const harvestsWithCrop = harvests.map((h) => ({ ...h, plantName: 'Томат' }));
      const balancesBefore = harvestUsageStore.calculateStockBalances(harvestsWithCrop, mockPlants, []);
      const itemBefore = balancesBefore.find((b) => b.plantName === 'Томат');
      expect(itemBefore).toBeDefined();
      expect(itemBefore?.totalHarvested).toBeCloseTo(10.5);
      expect(itemBefore?.remaining).toBeCloseTo(10.5);

      const usages: HarvestStockUsage[] = [
        {
          id: 'u1',
          plantId: 'plant-1',
          cropName: 'Томат',
          quantity: 3.5,
          unit: 'KILOGRAM',
          reason: 'EATEN',
          usedAt: '2026-10-21T10:00:00Z',
          isLocalOnly: true,
        },
      ];

      const balancesAfter = harvestUsageStore.calculateStockBalances(harvestsWithCrop, mockPlants, usages);
      const itemAfter = balancesAfter.find((b) => b.plantName === 'Томат');
      expect(itemAfter?.totalUsed).toBeCloseTo(3.5);
      expect(itemAfter?.remaining).toBeCloseTo(7.0);
    });
  });

  describe('5. Weather: Coordinate Store and Priority', () => {
    it('manages locations, priority and active selection correctly', async () => {
      const store = useWeatherStore.getState();
      await store.setActiveLocation({
        id: 'loc_custom',
        name: 'Теплиця Залісся',
        country: 'Україна',
        latitude: 49.5,
        longitude: 24.5,
        source: 'manual',
        updatedAt: Date.now(),
      });

      expect(useWeatherStore.getState().activeLocation?.name).toBe('Теплиця Залісся');
      expect(useWeatherStore.getState().activeLocation?.source).toBe('manual');
    });
  });
});
