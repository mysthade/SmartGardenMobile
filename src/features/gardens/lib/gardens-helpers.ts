import type { PlantDto } from '@smart-garden/types';

export const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED: { label: 'Заплановано', color: '#7F8C8D', bg: '#EAEDED' },
  PLANTED: { label: 'Посаджено', color: '#2980B9', bg: '#EBF5FB' },
  GROWING: { label: 'Росте', color: '#27AE60', bg: '#EAFaf1' },
  FLOWERING: { label: 'Цвіте', color: '#8E44AD', bg: '#F4ECF7' },
  FRUITING: { label: 'Плодоносить', color: '#D35400', bg: '#FBEEE6' },
  HARVESTING: { label: 'Збір урожаю', color: '#D68910', bg: '#FEF9E7' },
  FINISHED: { label: 'Завершено', color: '#95A5A6', bg: '#F2F4F4' },
};

/** Канонічні типи зон — мають збігатися з zoneTypeSchema бекенда. */
export const ZONE_TYPE_LABEL: Record<string, string> = {
  BED: 'Грядка',
  GREENHOUSE: 'Теплиця',
  ORCHARD: 'Сад',
  FLOWERBED: 'Клумба',
  FIELD: 'Відкритий ґрунт',
  OTHER: 'Інше',
};

export const ZONE_TYPES = Object.entries(ZONE_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export function genKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function groupPlantsByZone(allPlants: PlantDto[]): Record<string, PlantDto[]> {
  const map: Record<string, PlantDto[]> = {};
  for (const p of allPlants) {
    if (p.zoneId) {
      if (!map[p.zoneId]) map[p.zoneId] = [];
      map[p.zoneId].push(p);
    }
  }
  return map;
}
