import { harvestUsageStore } from '../lib/harvest-usage-store';
import type { HarvestDto, PlantDto } from '@smart-garden/types';
import type { HarvestStockUsage } from '../types';

describe('harvestUsageStore & Stock Balances', () => {
  const mockPlants: PlantDto[] = [
    {
      id: 'plant-1',
      zoneId: 'zone-1',
      gardenId: 'garden-1',
      plantTypeId: 'type-cucumber',
      name: 'Огірок джерело',
      variety: null,
      description: null,
      quantity: 5,
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

  const mockHarvests: Array<HarvestDto & { plantName?: string; zoneId?: string; zoneName?: string }> = [
    {
      id: 'h-1',
      plantId: 'plant-1',
      plantName: 'Огірок джерело',
      quantity: '10', // 10 kg harvested
      unit: 'KILOGRAM',
      damagedQuantity: null,
      quality: 'EXCELLENT',
      notes: null,
      quantityGrams: '10000',
      harvestedAt: '2026-07-01T10:00:00Z',
      createdAt: '2026-07-01T10:00:00Z',
      updatedAt: '2026-07-01T10:00:00Z',
      zoneName: 'Грядка 1',
    },
    {
      id: 'h-2',
      plantId: 'plant-1',
      plantName: 'Огірок джерело',
      quantity: '5', // another 5 kg harvested
      unit: 'KILOGRAM',
      damagedQuantity: null,
      quality: 'GOOD',
      notes: null,
      quantityGrams: '5000',
      harvestedAt: '2026-07-05T10:00:00Z',
      createdAt: '2026-07-05T10:00:00Z',
      updatedAt: '2026-07-05T10:00:00Z',
      zoneName: 'Грядка 1',
    },
    {
      id: 'h-3',
      plantId: 'plant-1',
      plantName: 'Огірок джерело',
      quantity: '20', // 20 pieces
      unit: 'PIECE',
      damagedQuantity: null,
      quality: 'GOOD',
      notes: null,
      quantityGrams: null,
      harvestedAt: '2026-07-06T10:00:00Z',
      createdAt: '2026-07-06T10:00:00Z',
      updatedAt: '2026-07-06T10:00:00Z',
      zoneName: 'Грядка 1',
    },
  ];

  it('calculates remaining stock correctly (harvested - used)', () => {
    const usages: HarvestStockUsage[] = [
      {
        id: 'u-1',
        plantId: 'plant-1',
        cropName: 'Огірок джерело',
        quantity: 3, // 3 kg eaten
        unit: 'KILOGRAM',
        reason: 'EATEN',
        usedAt: '2026-07-02T12:00:00Z',
        isLocalOnly: true,
      },
      {
        id: 'u-2',
        plantId: 'plant-1',
        cropName: 'Огірок джерело',
        quantity: 5, // 5 kg preserved
        unit: 'KILOGRAM',
        reason: 'PRESERVED',
        usedAt: '2026-07-06T14:00:00Z',
        isLocalOnly: true,
      },
    ];

    const balances = harvestUsageStore.calculateStockBalances(mockHarvests, mockPlants, usages);

    // KILOGRAM item
    const kgItem = balances.find((b) => b.unit === 'KILOGRAM');
    expect(kgItem).toBeDefined();
    expect(kgItem?.totalHarvested).toBe(15); // 10 + 5
    expect(kgItem?.totalUsed).toBe(8); // 3 + 5
    expect(kgItem?.remaining).toBe(7); // 15 - 8 = 7

    // PIECE item (unaffected by KG usage)
    const pieceItem = balances.find((b) => b.unit === 'PIECE');
    expect(pieceItem).toBeDefined();
    expect(pieceItem?.totalHarvested).toBe(20);
    expect(pieceItem?.totalUsed).toBe(0);
    expect(pieceItem?.remaining).toBe(20);
  });

  it('does not allow remaining balance to drop below 0 when usage exceeds harvest', () => {
    const excessiveUsages: HarvestStockUsage[] = [
      {
        id: 'u-excess',
        plantId: 'plant-1',
        cropName: 'Огірок джерело',
        quantity: 100,
        unit: 'KILOGRAM',
        reason: 'SOLD',
        usedAt: '2026-07-10T12:00:00Z',
        isLocalOnly: true,
      },
    ];

    const balances = harvestUsageStore.calculateStockBalances(mockHarvests, mockPlants, excessiveUsages);
    const kgItem = balances.find((b) => b.unit === 'KILOGRAM');
    expect(kgItem?.remaining).toBe(0);
  });
});
