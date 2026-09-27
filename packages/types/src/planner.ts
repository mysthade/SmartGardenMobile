export type PlanObjectType =
  | 'HOUSE'
  | 'SHED'
  | 'GAZEBO'
  | 'BBQ'
  | 'GREENHOUSE'
  | 'GARAGE'
  | 'WELL'
  | 'BOREHOLE'
  | 'COMPOSTER'
  | 'POND'
  | 'POOL'
  | 'FENCE'
  | 'GATE'
  | 'PATH'
  | 'TREE'
  | 'BUSH'
  | 'FLOWERBED'
  | 'RAISED_BED'
  | 'LAWN'
  | 'PARKING'
  | 'TOILET'
  | 'CUSTOM';

export type PlanObjectLayer =
  | 'BUILDINGS'
  | 'UTILITIES'
  | 'PLANTS'
  | 'PATHS'
  | 'OTHER';

export type PlanShapeType = 'rect' | 'circle' | 'line';

export interface PlanObjectPreset {
  type: PlanObjectType;
  label: string;
  category: 'buildings' | 'utilities' | 'plants' | 'paths' | 'other';
  layer: PlanObjectLayer;
  defaultWidthCm: number;
  defaultHeightCm: number;
  shape: PlanShapeType;
  defaultColor: string;
  description: string;
  iconName: string;
}

/**
 * Бібліотека стандартних пресетів об'єктів для планувальника (розміри в сантиметрах).
 */
export const PLAN_OBJECT_PRESETS: Record<PlanObjectType, PlanObjectPreset> = {
  GAZEBO: {
    type: 'GAZEBO',
    label: 'Альтанка',
    category: 'buildings',
    layer: 'BUILDINGS',
    defaultWidthCm: 300,
    defaultHeightCm: 300,
    shape: 'rect',
    defaultColor: '#d97706',
    description: 'Деревʼяна або металева садова альтанка 3×3 м',
    iconName: 'Tent',
  },
  BBQ: {
    type: 'BBQ',
    label: 'Мангал / Барбекю',
    category: 'utilities',
    layer: 'UTILITIES',
    defaultWidthCm: 100,
    defaultHeightCm: 60,
    shape: 'rect',
    defaultColor: '#dc2626',
    description: 'Зона приготування шашлику та барбекю 1×0.6 м',
    iconName: 'Flame',
  },
  HOUSE: {
    type: 'HOUSE',
    label: 'Житловий будинок',
    category: 'buildings',
    layer: 'BUILDINGS',
    defaultWidthCm: 800,
    defaultHeightCm: 600,
    shape: 'rect',
    defaultColor: '#c0653a',
    description: 'Основний житловий будинок або котедж 8×6 м',
    iconName: 'Home',
  },
  SHED: {
    type: 'SHED',
    label: 'Сарай / Госпблок',
    category: 'buildings',
    layer: 'BUILDINGS',
    defaultWidthCm: 300,
    defaultHeightCm: 200,
    shape: 'rect',
    defaultColor: '#8d6e63',
    description: 'Приміщення для інвентарю та інструментів 3×2 м',
    iconName: 'Warehouse',
  },
  GREENHOUSE: {
    type: 'GREENHOUSE',
    label: 'Теплиця',
    category: 'buildings',
    layer: 'BUILDINGS',
    defaultWidthCm: 300,
    defaultHeightCm: 600,
    shape: 'rect',
    defaultColor: '#0284c7',
    description: 'Теплиця з полікарбонату чи скла 3×6 м',
    iconName: 'Sun',
  },
  GARAGE: {
    type: 'GARAGE',
    label: 'Гараж',
    category: 'buildings',
    layer: 'BUILDINGS',
    defaultWidthCm: 400,
    defaultHeightCm: 600,
    shape: 'rect',
    defaultColor: '#64748b',
    description: 'Гараж або крите паркомісце 4×6 м',
    iconName: 'Car',
  },
  WELL: {
    type: 'WELL',
    label: 'Колодязь',
    category: 'utilities',
    layer: 'UTILITIES',
    defaultWidthCm: 100,
    defaultHeightCm: 100,
    shape: 'circle',
    defaultColor: '#0ea5e9',
    description: 'Колодязь питної води діаметром 1 м',
    iconName: 'CircleDot',
  },
  BOREHOLE: {
    type: 'BOREHOLE',
    label: 'Свердловина / Кран',
    category: 'utilities',
    layer: 'UTILITIES',
    defaultWidthCm: 60,
    defaultHeightCm: 60,
    shape: 'circle',
    defaultColor: '#0284c7',
    description: 'Точка водопостачання або свердловина 60×60 см',
    iconName: 'Droplets',
  },
  COMPOSTER: {
    type: 'COMPOSTER',
    label: 'Компостер',
    category: 'utilities',
    layer: 'UTILITIES',
    defaultWidthCm: 120,
    defaultHeightCm: 120,
    shape: 'rect',
    defaultColor: '#65a30d',
    description: 'Ящик для компосту 1.2×1.2 м',
    iconName: 'Recycle',
  },
  POND: {
    type: 'POND',
    label: 'Ставок / Водойма',
    category: 'utilities',
    layer: 'UTILITIES',
    defaultWidthCm: 400,
    defaultHeightCm: 300,
    shape: 'circle',
    defaultColor: '#0284c7',
    description: 'Декоративний ставок або водойма 4×3 м',
    iconName: 'Waves',
  },
  POOL: {
    type: 'POOL',
    label: 'Басейн',
    category: 'utilities',
    layer: 'UTILITIES',
    defaultWidthCm: 300,
    defaultHeightCm: 600,
    shape: 'rect',
    defaultColor: '#06b6d4',
    description: 'Плавальний басейн 3×6 м',
    iconName: 'Sparkles',
  },
  FENCE: {
    type: 'FENCE',
    label: 'Паркан / Огорожа',
    category: 'paths',
    layer: 'PATHS',
    defaultWidthCm: 500,
    defaultHeightCm: 25,
    shape: 'rect',
    defaultColor: '#78716c',
    description: 'Секція огорожі 5×0.25 м',
    iconName: 'Fence',
  },
  GATE: {
    type: 'GATE',
    label: 'Хвіртка / Ворота',
    category: 'paths',
    layer: 'PATHS',
    defaultWidthCm: 120,
    defaultHeightCm: 25,
    shape: 'rect',
    defaultColor: '#a8a29e',
    description: 'Вхідна хвіртка чи вʼїзні ворота 1.2 м',
    iconName: 'DoorClosed',
  },
  PATH: {
    type: 'PATH',
    label: 'Доріжка',
    category: 'paths',
    layer: 'PATHS',
    defaultWidthCm: 300,
    defaultHeightCm: 80,
    shape: 'rect',
    defaultColor: '#d6d3d1',
    description: 'Садова доріжка з бруківки чи гравію 3×0.8 м',
    iconName: 'Footprints',
  },
  TREE: {
    type: 'TREE',
    label: 'Дерево (крона)',
    category: 'plants',
    layer: 'PLANTS',
    defaultWidthCm: 400,
    defaultHeightCm: 400,
    shape: 'circle',
    defaultColor: '#16a34a',
    description: 'Плодове або декоративне дерево з кроною 4 м',
    iconName: 'TreeDeciduous',
  },
  BUSH: {
    type: 'BUSH',
    label: 'Кущ / Ягідник',
    category: 'plants',
    layer: 'PLANTS',
    defaultWidthCm: 150,
    defaultHeightCm: 150,
    shape: 'circle',
    defaultColor: '#22c55e',
    description: 'Ягідний або декоративний кущ діаметром 1.5 м',
    iconName: 'Flower2',
  },
  FLOWERBED: {
    type: 'FLOWERBED',
    label: 'Клумба',
    category: 'plants',
    layer: 'PLANTS',
    defaultWidthCm: 200,
    defaultHeightCm: 100,
    shape: 'rect',
    defaultColor: '#ec4899',
    description: 'Квіткова клумба 2×1 м',
    iconName: 'Flower',
  },
  RAISED_BED: {
    type: 'RAISED_BED',
    label: 'Піднята грядка',
    category: 'plants',
    layer: 'PLANTS',
    defaultWidthCm: 100,
    defaultHeightCm: 300,
    shape: 'rect',
    defaultColor: '#854d0e',
    description: 'Деревʼяна або камʼяна тепла грядка 1×3 м',
    iconName: 'Boxes',
  },
  LAWN: {
    type: 'LAWN',
    label: 'Газон / Лужок',
    category: 'plants',
    layer: 'PLANTS',
    defaultWidthCm: 500,
    defaultHeightCm: 400,
    shape: 'rect',
    defaultColor: '#4ade80',
    description: 'Зона зеленого газону 5×4 м',
    iconName: 'Trees',
  },
  PARKING: {
    type: 'PARKING',
    label: 'Паркомісце',
    category: 'paths',
    layer: 'PATHS',
    defaultWidthCm: 250,
    defaultHeightCm: 500,
    shape: 'rect',
    defaultColor: '#94a3b8',
    description: 'Паркувальне місце для авто 2.5×5 м',
    iconName: 'SquareParking',
  },
  TOILET: {
    type: 'TOILET',
    label: 'Вуличний санвузол',
    category: 'buildings',
    layer: 'BUILDINGS',
    defaultWidthCm: 120,
    defaultHeightCm: 120,
    shape: 'rect',
    defaultColor: '#a16207',
    description: 'Садовий душ або вбиральня 1.2×1.2 м',
    iconName: 'Bath',
  },
  CUSTOM: {
    type: 'CUSTOM',
    label: 'Власний обʼєкт',
    category: 'other',
    layer: 'OTHER',
    defaultWidthCm: 200,
    defaultHeightCm: 200,
    shape: 'rect',
    defaultColor: '#71717a',
    description: 'Довільний обʼєкт із настроюваними параметрами',
    iconName: 'Box',
  },
};

export interface PlanObjectDto {
  id: string;
  planId: string;
  type: PlanObjectType;
  label: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  rotationDeg: number;
  zIndex: number;
  layer: PlanObjectLayer;
  color: string | null;
  locked: boolean;
  meta: Record<string, unknown> | null;
  zoneId: string | null;
  plantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GardenPlanDto {
  id: string;
  gardenId: string;
  name: string;
  widthCm: number;
  heightCm: number;
  boundary: Array<{ xCm: number; yCm: number }> | null;
  northAngleDeg: number;
  gridSizeCm: number;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GardenPlanDetailsDto extends GardenPlanDto {
  objects: PlanObjectDto[];
}

export interface CreateGardenPlanDto {
  name?: string;
  widthCm: number;
  heightCm: number;
  boundary?: Array<{ xCm: number; yCm: number }> | null;
  northAngleDeg?: number;
  gridSizeCm?: number;
  isActive?: boolean;
}

export interface UpdateGardenPlanDto {
  name?: string;
  widthCm?: number;
  heightCm?: number;
  boundary?: Array<{ xCm: number; yCm: number }> | null;
  northAngleDeg?: number;
  gridSizeCm?: number;
  version?: number;
  isActive?: boolean;
}

export interface PlanObjectOperationDto {
  op?: 'upsert' | 'delete';
  id?: string;
  clientId?: string;
  type?: PlanObjectType;
  label?: string;
  xCm?: number;
  yCm?: number;
  widthCm?: number;
  heightCm?: number;
  rotationDeg?: number;
  zIndex?: number;
  layer?: PlanObjectLayer;
  color?: string | null;
  locked?: boolean;
  meta?: Record<string, unknown> | null;
  zoneId?: string | null;
  plantId?: string | null;
}

export interface BatchPlanObjectsDto {
  version: number;
  planUpdate?: Partial<UpdateGardenPlanDto>;
  objects: PlanObjectOperationDto[];
}

export interface SaveGardenPlanResponse {
  plan: GardenPlanDetailsDto;
  idMap: Record<string, string>;
}
