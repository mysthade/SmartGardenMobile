import { aggregateHarvestSeries, gramsFromHarvest } from './harvest-aggregation';

describe('harvest aggregation', () => {
  it('converts kilograms to grams and keeps series separate', () => {
    expect(gramsFromHarvest({ quantity: 2, unit: 'KILOGRAM' })).toBe(2000);
    expect(gramsFromHarvest({ quantity: 500, unit: 'GRAM' })).toBe(500);
    expect(gramsFromHarvest({ quantity: 1, unit: 'KILOGRAM', quantityGrams: 999 })).toBe(999);

    const series = aggregateHarvestSeries([
      {
        harvestedAt: new Date('2026-05-10T12:00:00.000Z'),
        quantity: 1.5,
        unit: 'KILOGRAM',
        quantityGrams: 1500,
      },
      {
        harvestedAt: new Date('2026-05-12T12:00:00.000Z'),
        quantity: 250,
        unit: 'GRAM',
      },
      {
        harvestedAt: new Date('2026-05-12T12:00:00.000Z'),
        quantity: 12,
        unit: 'PIECE',
      },
      {
        harvestedAt: new Date('2026-06-01T12:00:00.000Z'),
        quantity: 3,
        unit: 'LITER',
      },
    ]);

    expect(series.harvestByMassGrams).toEqual([{ period: '2026-05', total: '1750', unit: 'GRAM' }]);
    expect(series.harvestByPieces).toEqual([{ period: '2026-05', total: '12', unit: 'PIECE' }]);
    expect(series.harvestByLiters).toEqual([{ period: '2026-06', total: '3', unit: 'LITER' }]);
  });
});
