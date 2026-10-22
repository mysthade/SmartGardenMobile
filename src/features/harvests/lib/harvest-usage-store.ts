import * as SecureStore from 'expo-secure-store';
import type { HarvestStockUsage, StockUsageReason, CropStockBalance } from '../types';
import type { HarvestDto, PlantDto } from '@smart-garden/types';

const STOCK_USAGE_STORAGE_KEY = 'sg_harvest_stock_usage_v1';

export const STOCK_USAGE_REASONS: Array<{ value: StockUsageReason; label: string; icon: string; color: string }> = [
  { value: 'EATEN', label: "З'їли", icon: '🍽️', color: '#27AE60' },
  { value: 'PRESERVED', label: 'Законсервували', icon: '🥫', color: '#2980B9' },
  { value: 'SOLD', label: 'Продали', icon: '💰', color: '#8E44AD' },
  { value: 'GIVEN', label: 'Віддали', icon: '🎁', color: '#E67E22' },
  { value: 'SPOILED', label: 'Зіпсувалось', icon: '🗑️', color: '#E74C3C' },
];

export function getUsageReasonLabel(reason: StockUsageReason): string {
  const found = STOCK_USAGE_REASONS.find((r) => r.value === reason);
  return found?.label ?? reason;
}

let memoryUsages: HarvestStockUsage[] = [];
let isLoaded = false;

async function loadUsages(): Promise<HarvestStockUsage[]> {
  if (isLoaded) return memoryUsages;
  try {
    const raw = await SecureStore.getItemAsync(STOCK_USAGE_STORAGE_KEY);
    if (raw) {
      memoryUsages = JSON.parse(raw) as HarvestStockUsage[];
    }
  } catch {
    // fallback
  }
  isLoaded = true;
  return memoryUsages;
}

async function persistUsages(): Promise<void> {
  try {
    await SecureStore.setItemAsync(STOCK_USAGE_STORAGE_KEY, JSON.stringify(memoryUsages));
  } catch {
    // memory remains
  }
}

export const harvestUsageStore = {
  async listUsages(): Promise<HarvestStockUsage[]> {
    return loadUsages();
  },

  async recordUsage(usage: Omit<HarvestStockUsage, 'id' | 'isLocalOnly'>): Promise<HarvestStockUsage> {
    await loadUsages();
    const newUsage: HarvestStockUsage = {
      ...usage,
      id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isLocalOnly: true,
    };
    memoryUsages = [newUsage, ...memoryUsages];
    await persistUsages();
    return newUsage;
  },

  async deleteUsage(usageId: string): Promise<void> {
    await loadUsages();
    memoryUsages = memoryUsages.filter((u) => u.id !== usageId);
    await persistUsages();
  },

  /**
   * Обчислює баланс запасів за культурами та одиницями виміру
   */
  calculateStockBalances(
    harvests: Array<HarvestDto & { plantName?: string; zoneId?: string; zoneName?: string }>,
    plants: PlantDto[],
    usages: HarvestStockUsage[],
  ): CropStockBalance[] {
    const plantMap = new Map(plants.map((p) => [p.id, p]));
    // Групуємо за [cropName, unit]
    const map = new Map<string, CropStockBalance>();

    for (const h of harvests) {
      const plant = plantMap.get(h.plantId);
      const cropName = h.plantName ?? plant?.name ?? 'Невідома культура';
      const unit = h.unit;
      const key = `${cropName.trim().toLowerCase()}__${unit}`;
      const qty = Number(h.quantity) || 0;

      if (!map.has(key)) {
        map.set(key, {
          plantName: cropName,
          plantTypeId: plant?.plantTypeId,
          unit,
          totalHarvested: 0,
          totalUsed: 0,
          remaining: 0,
          lastHarvestDate: null,
          zoneIds: [],
          zoneNames: [],
          plantIds: [],
        });
      }

      const entry = map.get(key)!;
      entry.totalHarvested += qty;
      if (!entry.lastHarvestDate || new Date(h.harvestedAt) > new Date(entry.lastHarvestDate)) {
        entry.lastHarvestDate = h.harvestedAt;
      }
      if (h.plantId && !entry.plantIds.includes(h.plantId)) {
        entry.plantIds.push(h.plantId);
      }
      if (plant?.zoneId && !entry.zoneIds.includes(plant.zoneId)) {
        entry.zoneIds.push(plant.zoneId);
      }
      if (h.zoneName && !entry.zoneNames.includes(h.zoneName)) {
        entry.zoneNames.push(h.zoneName);
      }
    }

    // Додаємо списання/використання
    for (const u of usages) {
      const key = `${u.cropName.trim().toLowerCase()}__${u.unit}`;
      if (map.has(key)) {
        map.get(key)!.totalUsed += u.quantity;
      } else {
        // Запас без зафіксованого збору в поточному завантаженні
        map.set(key, {
          plantName: u.cropName,
          unit: u.unit,
          totalHarvested: 0,
          totalUsed: u.quantity,
          remaining: 0,
          lastHarvestDate: null,
          zoneIds: u.zoneId ? [u.zoneId] : [],
          zoneNames: [],
          plantIds: [u.plantId],
        });
      }
    }

    // Рахуємо залишок
    for (const balance of map.values()) {
      balance.remaining = Math.max(0, balance.totalHarvested - balance.totalUsed);
      // Округлення до 3 знаків
      balance.totalHarvested = Math.round(balance.totalHarvested * 1000) / 1000;
      balance.totalUsed = Math.round(balance.totalUsed * 1000) / 1000;
      balance.remaining = Math.round(balance.remaining * 1000) / 1000;
    }

    return Array.from(map.values()).sort((a, b) => b.remaining - a.remaining);
  },

  _reset(): void {
    memoryUsages = [];
    isLoaded = false;
  },
};
