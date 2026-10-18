import type { PlantDto, PlantStatus } from '@smart-garden/types';

export type PlantTabKey =
  | 'overview'
  | 'notes'
  | 'harvests'
  | 'problems'
  | 'care'
  | 'photos'
  | 'tasks';

export interface PlantTabItem {
  key: PlantTabKey;
  label: string;
}

export const PLANT_TABS: PlantTabItem[] = [
  { key: 'overview', label: 'Огляд' },
  { key: 'notes', label: 'Нотатки' },
  { key: 'harvests', label: 'Урожай' },
  { key: 'problems', label: 'Проблеми' },
  { key: 'care', label: 'Догляд' },
  { key: 'photos', label: 'Фотографії' },
  { key: 'tasks', label: 'Завдання' },
];

export const PLANT_STATUS_OPTIONS: Array<{
  value: PlantStatus;
  label: string;
  badgeBg: string;
  badgeColor: string;
}> = [
  { value: 'PLANNED', label: 'Заплановано', badgeBg: '#EDF2F7', badgeColor: '#4A5568' },
  { value: 'PLANTED', label: 'Посаджено', badgeBg: '#EBF8FF', badgeColor: '#2B6CB0' },
  { value: 'GROWING', label: 'Росте', badgeBg: '#E6FFFA', badgeColor: '#234E52' },
  { value: 'FLOWERING', label: 'Цвіте', badgeBg: '#FEFCBF', badgeColor: '#744210' },
  { value: 'FRUITING', label: 'Плодоносить', badgeBg: '#FEEBC8', badgeColor: '#7B341E' },
  { value: 'HARVESTING', label: 'Збір урожаю', badgeBg: '#FEE2E2', badgeColor: '#991B1B' },
  { value: 'FINISHED', label: 'Завершено', badgeBg: '#F3F4F6', badgeColor: '#6B7280' },
  { value: 'HAS_PROBLEM', label: 'Є проблема', badgeBg: '#FED7D7', badgeColor: '#9B2C2C' },
];

export function getStatusMeta(status: PlantStatus) {
  const found = PLANT_STATUS_OPTIONS.find((s) => s.value === status);
  return found ?? { value: status, label: status, badgeBg: '#E2E8F0', badgeColor: '#4A5568' };
}

/** Formats date into YYYY-MM-DD string for input/picker */
export function formatDateToYMD(value?: string | Date | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formats date in Ukrainian locale e.g. "17 жовтня 2026" */
export function formatDateUkrainian(value?: string | Date | null, withTime = false): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export interface PlantFormFields {
  name: string;
  variety: string;
  quantity: number;
  plantedAt: string | null;
  status: PlantStatus;
  description: string;
}

/**
 * Checks whether user changed any field in the overview form compared to saved PlantDto.
 */
export function isOverviewDirty(original: PlantDto, current: PlantFormFields): boolean {
  const origName = (original.name ?? '').trim();
  const currName = current.name.trim();
  if (origName !== currName) return true;

  const origVariety = (original.variety ?? '').trim();
  const currVariety = current.variety.trim();
  if (origVariety !== currVariety) return true;

  const origQty = original.quantity ?? 1;
  const currQty = current.quantity;
  if (origQty !== currQty) return true;

  const origStatus = original.status;
  const currStatus = current.status;
  if (origStatus !== currStatus) return true;

  const origPlantedYMD = formatDateToYMD(original.plantedAt);
  const currPlantedYMD = current.plantedAt ? formatDateToYMD(current.plantedAt) : '';
  if (origPlantedYMD !== currPlantedYMD) return true;

  const origDesc = (original.description ?? '').trim();
  const currDesc = current.description.trim();
  if (origDesc !== currDesc) return true;

  return false;
}
