import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Box, Plus, Scale, TrendingUp, Undo2 } from 'lucide-react-native';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import { QuickHarvestSheet } from '@/src/features/harvests/components/QuickHarvestSheet';
import { HarvestDetailsModal } from '@/src/features/harvests/components/HarvestDetailsModal';
import { StockTab } from '@/src/features/harvests/components/StockTab';
import { StockUsageModal } from '@/src/features/harvests/components/StockUsageModal';
import { SummaryTab } from '@/src/features/harvests/components/SummaryTab';
import { HarvestsListTab } from '@/src/features/harvests/components/HarvestsListTab';
import { ReadyToHarvestBanner } from '@/src/features/harvests/components/ReadyToHarvestBanner';
import { harvestOfflineStore } from '@/src/features/harvests/lib/harvest-offline-store';
import { harvestUsageStore } from '@/src/features/harvests/lib/harvest-usage-store';
import { findReadyToHarvestPlants } from '@/src/features/harvests/lib/harvest-reminders';
import { isRecordWithoutDetails } from '@/src/features/harvests/lib/harvest-defaults';
import type {
  CropHarvestDraft,
  CropStockBalance,
  HarvestExtendedItem,
  HarvestStockUsage,
  HarvestsTabSegment,
} from '@/src/features/harvests/types';

export default function HarvestsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeSegment, setActiveSegment] = useState<HarvestsTabSegment>('harvests');

  // Modals state
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null);
  const [targetPlantId, setTargetPlantId] = useState<string | null>(null);

  const [detailHarvest, setDetailHarvest] = useState<HarvestExtendedItem | null>(null);
  const [usageStockItem, setUsageStockItem] = useState<CropStockBalance | null>(null);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    message: string;
    harvestIds: string[];
    timerId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // 1. Data queries
  const harvestsQuery = useQuery({
    queryKey: ['harvests', 'all'],
    queryFn: () => api.listAllHarvests({ limit: 100 }),
    staleTime: 30_000,
  });

  const plantsQuery = useQuery({
    queryKey: ['plants', 'all'],
    queryFn: () => api.listPlants({ limit: 150 }),
    staleTime: 30_000,
  });

  const zonesQuery = useQuery({
    queryKey: ['zones', 'all'],
    queryFn: () => api.listAllZones({ limit: 50 }),
    staleTime: 60_000,
  });

  const usagesQuery = useQuery({
    queryKey: ['harvest-stock-usages'],
    queryFn: () => harvestUsageStore.listUsages(),
    staleTime: 10_000,
  });

  const offlineQueueQuery = useQuery({
    queryKey: ['harvest-offline-queue'],
    queryFn: () => harvestOfflineStore.getQueue(),
    staleTime: 5_000,
  });

  // Try auto-syncing offline items on load
  useEffect(() => {
    void harvestOfflineStore.syncPending(() => {
      void queryClient.invalidateQueries({ queryKey: ['harvests'] });
      void queryClient.invalidateQueries({ queryKey: ['harvest-offline-queue'] });
    });
  }, [queryClient]);

  const rawHarvests = harvestsQuery.data?.data ?? [];
  const plants = plantsQuery.data?.data ?? [];
  const zones = zonesQuery.data?.data ?? [];
  const usages = usagesQuery.data ?? [];
  const offlineQueue = offlineQueueQuery.data ?? [];

  const plantMap = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);
  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  // Combine server harvests + pending offline harvests
  const combinedHarvests: HarvestExtendedItem[] = useMemo(() => {
    const list: HarvestExtendedItem[] = [];

    // Pending offline
    for (const off of offlineQueue) {
      const pl = plantMap.get(off.plantId);
      const zn = pl ? zoneMap.get(pl.zoneId) : undefined;
      list.push({
        id: `offline_${off.idempotencyKey}`,
        plantId: off.plantId,
        quantity: off.quantity,
        unit: off.unit,
        damagedQuantity: null,
        quality: off.quality,
        notes: off.notes ?? null,
        quantityGrams: null,
        harvestedAt: off.harvestedAt,
        createdAt: off.createdAt,
        updatedAt: off.createdAt,
        plantName: off.plantName,
        zoneId: pl?.zoneId,
        zoneName: zn?.name ?? off.zoneName,
        isWithoutDetails: isRecordWithoutDetails(off.notes),
        syncStatus: off.syncStatus,
      });
    }

    // Server list
    for (const h of rawHarvests) {
      const pl = plantMap.get(h.plantId);
      const zn = pl ? zoneMap.get(pl.zoneId) : undefined;
      list.push({
        ...h,
        plantName: h.plantName ?? pl?.name ?? 'Урожай',
        zoneId: pl?.zoneId,
        zoneName: zn?.name,
        hasPhoto: false, // attachments can be verified
        hasProblem: pl?.status === 'HAS_PROBLEM' || (pl?.openProblemsCount ?? 0) > 0,
        isWithoutDetails: isRecordWithoutDetails(h.notes),
        syncStatus: 'SYNCED',
      });
    }

    return list.sort(
      (a, b) => new Date(b.harvestedAt).getTime() - new Date(a.harvestedAt).getTime(),
    );
  }, [rawHarvests, offlineQueue, plantMap, zoneMap]);

  // Stock balances
  const stockBalances = useMemo(
    () => harvestUsageStore.calculateStockBalances(combinedHarvests, plants, usages),
    [combinedHarvests, plants, usages],
  );

  // Reminders ready to harvest
  const reminders = useMemo(
    () => findReadyToHarvestPlants(plants, zones, rawHarvests),
    [plants, zones, rawHarvests],
  );

  // Invalidate queries after harvest change
  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['harvests'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['plants'] }),
    ]);
  }, [queryClient]);

  // Mutations
  const createHarvestBatchMutation = useMutation({
    mutationFn: async ({ drafts, batchId }: { drafts: CropHarvestDraft[]; batchId: string }) => {
      const createdIds: string[] = [];

      for (const draft of drafts) {
        const idempotencyKey = harvestOfflineStore.generateKey('harvest');
        const notesTag = `[batch:${batchId}]`;

        try {
          const res = await api.createHarvest(
            draft.plantId,
            {
              quantity: String(draft.quantity),
              unit: draft.unit,
              harvestedAt: new Date().toISOString(),
              quality: 'GOOD',
              notes: notesTag,
            },
            idempotencyKey,
          );
          createdIds.push(res.id);
        } catch {
          // If network error, add to offline store
          await harvestOfflineStore.addPending({
            idempotencyKey,
            plantId: draft.plantId,
            plantName: draft.plantName,
            zoneId: draft.zoneId,
            zoneName: draft.zoneName,
            quantity: String(draft.quantity),
            unit: draft.unit,
            quality: 'GOOD',
            notes: notesTag,
            harvestedAt: new Date().toISOString(),
          });
        }
      }

      return createdIds;
    },
    onSuccess: async (createdIds, { drafts }) => {
      await invalidateAll();
      void queryClient.invalidateQueries({ queryKey: ['harvest-offline-queue'] });

      // Show Undo Toast with 5s expiration
      if (undoToast?.timerId) clearTimeout(undoToast.timerId);

      const timerId = setTimeout(() => {
        setUndoToast(null);
      }, 5000);

      const countText =
        drafts.length > 1 ? `Збір збережено (${drafts.length} культури)` : `Збір ${drafts[0]?.plantName} записано`;

      setUndoToast({
        message: countText,
        harvestIds: createdIds,
        timerId,
      });
    },
    onError: (err) => {
      Alert.alert('Помилка', err instanceof Error ? err.message : 'Не вдалося створити збір');
    },
  });

  const deleteHarvestMutation = useMutation({
    mutationFn: async (harvestId: string) => {
      if (harvestId.startsWith('offline_')) {
        const key = harvestId.replace('offline_', '');
        await harvestOfflineStore.removeRecord(key);
        return { message: 'Видалено з локальної черги' };
      }
      return api.deleteHarvest(harvestId);
    },
    onSuccess: async () => {
      await invalidateAll();
      void queryClient.invalidateQueries({ queryKey: ['harvest-offline-queue'] });
    },
  });

  const recordUsageMutation = useMutation({
    mutationFn: (usageData: Omit<HarvestStockUsage, 'id' | 'isLocalOnly'>) =>
      harvestUsageStore.recordUsage(usageData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['harvest-stock-usages'] });
    },
  });

  // Undo last harvest
  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    clearTimeout(undoToast.timerId);
    const ids = undoToast.harvestIds;
    setUndoToast(null);

    for (const id of ids) {
      try {
        await deleteHarvestMutation.mutateAsync(id);
      } catch {
        // ignore
      }
    }
  }, [undoToast, deleteHarvestMutation]);

  // Quick harvest open triggers
  const handleOpenQuickHarvest = useCallback(
    (zoneId?: string | null, plantId?: string | null) => {
      setTargetZoneId(zoneId ?? null);
      setTargetPlantId(plantId ?? null);
      setQuickSheetOpen(true);
    },
    [],
  );

  const handleDuplicateHarvest = useCallback(
    (item: HarvestExtendedItem) => {
      handleOpenQuickHarvest(item.zoneId, item.plantId);
    },
    [handleOpenQuickHarvest],
  );

  const handleSaveDetails = useCallback(
    async (
      harvestId: string,
      _updates: {
        quality: HarvestExtendedItem['quality'];
        notes: string | null;
        damagedQuantity?: string | null;
        harvestedAt: string;
        localPhotoUri?: string | null;
      },
    ) => {
      if (harvestId.startsWith('offline_')) {
        // update local offline
      }
      await invalidateAll();
    },
    [invalidateAll],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 10 }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <ArrowLeft size={18} color={theme.tx} />
        </Pressable>

        <Text style={[styles.screenTitle, { color: theme.tx }]}>Облік урожаю</Text>

        <Pressable
          style={[styles.quickAddTopBtn, { backgroundColor: theme.ac }]}
          onPress={() => handleOpenQuickHarvest()}
          accessibilityRole="button"
          accessibilityLabel="Додати новий збір"
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.quickAddTopBtnText}>Збір</Text>
        </Pressable>
      </View>

      {/* Segment Switcher: Збори | Запаси | Підсумки */}
      <View style={[styles.segmentContainer, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        {(
          [
            { key: 'harvests', label: 'Збори', icon: Scale },
            { key: 'stock', label: 'Запаси', icon: Box },
            { key: 'summary', label: 'Підсумки', icon: TrendingUp },
          ] as const
        ).map((seg) => {
          const isSelected = activeSegment === seg.key;
          const Icon = seg.icon;
          return (
            <Pressable
              key={seg.key}
              style={[
                styles.segmentItem,
                isSelected && { backgroundColor: theme.ac },
              ]}
              onPress={() => setActiveSegment(seg.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Вкладка ${seg.label}`}
            >
              <Icon size={15} color={isSelected ? '#ffffff' : theme.mu} />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: isSelected ? '#ffffff' : theme.tx, fontWeight: isSelected ? '700' : '600' },
                ]}
              >
                {seg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Ready to Harvest Banner (Shown in harvests segment) */}
      {activeSegment === 'harvests' && reminders.length > 0 ? (
        <ReadyToHarvestBanner
          reminders={reminders}
          theme={theme}
          onQuickHarvest={(rem) => handleOpenQuickHarvest(rem.zoneId, rem.plantId)}
        />
      ) : null}

      {/* Active Segment Content */}
      <View style={styles.segmentContent}>
        {activeSegment === 'harvests' ? (
          <HarvestsListTab
            harvests={combinedHarvests}
            theme={theme}
            loading={harvestsQuery.isLoading}
            refreshing={harvestsQuery.isRefetching}
            onRefresh={() => {
              void harvestsQuery.refetch();
              void plantsQuery.refetch();
              void zonesQuery.refetch();
            }}
            onSelectHarvest={(h) => setDetailHarvest(h)}
            onDuplicateHarvest={handleDuplicateHarvest}
            onDeleteHarvest={(id) => deleteHarvestMutation.mutate(id)}
            onRetrySync={() => void harvestOfflineStore.syncPending()}
          />
        ) : activeSegment === 'stock' ? (
          <StockTab
            stockBalances={stockBalances}
            theme={theme}
            onOpenUsage={(stockItem) => setUsageStockItem(stockItem)}
          />
        ) : (
          <SummaryTab
            harvests={combinedHarvests}
            zones={zones}
            plants={plants}
            theme={theme}
          />
        )}
      </View>

      {/* Floating Action Button (+ Збір) */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.fabBtn, { backgroundColor: theme.ac }]}
          onPress={() => handleOpenQuickHarvest()}
          accessibilityRole="button"
          accessibilityLabel="Швидко записати збір урожаю"
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.fabText}>+ Збір</Text>
        </Pressable>
      </View>

      {/* Undo Toast */}
      {undoToast ? (
        <View style={[styles.toastContainer, { bottom: insets.bottom + 80, backgroundColor: theme.name === 'dark' ? '#17251c' : '#2C3E50' }]}>
          <Text style={styles.toastText} numberOfLines={1}>
            {undoToast.message}
          </Text>
          <View style={styles.toastActions}>
            <Pressable
              style={styles.toastDetailBtn}
              onPress={() => {
                const firstId = undoToast.harvestIds[0];
                const found = combinedHarvests.find((h) => h.id === firstId);
                if (found) setDetailHarvest(found);
                setUndoToast(null);
              }}
            >
              <Text style={styles.toastDetailText}>Деталі</Text>
            </Pressable>

            <Pressable style={styles.toastUndoBtn} onPress={handleUndo}>
              <Undo2 size={14} color="#ffffff" />
              <Text style={styles.toastUndoText}>Скасувати</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Quick Harvest Bottom Sheet */}
      <QuickHarvestSheet
        open={quickSheetOpen}
        preselectedZoneId={targetZoneId}
        preselectedPlantId={targetPlantId}
        zones={zones}
        plants={plants}
        theme={theme}
        loading={createHarvestBatchMutation.isPending}
        onClose={() => setQuickSheetOpen(false)}
        onSaveHarvest={async (drafts, batchId) => {
          await createHarvestBatchMutation.mutateAsync({ drafts, batchId });
        }}
      />

      {/* Harvest Details Modal */}
      {detailHarvest ? (
        <HarvestDetailsModal
          harvest={detailHarvest}
          theme={theme}
          onClose={() => setDetailHarvest(null)}
          onSaveDetails={handleSaveDetails}
          onDeleteHarvest={(id) => deleteHarvestMutation.mutate(id)}
        />
      ) : null}

      {/* Stock Usage Modal */}
      {usageStockItem ? (
        <StockUsageModal
          stockItem={usageStockItem}
          theme={theme}
          onClose={() => setUsageStockItem(null)}
          onRecordUsage={async (data) => {
            await recordUsageMutation.mutateAsync({
              ...data,
              usedAt: new Date().toISOString(),
            });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  quickAddTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  quickAddTopBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentLabel: {
    fontSize: 13,
  },
  segmentContent: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 90,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 48,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  toastContainer: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 7,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  toastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastDetailBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  toastDetailText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  toastUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(231,76,60,0.8)',
  },
  toastUndoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
