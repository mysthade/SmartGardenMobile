import {
  findReadyToHarvestPlants,
  hasZoneHarvestablePlants,
  isInQuietHours,
} from '../lib/harvest-reminders';
import type { HarvestDto, PlantDto, ZoneDto } from '@smart-garden/types';

describe('harvest-reminders', () => {
  describe('isInQuietHours', () => {
    it('detects night hours correctly with wrap-around (22 to 8)', () => {
      expect(isInQuietHours(23, 22, 8)).toBe(true);
      expect(isInQuietHours(2, 22, 8)).toBe(true);
      expect(isInQuietHours(7, 22, 8)).toBe(true);
      expect(isInQuietHours(8, 22, 8)).toBe(false);
      expect(isInQuietHours(14, 22, 8)).toBe(false);
      expect(isInQuietHours(21, 22, 8)).toBe(false);
    });
  });

  describe('hasZoneHarvestablePlants', () => {
    const plants: PlantDto[] = [
      {
        id: 'p-1',
        zoneId: 'z-1',
        gardenId: 'g-1',
        plantTypeId: 'pt-1',
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
      {
        id: 'p-2',
        zoneId: 'z-2',
        gardenId: 'g-1',
        plantTypeId: 'pt-2',
        name: 'Морква',
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
        status: 'GROWING',
        mainImageUrl: null,
        version: 1,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
    ];

    it('returns true for zone with harvesting plant', () => {
      expect(hasZoneHarvestablePlants('z-1', plants)).toBe(true);
    });

    it('returns false for zone with only growing plants', () => {
      expect(hasZoneHarvestablePlants('z-2', plants)).toBe(false);
    });
  });

  describe('findReadyToHarvestPlants', () => {
    const zones: ZoneDto[] = [
      {
        id: 'z-1',
        gardenId: 'g-1',
        name: 'Теплиця',
        type: 'GREENHOUSE',
        description: null,
        area: '10',
        positionX: null,
        positionY: null,
        width: '5',
        height: '2',
        color: null,
        imageUrl: null,
        settings: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const plants: PlantDto[] = [
      {
        id: 'p-harvesting',
        zoneId: 'z-1',
        gardenId: 'g-1',
        plantTypeId: 'pt-1',
        name: 'Огірок тепличний',
        variety: null,
        description: null,
        quantity: 5,
        occupiedArea: null,
        positionX: null,
        positionY: null,
        size: null,
        rotation: null,
        plantedAt: '2026-05-01T00:00:00Z',
        expectedHarvestAt: null,
        finishedAt: null,
        status: 'HARVESTING',
        mainImageUrl: null,
        version: 1,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
      {
        id: 'p-fruiting',
        zoneId: 'z-1',
        gardenId: 'g-1',
        plantTypeId: 'pt-2',
        name: 'Баклажан',
        variety: null,
        description: null,
        quantity: 4,
        occupiedArea: null,
        positionX: null,
        positionY: null,
        size: null,
        rotation: null,
        plantedAt: '2026-05-01T00:00:00Z',
        expectedHarvestAt: null,
        finishedAt: null,
        status: 'FRUITING',
        mainImageUrl: null,
        version: 1,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
      {
        id: 'p-planned',
        zoneId: 'z-1',
        gardenId: 'g-1',
        plantTypeId: 'pt-3',
        name: 'Капуста пізня',
        variety: null,
        description: null,
        quantity: 10,
        occupiedArea: null,
        positionX: null,
        positionY: null,
        size: null,
        rotation: null,
        plantedAt: '2026-05-01T00:00:00Z',
        expectedHarvestAt: '2026-10-25T00:00:00Z', // In 3 days from 2026-10-22
        finishedAt: null,
        status: 'GROWING',
        mainImageUrl: null,
        version: 1,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
    ];

    const harvests: HarvestDto[] = [
      {
        id: 'h-old',
        plantId: 'p-harvesting',
        quantity: '5',
        unit: 'KILOGRAM',
        damagedQuantity: null,
        quality: 'GOOD',
        notes: null,
        quantityGrams: '5000',
        harvestedAt: '2026-10-10T10:00:00Z', // 12 days ago
        createdAt: '2026-10-10T10:00:00Z',
        updatedAt: '2026-10-10T10:00:00Z',
      },
    ];

    it('identifies harvesting and fruiting plants and marks high urgency if elapsed time is high', () => {
      const today = new Date('2026-10-22T10:00:00Z');
      const reminders = findReadyToHarvestPlants(plants, zones, harvests, today);

      expect(reminders.length).toBe(3);
      // p-harvesting has > 5 days since last harvest, so urgency is HIGH
      expect(reminders[0].plantId).toBe('p-harvesting');
      expect(reminders[0].urgency).toBe('HIGH');
      expect(reminders[0].message).toContain('Минуло 12 дн.');

      // p-fruiting is included
      const fruiting = reminders.find((r) => r.plantId === 'p-fruiting');
      expect(fruiting).toBeDefined();
      expect(fruiting?.urgency).toBe('NORMAL');

      // p-planned has expected date within threshold
      const cabbage = reminders.find((r) => r.plantId === 'p-planned');
      expect(cabbage).toBeDefined();
    });
  });
});
