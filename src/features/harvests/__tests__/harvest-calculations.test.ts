import {
  buildMonthlySeries,
  calculatePercentageDiff,
  calculateZoneYieldStats,
  compareHarvestSeasons,
  convertToKg,
  getAvailableHarvestYears,
} from '../lib/harvest-calculations';
import type { HarvestDto, PlantDto, ZoneDto } from '@smart-garden/types';

describe('harvest-calculations', () => {
  describe('convertToKg', () => {
    it('converts KILOGRAM directly', () => {
      expect(convertToKg(5.5, 'KILOGRAM')).toBe(5.5);
      expect(convertToKg('12', 'KILOGRAM')).toBe(12);
    });

    it('converts GRAM to KILOGRAM correctly', () => {
      expect(convertToKg(500, 'GRAM')).toBe(0.5);
      expect(convertToKg('2500', 'GRAM')).toBe(2.5);
    });

    it('returns null for PIECE and LITER to avoid silent incorrect mixing', () => {
      expect(convertToKg(10, 'PIECE')).toBeNull();
      expect(convertToKg(3, 'LITER')).toBeNull();
    });

    it('handles invalid numbers gracefully', () => {
      expect(convertToKg('abc', 'KILOGRAM')).toBe(0);
    });
  });

  describe('calculatePercentageDiff', () => {
    it('calculates positive growth', () => {
      expect(calculatePercentageDiff(150, 100)).toBe(50);
    });

    it('calculates negative decline', () => {
      expect(calculatePercentageDiff(80, 100)).toBe(-20);
    });

    it('handles zero previous base', () => {
      expect(calculatePercentageDiff(50, 0)).toBe(100);
      expect(calculatePercentageDiff(0, 0)).toBe(0);
    });
  });

  describe('getAvailableHarvestYears', () => {
    it('extracts unique years sorted descending', () => {
      const dummyHarvests: Partial<HarvestDto>[] = [
        { harvestedAt: '2024-05-10T10:00:00Z' },
        { harvestedAt: '2025-06-15T10:00:00Z' },
        { harvestedAt: '2024-08-20T10:00:00Z' },
      ];
      const years = getAvailableHarvestYears(dummyHarvests as HarvestDto[]);
      expect(years).toContain(2024);
      expect(years).toContain(2025);
      expect(years[0]).toBeGreaterThanOrEqual(years[years.length - 1]);
    });
  });

  describe('compareHarvestSeasons & zone yield', () => {
    const mockZones: ZoneDto[] = [
      {
        id: 'zone-1',
        gardenId: 'garden-1',
        name: 'Грядка з томатами',
        type: 'BED',
        description: null,
        area: '10', // 10 m2
        positionX: null,
        positionY: null,
        width: '5',
        height: '2',
        color: null,
        imageUrl: null,
        settings: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'zone-2',
        gardenId: 'garden-1',
        name: 'Теплиця з перцями',
        type: 'GREENHOUSE',
        description: null,
        area: '5', // 5 m2
        positionX: null,
        positionY: null,
        width: '2.5',
        height: '2',
        color: null,
        imageUrl: null,
        settings: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];

    const mockPlants: PlantDto[] = [
      {
        id: 'plant-1',
        zoneId: 'zone-1',
        gardenId: 'garden-1',
        plantTypeId: 'type-tomato',
        name: 'Томат Чері',
        variety: 'Червоний',
        description: null,
        quantity: 10,
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
        id: 'plant-2',
        zoneId: 'zone-2',
        gardenId: 'garden-1',
        plantTypeId: 'type-pepper',
        name: 'Перець солодкий',
        variety: 'Каліфорнія',
        description: null,
        quantity: 8,
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
    ];

    const mockHarvests: Array<HarvestDto & { plantName?: string; zoneId?: string }> = [
      // 2026
      {
        id: 'h-1',
        plantId: 'plant-1',
        plantName: 'Томат Чері',
        quantity: '20', // 20 kg
        unit: 'KILOGRAM',
        damagedQuantity: null,
        quality: 'EXCELLENT',
        notes: null,
        quantityGrams: '20000',
        harvestedAt: '2026-07-15T10:00:00Z',
        createdAt: '2026-07-15T10:00:00Z',
        updatedAt: '2026-07-15T10:00:00Z',
      },
      {
        id: 'h-2',
        plantId: 'plant-2',
        plantName: 'Перець солодкий',
        quantity: '15', // 15 kg
        unit: 'KILOGRAM',
        damagedQuantity: null,
        quality: 'GOOD',
        notes: null,
        quantityGrams: '15000',
        harvestedAt: '2026-08-01T10:00:00Z',
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: '2026-08-01T10:00:00Z',
      },
      {
        id: 'h-3',
        plantId: 'plant-1',
        plantName: 'Томат Чері',
        quantity: '50', // 50 pieces
        unit: 'PIECE',
        damagedQuantity: null,
        quality: 'GOOD',
        notes: null,
        quantityGrams: null,
        harvestedAt: '2026-08-05T10:00:00Z',
        createdAt: '2026-08-05T10:00:00Z',
        updatedAt: '2026-08-05T10:00:00Z',
      },
      // 2025
      {
        id: 'h-4',
        plantId: 'plant-1',
        plantName: 'Томат Чері',
        quantity: '25', // 25 kg
        unit: 'KILOGRAM',
        damagedQuantity: null,
        quality: 'GOOD',
        notes: null,
        quantityGrams: '25000',
        harvestedAt: '2025-07-20T10:00:00Z',
        createdAt: '2025-07-20T10:00:00Z',
        updatedAt: '2025-07-20T10:00:00Z',
      },
    ];

    it('calculates season comparison accurately', () => {
      const comp = compareHarvestSeasons(mockHarvests, mockZones, mockPlants, 2026, 2025);

      // Current season: 20 kg (tomato) + 15 kg (pepper) = 35 kg
      expect(comp.currentTotalMassKg).toBe(35);
      // Previous season: 25 kg
      expect(comp.previousTotalMassKg).toBe(25);
      // Diff: +10 kg (+40%)
      expect(comp.massDiffKg).toBe(10);
      expect(comp.massDiffPercent).toBe(40);

      // Pieces: 50 in 2026, 0 in 2025
      expect(comp.currentTotalPieces).toBe(50);
      expect(comp.piecesDiff).toBe(50);

      // Top crops
      expect(comp.topCrops.length).toBeGreaterThan(0);
      expect(comp.topCrops[0].name).toBe('Томат Чері');

      // Best zone:
      // zone-1: 20 kg / 10 m2 = 2 kg/m2
      // zone-2: 15 kg / 5 m2 = 3 kg/m2 (winner!)
      expect(comp.bestZone?.id).toBe('zone-2');
      expect(comp.bestZone?.yieldKgPerM2).toBe(3);
    });

    it('calculates zone yield stats correctly', () => {
      const stats = calculateZoneYieldStats(mockHarvests, mockZones, mockPlants, 2026);
      expect(stats.length).toBe(2);

      const zone2 = stats.find((s) => s.zoneId === 'zone-2');
      expect(zone2?.yieldKgPerM2).toBe(3);
      expect(zone2?.totalMassKg).toBe(15);

      const zone1 = stats.find((s) => s.zoneId === 'zone-1');
      expect(zone1?.yieldKgPerM2).toBe(2);
      expect(zone1?.totalMassKg).toBe(20);
    });

    it('builds monthly series for chart', () => {
      const series = buildMonthlySeries(mockHarvests, 2026);
      expect(series.length).toBe(7); // April - October

      const july = series.find((s) => s.monthLabel === 'Лип');
      expect(july?.massKg).toBe(20);

      const august = series.find((s) => s.monthLabel === 'Сер');
      expect(august?.massKg).toBe(15);
      expect(august?.pieces).toBe(50);
    });
  });
});
