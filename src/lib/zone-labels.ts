import type { ZoneType } from '@smart-garden/types';

/** Канонічні підписи типів зон (мають збігатися з zoneTypeSchema бекенда). */
export const ZONE_TYPE_LABEL: Record<string, string> = {
  BED: 'Грядка',
  GREENHOUSE: 'Теплиця',
  ORCHARD: 'Сад',
  FLOWERBED: 'Клумба',
  FIELD: 'Відкритий ґрунт',
  OTHER: 'Інше',
};

/** Категорії типів рослин для фільтра каталогу. */
export const PLANT_CATEGORY_LABEL: Record<string, string> = {
  VEGETABLE: 'Овочі',
  FRUIT: 'Фрукти',
  BERRY: 'Ягоди',
  HERB: 'Зелень',
  FLOWER: 'Квіти',
  TREE: 'Дерева',
  SHRUB: 'Кущі',
  OTHER: 'Інше',
};

/** Емодзі-іконки за категорією рослини (для маркерів/каталогу). */
export const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLE: '🥕',
  FRUIT: '🍎',
  BERRY: '🍓',
  HERB: '🌿',
  FLOWER: '🌸',
  TREE: '🌳',
  SHRUB: '🪴',
  OTHER: '🌱',
};

export function zoneTypeLabel(type: ZoneType | string): string {
  return ZONE_TYPE_LABEL[type] ?? type;
}
