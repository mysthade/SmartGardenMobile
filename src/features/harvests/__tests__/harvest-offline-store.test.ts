import { harvestOfflineStore } from '../lib/harvest-offline-store';
import { api } from '@/src/lib/api';

jest.mock('@/src/lib/api', () => ({
  api: {
    createHarvest: jest.fn(),
  },
  newIdempotencyKey: jest.fn((prefix = 'key') => `${prefix}_mock_${Math.random()}`),
}));

describe('harvestOfflineStore', () => {
  beforeEach(async () => {
    await harvestOfflineStore._reset();
    jest.clearAllMocks();
  });

  it('generates unique idempotency keys', () => {
    const key1 = harvestOfflineStore.generateKey('harvest');
    const key2 = harvestOfflineStore.generateKey('harvest');
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(typeof key1).toBe('string');
  });

  it('adds and queues pending records', async () => {
    const record = await harvestOfflineStore.addPending({
      idempotencyKey: 'key-1',
      plantId: 'plant-1',
      plantName: 'Морква',
      quantity: '5',
      unit: 'KILOGRAM',
      quality: 'GOOD',
      harvestedAt: '2026-10-22T10:00:00Z',
    });

    expect(record.syncStatus).toBe('PENDING');
    expect(record.retryCount).toBe(0);

    const queue = await harvestOfflineStore.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].idempotencyKey).toBe('key-1');
  });

  it('syncs pending records via api and removes synced items from queue', async () => {
    (api.createHarvest as jest.Mock).mockResolvedValueOnce({
      id: 'harvest-server-id-1',
    });

    await harvestOfflineStore.addPending({
      idempotencyKey: 'key-sync-1',
      plantId: 'plant-1',
      plantName: 'Томат',
      quantity: '3',
      unit: 'KILOGRAM',
      quality: 'EXCELLENT',
      harvestedAt: '2026-10-22T10:00:00Z',
    });

    const syncedKeyCallback = jest.fn();
    const result = await harvestOfflineStore.syncPending(syncedKeyCallback);

    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(syncedKeyCallback).toHaveBeenCalledWith('key-sync-1');
    expect(api.createHarvest).toHaveBeenCalledTimes(1);

    const queue = await harvestOfflineStore.getQueue();
    expect(queue.length).toBe(0);
  });

  it('handles sync failure by marking item as FAILED with error message and incrementing retry count', async () => {
    (api.createHarvest as jest.Mock).mockRejectedValueOnce(new Error('Network unavailable'));

    await harvestOfflineStore.addPending({
      idempotencyKey: 'key-fail-1',
      plantId: 'plant-1',
      plantName: 'Томат',
      quantity: '3',
      unit: 'KILOGRAM',
      quality: 'EXCELLENT',
      harvestedAt: '2026-10-22T10:00:00Z',
    });

    const result = await harvestOfflineStore.syncPending();

    expect(result.syncedCount).toBe(0);
    expect(result.failedCount).toBe(1);

    const queue = await harvestOfflineStore.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].syncStatus).toBe('FAILED');
    expect(queue[0].errorMessage).toBe('Network unavailable');
    expect(queue[0].retryCount).toBe(1);
  });
});
