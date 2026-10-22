import type { HarvestQuality, HarvestUnit } from '@smart-garden/types';
import * as SecureStore from 'expo-secure-store';

const LAST_UNIT_PREFIX = 'sg_last_unit_';
const memoryLastUnits = new Map<string, HarvestUnit>();

export const HARVEST_UNIT_OPTIONS: Array<{ value: HarvestUnit; label: string; short: string }> = [
  { value: 'KILOGRAM', label: 'Кілограми', short: 'кг' },
  { value: 'PIECE', label: 'Штуки', short: 'шт' },
  { value: 'GRAM', label: 'Грами', short: 'г' },
  { value: 'LITER', label: 'Літри', short: 'л' },
];

export const HARVEST_QUALITY_OPTIONS: Array<{ value: HarvestQuality; label: string; color: string }> = [
  { value: 'EXCELLENT', label: 'Відмінна', color: '#27AE60' },
  { value: 'GOOD', label: 'Добра', color: '#2980B9' },
  { value: 'AVERAGE', label: 'Звичайна', color: '#F39C12' },
  { value: 'POOR', label: 'Низька', color: '#E74C3C' },
];

export function getUnitShortLabel(unit: HarvestUnit): string {
  switch (unit) {
    case 'KILOGRAM':
      return 'кг';
    case 'GRAM':
      return 'г';
    case 'PIECE':
      return 'шт';
    case 'LITER':
      return 'л';
    default:
      return unit;
  }
}

export function getQualityLabel(quality: HarvestQuality): string {
  switch (quality) {
    case 'EXCELLENT':
      return 'Відмінна';
    case 'GOOD':
      return 'Добра';
    case 'AVERAGE':
      return 'Звичайна';
    case 'POOR':
      return 'Низька';
    default:
      return quality;
  }
}

/**
 * Отримує рекомендований крок для степпера залежно від одиниці виміру
 */
export function getStepperStep(unit: HarvestUnit): number {
  switch (unit) {
    case 'KILOGRAM':
      return 0.5;
    case 'LITER':
      return 0.5;
    case 'GRAM':
      return 100;
    case 'PIECE':
    default:
      return 1;
  }
}

/**
 * Отримує початкове значення для кількості
 */
export function getDefaultInitialQuantity(unit: HarvestUnit): number {
  switch (unit) {
    case 'GRAM':
      return 500;
    case 'KILOGRAM':
    case 'LITER':
    case 'PIECE':
    default:
      return 1;
  }
}

/**
 * Запам'ятовування останньої одиниці для культури
 */
export async function getRememberedUnit(cropNameOrId: string): Promise<HarvestUnit> {
  const normalizedKey = cropNameOrId.trim().toLowerCase();
  const mem = memoryLastUnits.get(normalizedKey);
  if (mem) return mem;

  try {
    const stored = await SecureStore.getItemAsync(`${LAST_UNIT_PREFIX}${encodeURIComponent(normalizedKey)}`);
    if (stored && (stored === 'KILOGRAM' || stored === 'GRAM' || stored === 'PIECE' || stored === 'LITER')) {
      memoryLastUnits.set(normalizedKey, stored as HarvestUnit);
      return stored as HarvestUnit;
    }
  } catch {
    // secure store unavailable or web
  }
  return 'KILOGRAM';
}

export async function rememberLastUnit(cropNameOrId: string, unit: HarvestUnit): Promise<void> {
  const normalizedKey = cropNameOrId.trim().toLowerCase();
  memoryLastUnits.set(normalizedKey, unit);
  try {
    await SecureStore.setItemAsync(`${LAST_UNIT_PREFIX}${encodeURIComponent(normalizedKey)}`, unit);
  } catch {
    // fallback to memory
  }
}

/**
 * Перевірка, чи запис без додаткових деталей
 */
export function isRecordWithoutDetails(notes: string | null | undefined): boolean {
  if (!notes) return true;
  const trimmed = notes.trim();
  // Якщо нотатка містить тільки системний тег групування наприклад [batch:...]
  if (!trimmed || /^\[batch:[^\]]+\]$/.test(trimmed)) {
    return true;
  }
  return false;
}
