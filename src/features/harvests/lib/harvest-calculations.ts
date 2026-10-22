import type { HarvestDto, PlantDto, ZoneDto } from '@smart-garden/types';
import type { SeasonComparisonResult, ZoneYieldStat } from '../types';

export interface HarvestMonthlyPoint {
  period: string; // "2026-04"
  monthLabel: string; // "Кві"
  monthIndex: number;
  massKg: number;
  pieces: number;
  liters: number;
}

export const UKRAINIAN_MONTHS = [
  { key: '04', label: 'Кві', index: 3 },
  { key: '05', label: 'Тра', index: 4 },
  { key: '06', label: 'Чер', index: 5 },
  { key: '07', label: 'Лип', index: 6 },
  { key: '08', label: 'Сер', index: 7 },
  { key: '09', label: 'Вер', index: 8 },
  { key: '10', label: 'Жов', index: 9 },
] as const;

/**
 * Перетворює кількість у кілограми (якщо одиниця KILOGRAM або GRAM)
 */
export function convertToKg(quantity: number | string, unit: string): number | null {
  const num = typeof quantity === 'number' ? quantity : parseFloat(quantity);
  if (isNaN(num)) return 0;
  if (unit === 'KILOGRAM') return num;
  if (unit === 'GRAM') return num / 1000;
  return null;
}

/**
 * Розрахунок відсоткової різниці
 */
export function calculatePercentageDiff(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const diff = ((current - previous) / previous) * 100;
  return Math.round(diff * 10) / 10;
}

/**
 * Отримує всі доступні роки з масиву зборів
 */
export function getAvailableHarvestYears(harvests: HarvestDto[]): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  years.add(currentYear);

  for (const h of harvests) {
    const yr = new Date(h.harvestedAt).getFullYear();
    if (!isNaN(yr)) years.add(yr);
  }

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Порівняння двох сезонів (років)
 */
export function compareHarvestSeasons(
  harvests: Array<HarvestDto & { plantName?: string; zoneId?: string }>,
  zones: ZoneDto[],
  plants: PlantDto[],
  currentYear: number,
  previousYear = currentYear - 1,
): SeasonComparisonResult {
  const plantMap = new Map(plants.map((p) => [p.id, p]));
  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  let currentMass = 0;
  let previousMass = 0;
  let currentPieces = 0;
  let previousPieces = 0;
  let currentLiters = 0;
  let previousLiters = 0;

  const currentCropMap = new Map<string, { quantity: number; unit: string; massKg: number }>();
  const zoneYieldMap = new Map<string, { totalKg: number }>();

  for (const h of harvests) {
    const d = new Date(h.harvestedAt);
    const yr = d.getFullYear();
    const qty = Number(h.quantity) || 0;
    const kg = convertToKg(qty, h.unit);
    const plant = plantMap.get(h.plantId);
    const cropName = h.plantName ?? plant?.name ?? 'Урожай';
    const zoneId = plant?.zoneId ?? h.zoneId;

    if (yr === currentYear) {
      if (kg !== null) currentMass += kg;
      if (h.unit === 'PIECE') currentPieces += qty;
      if (h.unit === 'LITER') currentLiters += qty;

      // Top crops in current season
      const cropKey = `${cropName}__${h.unit}`;
      if (!currentCropMap.has(cropKey)) {
        currentCropMap.set(cropKey, { quantity: 0, unit: h.unit, massKg: 0 });
      }
      const cEntry = currentCropMap.get(cropKey)!;
      cEntry.quantity += qty;
      if (kg !== null) cEntry.massKg += kg;

      // Zone yield
      if (zoneId) {
        if (!zoneYieldMap.has(zoneId)) {
          zoneYieldMap.set(zoneId, { totalKg: 0 });
        }
        if (kg !== null) {
          zoneYieldMap.get(zoneId)!.totalKg += kg;
        }
      }
    } else if (yr === previousYear) {
      if (kg !== null) previousMass += kg;
      if (h.unit === 'PIECE') previousPieces += qty;
      if (h.unit === 'LITER') previousLiters += qty;
    }
  }

  // Top crops list
  const topCrops = Array.from(currentCropMap.entries())
    .map(([key, data]) => {
      const name = key.split('__')[0];
      return {
        name,
        quantity: Math.round(data.quantity * 10) / 10,
        unit: data.unit as HarvestDto['unit'],
        massKg: data.massKg > 0 ? Math.round(data.massKg * 10) / 10 : undefined,
      };
    })
    .sort((a, b) => (b.massKg ?? b.quantity) - (a.massKg ?? a.quantity))
    .slice(0, 5);

  // Best & worst zones by kg/m2
  let bestZone: SeasonComparisonResult['bestZone'] = null;
  let worstZone: SeasonComparisonResult['worstZone'] = null;

  const validZoneYields: Array<{ id: string; name: string; yieldKgPerM2: number; totalKg: number }> = [];

  for (const [zoneId, data] of zoneYieldMap.entries()) {
    const zone = zoneMap.get(zoneId);
    if (!zone) continue;
    const area = Number(zone.area) || 0;
    const yieldKgPerM2 = area > 0 ? data.totalKg / area : 0;
    validZoneYields.push({
      id: zoneId,
      name: zone.name,
      yieldKgPerM2: Math.round(yieldKgPerM2 * 100) / 100,
      totalKg: Math.round(data.totalKg * 10) / 10,
    });
  }

  if (validZoneYields.length > 0) {
    validZoneYields.sort((a, b) => b.yieldKgPerM2 - a.yieldKgPerM2);
    bestZone = validZoneYields[0];
    worstZone = validZoneYields.length > 1 ? validZoneYields[validZoneYields.length - 1] : null;
  }

  return {
    currentSeasonYear: currentYear,
    previousSeasonYear: previousYear,
    currentTotalMassKg: Math.round(currentMass * 10) / 10,
    previousTotalMassKg: Math.round(previousMass * 10) / 10,
    massDiffKg: Math.round((currentMass - previousMass) * 10) / 10,
    massDiffPercent: calculatePercentageDiff(currentMass, previousMass),
    currentTotalPieces: Math.round(currentPieces),
    previousTotalPieces: Math.round(previousPieces),
    piecesDiff: Math.round(currentPieces - previousPieces),
    piecesDiffPercent: calculatePercentageDiff(currentPieces, previousPieces),
    currentTotalLiters: Math.round(currentLiters * 10) / 10,
    previousTotalLiters: Math.round(previousLiters * 10) / 10,
    litersDiff: Math.round((currentLiters - previousLiters) * 10) / 10,
    litersDiffPercent: calculatePercentageDiff(currentLiters, previousLiters),
    topCrops,
    bestZone,
    worstZone,
  };
}

/**
 * Розраховує врожайність за кожною зоною (кг/м²)
 */
export function calculateZoneYieldStats(
  harvests: Array<HarvestDto & { zoneId?: string }>,
  zones: ZoneDto[],
  plants: PlantDto[],
  year?: number,
): ZoneYieldStat[] {
  const plantMap = new Map(plants.map((p) => [p.id, p]));
  const zoneStats = new Map<string, { totalKg: number; plantIds: Set<string> }>();

  for (const z of zones) {
    zoneStats.set(z.id, { totalKg: 0, plantIds: new Set() });
  }

  for (const h of harvests) {
    if (year) {
      const hYear = new Date(h.harvestedAt).getFullYear();
      if (hYear !== year) continue;
    }

    const plant = plantMap.get(h.plantId);
    const zoneId = plant?.zoneId ?? h.zoneId;
    if (!zoneId || !zoneStats.has(zoneId)) continue;

    const qty = Number(h.quantity) || 0;
    const kg = convertToKg(qty, h.unit);
    if (kg !== null) {
      const stat = zoneStats.get(zoneId)!;
      stat.totalKg += kg;
      if (h.plantId) stat.plantIds.add(h.plantId);
    }
  }

  return zones.map((z) => {
    const area = Number(z.area) || 0;
    const stat = zoneStats.get(z.id) ?? { totalKg: 0, plantIds: new Set() };
    const yieldKgPerM2 = area > 0 ? stat.totalKg / area : 0;

    return {
      zoneId: z.id,
      zoneName: z.name,
      areaM2: area,
      totalMassKg: Math.round(stat.totalKg * 10) / 10,
      yieldKgPerM2: Math.round(yieldKgPerM2 * 100) / 100,
      cropsCount: stat.plantIds.size,
    };
  }).sort((a, b) => b.yieldKgPerM2 - a.yieldKgPerM2);
}

/**
 * Будує помісячну серію (Квітень - Жовтень) для графіків
 */
export function buildMonthlySeries(
  harvests: HarvestDto[],
  year: number,
): HarvestMonthlyPoint[] {
  const monthlyMap = new Map<string, { massKg: number; pieces: number; liters: number }>();

  for (const m of UKRAINIAN_MONTHS) {
    const key = `${year}-${m.key}`;
    monthlyMap.set(key, { massKg: 0, pieces: 0, liters: 0 });
  }

  for (const h of harvests) {
    const d = new Date(h.harvestedAt);
    if (d.getFullYear() !== year) continue;

    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${monthStr}`;
    const entry = monthlyMap.get(key);
    if (!entry) continue;

    const qty = Number(h.quantity) || 0;
    const kg = convertToKg(qty, h.unit);
    if (kg !== null) entry.massKg += kg;
    if (h.unit === 'PIECE') entry.pieces += qty;
    if (h.unit === 'LITER') entry.liters += qty;
  }

  return UKRAINIAN_MONTHS.map((m) => {
    const key = `${year}-${m.key}`;
    const data = monthlyMap.get(key)!;
    return {
      period: key,
      monthLabel: m.label,
      monthIndex: m.index,
      massKg: Math.round(data.massKg * 10) / 10,
      pieces: Math.round(data.pieces),
      liters: Math.round(data.liters * 10) / 10,
    };
  });
}
