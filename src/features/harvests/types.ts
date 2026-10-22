import type { HarvestDto, HarvestQuality, HarvestUnit } from '@smart-garden/types';

export type StockUsageReason = 'EATEN' | 'PRESERVED' | 'SOLD' | 'GIVEN' | 'SPOILED';

export interface HarvestStockUsage {
  id: string;
  plantId: string;
  cropName: string;
  zoneId?: string;
  quantity: number;
  unit: HarvestUnit;
  reason: StockUsageReason;
  usedAt: string;
  notes?: string;
  isLocalOnly: true;
}

export interface OfflineHarvestRecord {
  idempotencyKey: string;
  plantId: string;
  zoneId?: string;
  plantName: string;
  zoneName?: string;
  quantity: string;
  unit: HarvestUnit;
  quality: HarvestQuality;
  notes?: string;
  harvestedAt: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  errorMessage?: string;
  retryCount: number;
}

export interface CropHarvestDraft {
  plantId: string;
  plantName: string;
  zoneId: string;
  zoneName?: string;
  variety?: string | null;
  hasProblem?: boolean;
  quantity: number;
  unit: HarvestUnit;
}

export interface CropStockBalance {
  plantName: string;
  plantTypeId?: string;
  unit: HarvestUnit;
  totalHarvested: number;
  totalUsed: number;
  remaining: number;
  lastHarvestDate: string | null;
  zoneIds: string[];
  zoneNames: string[];
  plantIds: string[];
}

export interface SeasonComparisonResult {
  currentSeasonYear: number;
  previousSeasonYear: number;
  currentTotalMassKg: number;
  previousTotalMassKg: number;
  massDiffKg: number;
  massDiffPercent: number; // e.g. +15.4 or -8.2
  currentTotalPieces: number;
  previousTotalPieces: number;
  piecesDiff: number;
  piecesDiffPercent: number;
  currentTotalLiters: number;
  previousTotalLiters: number;
  litersDiff: number;
  litersDiffPercent: number;
  topCrops: Array<{ name: string; quantity: number; unit: HarvestUnit; massKg?: number }>;
  bestZone: { id: string; name: string; yieldKgPerM2: number; totalKg: number } | null;
  worstZone: { id: string; name: string; yieldKgPerM2: number; totalKg: number } | null;
}

export interface ZoneYieldStat {
  zoneId: string;
  zoneName: string;
  areaM2: number;
  totalMassKg: number;
  yieldKgPerM2: number;
  cropsCount: number;
}

export interface HarvestReminderItem {
  plantId: string;
  plantName: string;
  variety?: string | null;
  zoneId: string;
  zoneName: string;
  status: string;
  daysSinceLastHarvest?: number;
  expectedDate?: string;
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
  message: string;
}

export type HarvestsTabSegment = 'harvests' | 'stock' | 'summary';

export type HarvestFilterType = 'ALL' | 'WITHOUT_DETAILS' | 'WITH_PHOTOS' | 'HAS_PROBLEMS';

export interface HarvestExtendedItem extends HarvestDto {
  plantName: string;
  zoneId?: string;
  zoneName?: string;
  hasPhoto?: boolean;
  hasProblem?: boolean;
  isWithoutDetails?: boolean;
  syncStatus?: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
}
