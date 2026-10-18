import {
  STATUS_MAP,
  ZONE_TYPE_LABEL,
  ZONE_TYPES,
  groupPlantsByZone,
  genKey,
} from '@/src/features/gardens/lib/gardens-helpers';
import type { PlantDto } from '@smart-garden/types';

describe('gardens-smoke: helpers & data structures', () => {
  describe('ZONE_TYPE_LABEL', () => {
    it('має коректні українські мітки для всіх канонічних типів', () => {
      expect(ZONE_TYPE_LABEL.BED).toBe('Грядка');
      expect(ZONE_TYPE_LABEL.GREENHOUSE).toBe('Теплиця');
      expect(ZONE_TYPE_LABEL.ORCHARD).toBe('Сад');
      expect(ZONE_TYPE_LABEL.FLOWERBED).toBe('Клумба');
      expect(ZONE_TYPE_LABEL.FIELD).toBe('Відкритий ґрунт');
      expect(ZONE_TYPE_LABEL.OTHER).toBe('Інше');
    });

    it('ZONE_TYPES містить рівно стільки елементів, скільки в ZONE_TYPE_LABEL', () => {
      expect(ZONE_TYPES).toHaveLength(Object.keys(ZONE_TYPE_LABEL).length);
      expect(ZONE_TYPES[0]).toEqual({ value: 'BED', label: 'Грядка' });
    });
  });

  describe('STATUS_MAP', () => {
    it('містить кольори та описи для життєвого циклу рослин', () => {
      expect(STATUS_MAP.GROWING.label).toBe('Росте');
      expect(STATUS_MAP.PLANNED.label).toBe('Заплановано');
      expect(STATUS_MAP.HARVESTING.label).toBe('Збір урожаю');
      expect(STATUS_MAP.FINISHED.label).toBe('Завершено');
      expect(STATUS_MAP.GROWING.color).toBe('#27AE60');
    });
  });

  describe('groupPlantsByZone', () => {
    it('групує рослини за zoneId', () => {
      const mockPlants: PlantDto[] = [
        {
          id: 'p1',
          zoneId: 'z1',
          plantTypeId: 't1',
          name: 'Томат',
          status: 'GROWING',
          quantity: 2,
          positionX: 0,
          positionY: 0,
          size: 0.5,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        } as unknown as PlantDto,
        {
          id: 'p2',
          zoneId: 'z1',
          plantTypeId: 't2',
          name: 'Перець',
          status: 'PLANTED',
          quantity: 1,
          positionX: 1,
          positionY: 0,
          size: 0.4,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        } as unknown as PlantDto,
        {
          id: 'p3',
          zoneId: 'z2',
          plantTypeId: 't3',
          name: 'Яблуня',
          status: 'GROWING',
          quantity: 1,
          positionX: 2,
          positionY: 2,
          size: 1.5,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        } as unknown as PlantDto,
      ];

      const grouped = groupPlantsByZone(mockPlants);
      expect(grouped['z1']).toHaveLength(2);
      expect(grouped['z1'][0].name).toBe('Томат');
      expect(grouped['z1'][1].name).toBe('Перець');
      expect(grouped['z2']).toHaveLength(1);
      expect(grouped['z2'][0].name).toBe('Яблуня');
    });

    it('ігнорує рослини без zoneId', () => {
      const mockPlants: PlantDto[] = [
        {
          id: 'p1',
          zoneId: null,
          name: 'Без зони',
        } as unknown as PlantDto,
      ];

      const grouped = groupPlantsByZone(mockPlants);
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it('коректно працює з порожнім масивом', () => {
      expect(groupPlantsByZone([])).toEqual({});
    });
  });

  describe('genKey', () => {
    it('генерує унікальні ключі з заданим префіксом', () => {
      const k1 = genKey('item');
      const k2 = genKey('item');
      expect(k1.startsWith('item-')).toBe(true);
      expect(k1).not.toBe(k2);
    });
  });
});
