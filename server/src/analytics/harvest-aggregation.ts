/** Pure harvest aggregation helpers (unit-safe: mass / pieces / liters stay separate). */

export type HarvestUnit = 'GRAM' | 'KILOGRAM' | 'PIECE' | 'LITER';

export type HarvestRow = {
  harvestedAt: Date;
  quantity: string | number;
  unit: HarvestUnit;
  quantityGrams?: string | number | null;
};

export type SeriesPoint = {
  period: string;
  total: string;
  unit: 'GRAM' | 'PIECE' | 'LITER';
};

export function gramsFromHarvest(
  row: Pick<HarvestRow, 'quantity' | 'unit' | 'quantityGrams'>,
): number {
  if (row.quantityGrams != null && row.quantityGrams !== '') {
    return Number(row.quantityGrams);
  }
  const qty = Number(row.quantity);
  return row.unit === 'KILOGRAM' ? qty * 1000 : qty;
}

export function aggregateHarvestSeries(harvests: HarvestRow[]): {
  harvestByMassGrams: SeriesPoint[];
  harvestByPieces: SeriesPoint[];
  harvestByLiters: SeriesPoint[];
} {
  const massMap = new Map<string, number>();
  const pieceMap = new Map<string, number>();
  const literMap = new Map<string, number>();

  for (const row of harvests) {
    const period = row.harvestedAt.toISOString().slice(0, 7);
    if (row.unit === 'GRAM' || row.unit === 'KILOGRAM') {
      massMap.set(period, (massMap.get(period) ?? 0) + gramsFromHarvest(row));
    } else if (row.unit === 'PIECE') {
      pieceMap.set(period, (pieceMap.get(period) ?? 0) + Number(row.quantity));
    } else if (row.unit === 'LITER') {
      literMap.set(period, (literMap.get(period) ?? 0) + Number(row.quantity));
    }
  }

  return {
    harvestByMassGrams: [...massMap.entries()].map(([period, total]) => ({
      period,
      total: String(total),
      unit: 'GRAM' as const,
    })),
    harvestByPieces: [...pieceMap.entries()].map(([period, total]) => ({
      period,
      total: String(total),
      unit: 'PIECE' as const,
    })),
    harvestByLiters: [...literMap.entries()].map(([period, total]) => ({
      period,
      total: String(total),
      unit: 'LITER' as const,
    })),
  };
}
