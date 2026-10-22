import type { HarvestDto, PlantDto, ZoneDto } from '@smart-garden/types';
import * as SecureStore from 'expo-secure-store';
import type { HarvestReminderItem } from '../types';

const REMINDER_SETTINGS_KEY = 'sg_harvest_reminder_settings_v1';

export interface HarvestReminderSettings {
  enabled: boolean;
  notifyHour: number; // e.g. 9 for 09:00
  quietHoursStart: number; // e.g. 22
  quietHoursEnd: number; // e.g. 8
  daysThresholdForRepeat: number; // e.g. 7 days
}

const DEFAULT_SETTINGS: HarvestReminderSettings = {
  enabled: true,
  notifyHour: 9,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  daysThresholdForRepeat: 7,
};

let memorySettings: HarvestReminderSettings = { ...DEFAULT_SETTINGS };
let isSettingsLoaded = false;

export async function getHarvestReminderSettings(): Promise<HarvestReminderSettings> {
  if (isSettingsLoaded) return memorySettings;
  try {
    const raw = await SecureStore.getItemAsync(REMINDER_SETTINGS_KEY);
    if (raw) {
      memorySettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  isSettingsLoaded = true;
  return memorySettings;
}

export async function saveHarvestReminderSettings(settings: Partial<HarvestReminderSettings>): Promise<HarvestReminderSettings> {
  memorySettings = { ...memorySettings, ...settings };
  try {
    await SecureStore.setItemAsync(REMINDER_SETTINGS_KEY, JSON.stringify(memorySettings));
  } catch {
    // fallback
  }
  return memorySettings;
}

/**
 * Перевірка, чи поточна година є тихими годинами
 */
export function isInQuietHours(hour: number, quietStart = 22, quietEnd = 8): boolean {
  if (quietStart > quietEnd) {
    // e.g. 22 to 8
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}

/**
 * Визначає список культур, готових до збору урожаю
 */
export function findReadyToHarvestPlants(
  plants: PlantDto[],
  zones: ZoneDto[],
  harvests: HarvestDto[],
  today = new Date(),
): HarvestReminderItem[] {
  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  const lastHarvestByPlant = new Map<string, Date>();

  for (const h of harvests) {
    const hDate = new Date(h.harvestedAt);
    const existing = lastHarvestByPlant.get(h.plantId);
    if (!existing || hDate > existing) {
      lastHarvestByPlant.set(h.plantId, hDate);
    }
  }

  const results: HarvestReminderItem[] = [];

  for (const plant of plants) {
    const zone = zoneMap.get(plant.zoneId);
    const zoneName = zone?.name ?? 'Грядка';
    const lastHarvest = lastHarvestByPlant.get(plant.id);
    let daysSinceLast: number | undefined;

    if (lastHarvest) {
      const diffMs = today.getTime() - lastHarvest.getTime();
      daysSinceLast = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    // 1. Статус HARVESTING - найвищий пріоритет
    if (plant.status === 'HARVESTING') {
      const msg = daysSinceLast !== undefined && daysSinceLast > 0
        ? `Минуло ${daysSinceLast} дн. від останнього збору на «${zoneName}»`
        : `Рослина у стадії активного збору на «${zoneName}»`;

      results.push({
        plantId: plant.id,
        plantName: plant.name,
        variety: plant.variety,
        zoneId: plant.zoneId,
        zoneName,
        status: plant.status,
        daysSinceLastHarvest: daysSinceLast,
        urgency: daysSinceLast && daysSinceLast >= 5 ? 'HIGH' : 'MEDIUM',
        message: msg,
      });
      continue;
    }

    // 2. Статус FRUITING - плоди дозрівають
    if (plant.status === 'FRUITING') {
      results.push({
        plantId: plant.id,
        plantName: plant.name,
        variety: plant.variety,
        zoneId: plant.zoneId,
        zoneName,
        status: plant.status,
        daysSinceLastHarvest: daysSinceLast,
        urgency: 'NORMAL',
        message: `Плодоношення на «${zoneName}» — перевірте стиглість плодів`,
      });
      continue;
    }

    // 3. Запланована дата збору (expectedHarvestAt)
    if (plant.expectedHarvestAt) {
      const expDate = new Date(plant.expectedHarvestAt);
      const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 5 && diffDays >= -14) {
        results.push({
          plantId: plant.id,
          plantName: plant.name,
          variety: plant.variety,
          zoneId: plant.zoneId,
          zoneName,
          status: plant.status,
          expectedDate: plant.expectedHarvestAt,
          urgency: diffDays <= 0 ? 'HIGH' : 'NORMAL',
          message: diffDays <= 0
            ? `Очікуваний строк збору настав на «${zoneName}»`
            : `Збір очікується через ${diffDays} дн. на «${zoneName}»`,
        });
      }
    }
  }

  // Сортуємо: спочатку HIGH, потім MEDIUM, потім NORMAL
  const urgencyWeight = { HIGH: 3, MEDIUM: 2, NORMAL: 1 };
  return results.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);
}

/**
 * Перевіряє, чи є в зоні культури, готові до збору (для бейджа картки зони)
 */
export function hasZoneHarvestablePlants(zoneId: string, plants: PlantDto[]): boolean {
  return plants.some((p) => p.zoneId === zoneId && (p.status === 'HARVESTING' || p.status === 'FRUITING'));
}
