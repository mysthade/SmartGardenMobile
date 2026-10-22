import * as SecureStore from 'expo-secure-store';
import { api, newIdempotencyKey } from '@/src/lib/api';
import type { OfflineHarvestRecord } from '../types';

const OFFLINE_HARVESTS_KEY = 'sg_offline_harvests_queue_v1';

let memoryQueue: OfflineHarvestRecord[] = [];
let isQueueLoaded = false;
let isSyncing = false;

async function loadQueueFromStorage(): Promise<OfflineHarvestRecord[]> {
  if (isQueueLoaded) return memoryQueue;
  try {
    const raw = await SecureStore.getItemAsync(OFFLINE_HARVESTS_KEY);
    if (raw) {
      memoryQueue = JSON.parse(raw) as OfflineHarvestRecord[];
    }
  } catch {
    // secure store fallback
  }
  isQueueLoaded = true;
  return memoryQueue;
}

async function persistQueue(): Promise<void> {
  try {
    await SecureStore.setItemAsync(OFFLINE_HARVESTS_KEY, JSON.stringify(memoryQueue));
  } catch {
    // memory remains
  }
}

export const harvestOfflineStore = {
  async getQueue(): Promise<OfflineHarvestRecord[]> {
    return loadQueueFromStorage();
  },

  async addPending(record: Omit<OfflineHarvestRecord, 'syncStatus' | 'retryCount' | 'createdAt'>): Promise<OfflineHarvestRecord> {
    await loadQueueFromStorage();
    const newRecord: OfflineHarvestRecord = {
      ...record,
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
      retryCount: 0,
    };
    // Unique by idempotency key
    memoryQueue = [newRecord, ...memoryQueue.filter((r) => r.idempotencyKey !== newRecord.idempotencyKey)];
    await persistQueue();
    return newRecord;
  },

  async markFailed(idempotencyKey: string, errorMessage: string): Promise<void> {
    await loadQueueFromStorage();
    memoryQueue = memoryQueue.map((item) =>
      item.idempotencyKey === idempotencyKey
        ? { ...item, syncStatus: 'FAILED', errorMessage, retryCount: item.retryCount + 1 }
        : item,
    );
    await persistQueue();
  },

  async removeRecord(idempotencyKey: string): Promise<void> {
    await loadQueueFromStorage();
    memoryQueue = memoryQueue.filter((r) => r.idempotencyKey !== idempotencyKey);
    await persistQueue();
  },

  async syncPending(onRecordSynced?: (key: string) => void): Promise<{ syncedCount: number; failedCount: number }> {
    if (isSyncing) return { syncedCount: 0, failedCount: 0 };
    isSyncing = true;
    await loadQueueFromStorage();

    const pending = memoryQueue.filter((r) => r.syncStatus === 'PENDING' || r.syncStatus === 'FAILED');
    let syncedCount = 0;
    let failedCount = 0;

    for (const record of pending) {
      try {
        await api.createHarvest(
          record.plantId,
          {
            quantity: record.quantity,
            unit: record.unit,
            quality: record.quality,
            harvestedAt: record.harvestedAt,
            notes: record.notes,
          },
          record.idempotencyKey,
        );
        // Successfully synced
        memoryQueue = memoryQueue.filter((r) => r.idempotencyKey !== record.idempotencyKey);
        syncedCount++;
        onRecordSynced?.(record.idempotencyKey);
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : 'Помилка синхронізації';
        memoryQueue = memoryQueue.map((r) =>
          r.idempotencyKey === record.idempotencyKey
            ? { ...r, syncStatus: 'FAILED', errorMessage: message, retryCount: r.retryCount + 1 }
            : r,
        );
      }
    }

    await persistQueue();
    isSyncing = false;
    return { syncedCount, failedCount };
  },

  generateKey(prefix = 'harvest'): string {
    return newIdempotencyKey(prefix);
  },

  // For testing
  async _reset(): Promise<void> {
    memoryQueue = [];
    isQueueLoaded = true;
    isSyncing = false;
    try {
      await SecureStore.deleteItemAsync(OFFLINE_HARVESTS_KEY);
    } catch {
      // ignore
    }
  },
};
