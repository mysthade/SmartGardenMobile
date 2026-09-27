export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'DATABASE_UNAVAILABLE'
  | 'STORAGE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
}

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type WeightUnit = 'GRAM' | 'KILOGRAM';
export type AreaUnit = 'SQUARE_METER' | 'HECTARE';
export type PreferredLanguage = 'uk' | 'en';

export type ZoneType = 'BED' | 'GREENHOUSE' | 'ORCHARD' | 'FLOWERBED' | 'FIELD' | 'OTHER';

export type PlantStatus =
  | 'PLANNED'
  | 'PLANTED'
  | 'GROWING'
  | 'FLOWERING'
  | 'FRUITING'
  | 'HARVESTING'
  | 'FINISHED'
  | 'HAS_PROBLEM';

export type JournalEntryType =
  'OBSERVATION' | 'GROWTH' | 'FLOWERING' | 'FRUITING' | 'NOTE' | 'OTHER';

export type HarvestUnit = 'GRAM' | 'KILOGRAM' | 'PIECE' | 'LITER';
export type HarvestQuality = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';

export type ProblemSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProblemStatus = 'DETECTED' | 'MONITORING' | 'TREATING' | 'RESOLVED';

export type CareActivityType =
  | 'WATERING'
  | 'FERTILIZING'
  | 'PRUNING'
  | 'TRANSPLANTING'
  | 'PEST_TREATMENT'
  | 'TYING'
  | 'SOIL_TREATMENT'
  | 'OTHER';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type AttachmentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface UserPublicDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  preferredLanguage: PreferredLanguage;
  preferredWeightUnit: WeightUnit;
  preferredAreaUnit: AreaUnit;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientType = 'web' | 'mobile';

export interface AuthTokensDto {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSessionDto {
  id: string;
  deviceName: string | null;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  current: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface GardenDto {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  locationName: string | null;
  latitude: string | null;
  longitude: string | null;
  area: string | null;
  mapWidth: string | null;
  mapHeight: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneDto {
  id: string;
  gardenId: string;
  name: string;
  type: ZoneType;
  description: string | null;
  area: string | null;
  positionX: string | null;
  positionY: string | null;
  width: string | null;
  height: string | null;
  color: string | null;
  imageUrl: string | null;
  settings: ZoneSettings | null;
  createdAt: string;
  updatedAt: string;
}

export type ZoneSettings =
  | {
      type: 'BED';
      rowCount: number;
      rowDirection: 'horizontal' | 'vertical';
      rowSpacingM: number;
      snapToRows: boolean;
    }
  | {
      type: 'GREENHOUSE';
      innerBedCount: number;
      pathWidthM: number;
      entrance: 'north' | 'south' | 'east' | 'west';
    }
  | {
      type: 'ORCHARD';
      treeSpacingM: number;
      showCanopyRadius: boolean;
    }
  | {
      type: 'FLOWERBED';
      shape: 'rect' | 'ellipse' | 'circle';
      accentColor?: string | null;
    }
  | {
      type: 'FIELD';
      sectorCount: number;
      rowDirection: 'horizontal' | 'vertical';
      rowSpacingM: number;
    }
  | {
      type: 'OTHER';
      shape: 'rect' | 'ellipse';
      fillColor?: string | null;
    };

export type PlantTypeCategory =
  'VEGETABLE' | 'FRUIT' | 'BERRY' | 'HERB' | 'FLOWER' | 'TREE' | 'SHRUB' | 'OTHER';

export interface PlantTypeDto {
  id: string;
  name: string;
  scientificName: string | null;
  description: string | null;
  defaultImageUrl: string | null;
  category: PlantTypeCategory;
  ownerId: string | null;
  iconKey: string | null;
  recommendedMinMoisture: number | null;
  recommendedMaxMoisture: number | null;
  recommendedTemperatureMin: string | null;
  recommendedTemperatureMax: string | null;
  typicalGrowingDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlantDto {
  id: string;
  zoneId: string;
  gardenId: string;
  plantTypeId: string;
  name: string;
  variety: string | null;
  description: string | null;
  quantity: number;
  occupiedArea: string | null;
  positionX: string | null;
  positionY: string | null;
  size: string | null;
  rotation: string | null;
  plantedAt: string | null;
  expectedHarvestAt: string | null;
  finishedAt: string | null;
  status: PlantStatus;
  mainImageUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  plantType?: Pick<PlantTypeDto, 'id' | 'name' | 'scientificName' | 'category' | 'iconKey'>;
  openProblemsCount?: number;
}

export interface BedLayoutPlantDto {
  id: string;
  zoneId: string;
  plantTypeId: string;
  name: string;
  variety: string | null;
  description: string | null;
  quantity: number;
  positionX: string;
  positionY: string;
  size: string;
  rotation: string;
  plantedAt: string | null;
  status: PlantStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  plantType: Pick<PlantTypeDto, 'id' | 'name' | 'scientificName' | 'category' | 'iconKey'>;
  openProblemsCount: number;
}

export interface BedLayoutDto {
  zone: ZoneDto;
  garden: Pick<GardenDto, 'id' | 'name'>;
  plants: BedLayoutPlantDto[];
}

export interface BedLayoutSaveResponse {
  layout: BedLayoutDto;
  idMap: Record<string, string>;
}


export interface JournalEntryDto {
  id: string;
  plantId: string;
  authorId: string;
  type: JournalEntryType;
  title: string;
  description: string | null;
  conditionScore: number | null;
  height: string | null;
  heightUnit: string | null;
  observedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HarvestDto {
  id: string;
  plantId: string;
  harvestedAt: string;
  quantity: string;
  unit: HarvestUnit;
  damagedQuantity: string | null;
  quality: HarvestQuality;
  notes: string | null;
  quantityGrams: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemDto {
  id: string;
  plantId: string;
  title: string;
  description: string | null;
  suspectedCause: string | null;
  severity: ProblemSeverity;
  status: ProblemStatus;
  detectedAt: string;
  resolvedAt: string | null;
  solution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CareActivityDto {
  id: string;
  plantId: string;
  type: CareActivityType;
  performedAt: string;
  quantity: string | null;
  unit: string | null;
  productName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDto {
  id: string;
  userId: string;
  gardenId: string | null;
  zoneId: string | null;
  plantId: string | null;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentDto {
  id: string;
  ownerId: string;
  plantId: string | null;
  journalEntryId: string | null;
  problemId: string | null;
  harvestId: string | null;
  storageKey: string;
  thumbnailKey: string | null;
  originalFileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  status: AttachmentStatus;
  createdAt: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

export interface UploadUrlResponse {
  attachment: AttachmentDto;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface HarvestSeriesPoint {
  period: string;
  total: string;
  unit: 'GRAM' | 'PIECE' | 'LITER';
}

export interface AnalyticsSummaryDto {
  gardensCount: number;
  zonesCount: number;
  plantsCount: number;
  openProblemsCount: number;
  openTasksCount: number;
  harvestByMassGrams: HarvestSeriesPoint[];
  harvestByPieces: HarvestSeriesPoint[];
  harvestByLiters: HarvestSeriesPoint[];
  plantsByStatus: Array<{ status: string; count: number }>;
}

export interface DashboardNearestTaskDto {
  id: string;
  title: string;
  dueAt: string | null;
  priority: TaskPriority;
}

export interface DashboardSummaryDto {
  gardensCount: number;
  zonesCount: number;
  plantsCount: number;
  activePlantsCount: number;
  openProblemsCount: number;
  tasksTodayCount: number;
  seasonHarvestGrams: number;
  nearestOpenTask: DashboardNearestTaskDto | null;
  gardenHealth: {
    ok: number;
    attention: number;
    critical: number;
    finished: number;
  };
}

export type ActivityItemType = 'PLANT_CREATED' | 'JOURNAL' | 'HARVEST' | 'PROBLEM' | 'TASK';

export interface ActivityItemDto {
  id: string;
  type: ActivityItemType;
  title: string;
  description: string | null;
  occurredAt: string;
  href: string | null;
  plantId: string | null;
  gardenId: string | null;
}

export interface ZoneListItemDto extends ZoneDto {
  gardenName: string;
  plantCount: number;
}

export interface JournalListItemDto extends JournalEntryDto {
  plantName: string;
  plantId: string;
}

export interface HarvestListItemDto extends HarvestDto {
  plantName: string;
  plantId: string;
}

export interface ProblemListItemDto extends ProblemDto {
  plantName: string;
  plantId: string;
}

export interface HealthLiveResponse {
  status: 'ok';
  timestamp: string;
}

export interface HealthReadyResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export * from './planner';

