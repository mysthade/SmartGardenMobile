import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers, Map, Plus } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import type { ZoneDto } from '@smart-garden/types';
import { formatApiError } from '@/src/lib/api-errors';
import { useTheme } from '@/src/theme/theme-context';
import {
  STATUS_MAP,
  ZONE_TYPE_LABEL,
  genKey,
  groupPlantsByZone,
} from '@/src/features/gardens/lib/gardens-helpers';
import { GardenChips } from '@/src/features/gardens/components/GardenChips';
import { ZoneCard } from '@/src/features/gardens/components/ZoneCard';
import { AddGardenModal } from '@/src/features/gardens/components/modals/AddGardenModal';
import { AddZoneModal } from '@/src/features/gardens/components/modals/AddZoneModal';
import { AddPlantModal } from '@/src/features/gardens/components/modals/AddPlantModal';
import { ZoneDetailModal } from '@/src/features/gardens/components/modals/ZoneDetailModal';
import { HarvestModal } from '@/src/features/gardens/components/modals/HarvestModal';
import { CareModal } from '@/src/features/gardens/components/modals/CareModal';

export { STATUS_MAP, ZONE_TYPE_LABEL };

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Видалити', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function GardensScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedGardenId, setSelectedGardenId] = useState<string | null>(null);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [highlightedPlantId, setHighlightedPlantId] = useState<string | null>(null);

  // Modals state
  const [addGardenOpen, setAddGardenOpen] = useState(false);
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addPlantZoneId, setAddPlantZoneId] = useState<string | null>(null);
  const [detailZone, setDetailZone] = useState<ZoneDto | null>(null);
  const [harvestPlant, setHarvestPlant] = useState<{ id: string; name: string } | null>(null);
  const [carePlant, setCarePlant] = useState<{ id: string; name: string } | null>(null);

  // Form inputs state
  const [gardenName, setGardenName] = useState('');
  const [gardenLocation, setGardenLocation] = useState('');
  const [gardenArea, setGardenArea] = useState('');

  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('BED');
  const [zoneWidth, setZoneWidth] = useState('');
  const [zoneHeight, setZoneHeight] = useState('');
  const [zoneError, setZoneError] = useState<string | null>(null);

  const [plantTypeId, setPlantTypeId] = useState('');
  const [plantName, setPlantName] = useState('');
  const [plantVariety, setPlantVariety] = useState('');
  const [plantQuantity, setPlantQuantity] = useState('1');
  const [plantStatus, setPlantStatus] = useState('GROWING');

  const [harvestQty, setHarvestQty] = useState('');
  const [harvestUnit, setHarvestUnit] = useState<'GRAM' | 'PIECE' | 'LITER'>('PIECE');
  const [harvestNotes, setHarvestNotes] = useState('');

  const [careType, setCareType] = useState('WATERING');
  const [careNotes, setCareNotes] = useState('');

  // Queries
  const gardensQuery = useQuery({
    queryKey: ['gardens', 'list'],
    queryFn: () => api.listGardens({ limit: 50 }),
    staleTime: 60_000,
  });

  const activeGardenId = selectedGardenId ?? gardensQuery.data?.data[0]?.id;

  const zonesQuery = useQuery({
    queryKey: ['zones', activeGardenId],
    queryFn: () => (activeGardenId ? api.listZones(activeGardenId, { limit: 50 }) : null),
    enabled: Boolean(activeGardenId),
    staleTime: 60_000,
  });

  const plantsQuery = useQuery({
    queryKey: ['plants', 'all'],
    queryFn: () => api.listPlants({ limit: 100 }),
    staleTime: 30_000,
  });

  const plantTypesQuery = useQuery({
    queryKey: ['plant-types'],
    queryFn: () => api.listPlantTypes({ limit: 100 }),
    staleTime: 10 * 60_000,
  });

  const gardens = gardensQuery.data?.data ?? [];
  const zones = zonesQuery.data?.data ?? [];
  const allPlants = plantsQuery.data?.data ?? [];
  const plantTypes = plantTypesQuery.data?.data ?? [];

  // Group plants by zoneId
  const plantsByZone = useMemo(() => groupPlantsByZone(allPlants), [allPlants]);
  const detailPlants = detailZone ? (plantsByZone[detailZone.id] ?? []) : [];

  // Mutations
  const createGardenMutation = useMutation({
    mutationFn: () =>
      api.createGarden({
        name: gardenName.trim(),
        locationName: gardenLocation.trim() || undefined,
        area: gardenArea ? Number(gardenArea) : undefined,
      }),
    onSuccess: (newGarden) => {
      void queryClient.invalidateQueries({ queryKey: ['gardens'] });
      setSelectedGardenId(newGarden.id);
      setAddGardenOpen(false);
      setGardenName('');
      setGardenLocation('');
      setGardenArea('');
    },
  });

  const deleteGardenMutation = useMutation({
    mutationFn: (gardenId: string) => api.deleteGarden(gardenId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gardens'] });
      setSelectedGardenId(null);
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: () =>
      api.createZone(activeGardenId!, {
        name: zoneName.trim(),
        type: zoneType,
        width: zoneWidth ? Number(zoneWidth) : undefined,
        height: zoneHeight ? Number(zoneHeight) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['zones', activeGardenId] });
      setAddZoneOpen(false);
      setZoneError(null);
      setZoneName('');
      setZoneWidth('');
      setZoneHeight('');
    },
    onError: (error) => {
      setZoneError(formatApiError(error, 'Не вдалося створити зону'));
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => api.deleteZone(zoneId),
    onMutate: async (zoneId: string) => {
      await queryClient.cancelQueries({ queryKey: ['zones', activeGardenId] });
      const previousZones = queryClient.getQueryData(['zones', activeGardenId]);
      queryClient.setQueryData(['zones', activeGardenId], (old: typeof zonesQuery.data) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((z) => z.id !== zoneId),
        };
      });
      return { previousZones };
    },
    onError: (_err, _zoneId, context) => {
      if (context?.previousZones) {
        queryClient.setQueryData(['zones', activeGardenId], context.previousZones);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['zones', activeGardenId] });
      void queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
  });

  const createPlantMutation = useMutation({
    mutationFn: () =>
      api.createPlant(
        addPlantZoneId!,
        {
          plantTypeId: plantTypeId || undefined,
          name: plantName.trim(),
          variety: plantVariety.trim() || undefined,
          quantity: Number(plantQuantity) || 1,
          status: plantStatus,
        },
        genKey('plant'),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plants'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAddPlantZoneId(null);
      setPlantName('');
      setPlantVariety('');
      setPlantTypeId('');
      setPlantQuantity('1');
    },
  });

  const deletePlantMutation = useMutation({
    mutationFn: (plantId: string) => api.deletePlant(plantId),
    onMutate: async (plantId: string) => {
      await queryClient.cancelQueries({ queryKey: ['plants', 'all'] });
      const previousPlants = queryClient.getQueryData(['plants', 'all']);
      queryClient.setQueryData(['plants', 'all'], (old: typeof plantsQuery.data) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((p) => p.id !== plantId),
        };
      });
      return { previousPlants };
    },
    onError: (_err, _plantId, context) => {
      if (context?.previousPlants) {
        queryClient.setQueryData(['plants', 'all'], context.previousPlants);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['plants'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const createHarvestMutation = useMutation({
    mutationFn: () =>
      api.createHarvest(
        harvestPlant!.id,
        {
          quantity: harvestQty.trim() || '1',
          unit: harvestUnit,
          harvestedAt: new Date().toISOString(),
          quality: 'EXCELLENT',
          notes: harvestNotes.trim() || undefined,
        },
        genKey('harvest'),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['harvests'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setHarvestPlant(null);
      setHarvestQty('');
      setHarvestNotes('');
    },
  });

  const createCareMutation = useMutation({
    mutationFn: () =>
      api.createCareActivity(
        carePlant!.id,
        {
          type: careType,
          performedAt: new Date().toISOString(),
          notes: careNotes.trim() || undefined,
        },
        genKey('care'),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plants'] });
      setCarePlant(null);
      setCareNotes('');
    },
  });

  const toggleZone = useCallback((zoneId: string) => {
    setExpandedZones((prev) => {
      const current = prev[zoneId] !== false; // default true
      return {
        ...prev,
        [zoneId]: !current,
      };
    });
  }, []);

  const isZoneExpanded = useCallback(
    (zoneId: string) => {
      return expandedZones[zoneId] !== false; // default true
    },
    [expandedZones],
  );

  const handleDeleteGarden = useCallback(
    (id: string, name: string) => {
      confirmAction('Видалити сад?', `Видалити сад "${name}"?`, () =>
        deleteGardenMutation.mutate(id),
      );
    },
    [deleteGardenMutation],
  );

  const prefetchZoneLayout = useCallback(
    (zoneId: string) => {
      void queryClient.prefetchQuery({
        queryKey: ['bed-layout', zoneId],
        queryFn: () => api.getBedLayout(zoneId),
        staleTime: 30_000,
      });
    },
    [queryClient],
  );

  const handleOpenEditor = useCallback(
    (zoneId: string) => {
      prefetchZoneLayout(zoneId);
      router.push(`/zones/${zoneId}/editor` as never);
    },
    [prefetchZoneLayout],
  );

  const handleDeleteZone = useCallback(
    (zoneId: string, zoneNameVal: string) => {
      confirmAction(
        'Видалити зону?',
        `Видалити зону "${zoneNameVal}" разом із рослинами?`,
        () => deleteZoneMutation.mutate(zoneId),
      );
    },
    [deleteZoneMutation],
  );

  const handleToggleHighlightPlant = useCallback((plantId: string) => {
    setHighlightedPlantId((prev) => (prev === plantId ? null : plantId));
  }, []);

  const handleCarePlant = useCallback((plant: { id: string; name: string }) => {
    setCarePlant(plant);
  }, []);

  const handleHarvestPlant = useCallback((plant: { id: string; name: string }) => {
    setHarvestPlant(plant);
  }, []);

  const handleDeletePlant = useCallback(
    (plantId: string, plantNameVal: string) => {
      confirmAction('Видалити рослину?', `Прибрати "${plantNameVal}" із грядки?`, () =>
        deletePlantMutation.mutate(plantId),
      );
    },
    [deletePlantMutation],
  );

  const renderZoneItem = useCallback(
    ({ item }: { item: ZoneDto }) => {
      const zonePlants = plantsByZone[item.id] ?? [];
      const expanded = isZoneExpanded(item.id);

      return (
        <ZoneCard
          zone={item}
          plants={zonePlants}
          expanded={expanded}
          highlightedPlantId={highlightedPlantId}
          theme={theme}
          onToggleExpand={() => toggleZone(item.id)}
          onLongPress={() => {
            prefetchZoneLayout(item.id);
            setDetailZone(item);
          }}
          onAddPlant={() => setAddPlantZoneId(item.id)}
          onOpenEditor={() => handleOpenEditor(item.id)}
          onDeleteZone={() => handleDeleteZone(item.id, item.name)}
          onToggleHighlightPlant={handleToggleHighlightPlant}
          onCarePlant={handleCarePlant}
          onHarvestPlant={handleHarvestPlant}
          onDeletePlant={handleDeletePlant}
        />
      );
    },
    [
      plantsByZone,
      isZoneExpanded,
      highlightedPlantId,
      theme,
      toggleZone,
      prefetchZoneLayout,
      handleOpenEditor,
      handleDeleteZone,
      handleToggleHighlightPlant,
      handleCarePlant,
      handleHarvestPlant,
      handleDeletePlant,
    ],
  );

  const keyExtractor = useCallback((item: ZoneDto) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.tx }]}>Мої сади та зони</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Керуйте ділянками, грядками та висадженими культурами
          </Text>
        </View>
        <Pressable
          style={[styles.addGardenBtn, { backgroundColor: theme.ac }]}
          onPress={() => setAddGardenOpen(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addGardenBtnText}>Сад</Text>
        </Pressable>
      </View>

      {/* Gardens Selector Row */}
      <GardenChips
        gardens={gardens}
        activeGardenId={activeGardenId}
        theme={theme}
        onSelectGarden={setSelectedGardenId}
        onDeleteGarden={handleDeleteGarden}
      />

      {/* Zones Header with "+ Додати зону" */}
      <View style={styles.zonesHeader}>
        <View style={styles.zonesTitleRow}>
          <Layers size={18} color={theme.ac} />
          <Text style={[styles.zonesTitle, { color: theme.tx }]}>Зони саду ({zones.length})</Text>
        </View>
        {activeGardenId ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Відкрити планувальник території"
              style={[styles.addZoneBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
              onPress={() => router.push(`/gardens/${activeGardenId}/planner` as never)}
            >
              <Map size={14} color={theme.ac} />
              <Text style={[styles.addZoneBtnText, { color: theme.ac }]}>Планувальник</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Додати нову зону"
              style={[styles.addZoneBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
              onPress={() => {
                setZoneError(null);
                setAddZoneOpen(true);
              }}
            >
              <Plus size={14} color={theme.ac} />
              <Text style={[styles.addZoneBtnText, { color: theme.ac }]}>Зона</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Zones and Plants List */}
      <FlatList
        data={zones}
        keyExtractor={keyExtractor}
        renderItem={renderZoneItem}
        contentContainerStyle={styles.zonesContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={gardensQuery.isRefetching || zonesQuery.isRefetching}
            onRefresh={() => {
              void gardensQuery.refetch();
              if (activeGardenId) void zonesQuery.refetch();
              void plantsQuery.refetch();
            }}
            tintColor={theme.ac}
          />
        }
        ListEmptyComponent={
          gardensQuery.isLoading || zonesQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.ac} size="large" />
              <Text style={[styles.muted, { color: theme.mu, marginTop: 12 }]}>
                Завантаження зон…
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <Map size={40} color={theme.mu} />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>Немає зон у цьому саді</Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                Створіть грядку, теплицю або клумбу, щоб висаджувати рослини.
              </Text>
              <Pressable
                style={[styles.createFirstBtn, { backgroundColor: theme.ac }]}
                onPress={() => {
                  setZoneError(null);
                  setAddZoneOpen(true);
                }}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.createFirstBtnText}>Створити першу зону</Text>
              </Pressable>
            </View>
          )
        }
      />

      {/* ================= Deferred / Lazy Mounted Modals ================= */}
      {addPlantZoneId ? (
        <AddPlantModal
          open={Boolean(addPlantZoneId)}
          plantTypeId={plantTypeId}
          plantName={plantName}
          plantVariety={plantVariety}
          plantQuantity={plantQuantity}
          plantStatus={plantStatus}
          plantTypes={plantTypes}
          loading={createPlantMutation.isPending}
          theme={theme}
          onChangePlantTypeId={(id, defaultName) => {
            setPlantTypeId(id);
            if (!plantName && defaultName) setPlantName(defaultName);
          }}
          onChangePlantName={setPlantName}
          onChangePlantVariety={setPlantVariety}
          onChangePlantQuantity={setPlantQuantity}
          onChangePlantStatus={setPlantStatus}
          onSubmit={() => createPlantMutation.mutate()}
          onClose={() => setAddPlantZoneId(null)}
        />
      ) : null}

      {detailZone ? (
        <ZoneDetailModal
          zone={detailZone}
          plants={detailPlants}
          theme={theme}
          onOpenEditor={(zid) => {
            setDetailZone(null);
            handleOpenEditor(zid);
          }}
          onAddPlant={(zid) => {
            setDetailZone(null);
            setAddPlantZoneId(zid);
          }}
          onCarePlant={(plant) => {
            setDetailZone(null);
            handleCarePlant(plant);
          }}
          onHarvestPlant={(plant) => {
            setDetailZone(null);
            handleHarvestPlant(plant);
          }}
          onDeletePlant={(pid, pname) => {
            setDetailZone(null);
            handleDeletePlant(pid, pname);
          }}
          onClose={() => setDetailZone(null)}
        />
      ) : null}

      {addGardenOpen ? (
        <AddGardenModal
          open={addGardenOpen}
          name={gardenName}
          location={gardenLocation}
          area={gardenArea}
          loading={createGardenMutation.isPending}
          theme={theme}
          onChangeName={setGardenName}
          onChangeLocation={setGardenLocation}
          onChangeArea={setGardenArea}
          onSubmit={() => createGardenMutation.mutate()}
          onClose={() => setAddGardenOpen(false)}
        />
      ) : null}

      {addZoneOpen ? (
        <AddZoneModal
          open={addZoneOpen}
          name={zoneName}
          type={zoneType}
          width={zoneWidth}
          height={zoneHeight}
          error={zoneError}
          loading={createZoneMutation.isPending}
          theme={theme}
          onChangeName={setZoneName}
          onChangeType={setZoneType}
          onChangeWidth={setZoneWidth}
          onChangeHeight={setZoneHeight}
          onSubmit={() => createZoneMutation.mutate()}
          onClose={() => setAddZoneOpen(false)}
        />
      ) : null}

      {harvestPlant ? (
        <HarvestModal
          plant={harvestPlant}
          qty={harvestQty}
          unit={harvestUnit}
          notes={harvestNotes}
          loading={createHarvestMutation.isPending}
          theme={theme}
          onChangeQty={setHarvestQty}
          onChangeUnit={setHarvestUnit}
          onChangeNotes={setHarvestNotes}
          onSubmit={() => createHarvestMutation.mutate()}
          onClose={() => setHarvestPlant(null)}
        />
      ) : null}

      {carePlant ? (
        <CareModal
          plant={carePlant}
          type={careType}
          notes={careNotes}
          loading={createCareMutation.isPending}
          theme={theme}
          onChangeType={setCareType}
          onChangeNotes={setCareNotes}
          onSubmit={() => createCareMutation.mutate()}
          onClose={() => setCarePlant(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  addGardenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  addGardenBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  zonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  zonesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zonesTitle: { fontSize: 17, fontWeight: '700' },
  addZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  addZoneBtnText: { fontSize: 12, fontWeight: '700' },
  zonesContent: { paddingHorizontal: 18, paddingBottom: 50 },
  emptyCard: {
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  muted: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  createFirstBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
});
