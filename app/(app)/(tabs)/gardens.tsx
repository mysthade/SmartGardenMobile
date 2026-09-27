import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import {
  Trees,
  Map,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sprout,
  Layers,
  Droplets,
  Wheat,
  X,
  Check,
  Ruler,
  Maximize2,
} from 'lucide-react-native';

function genKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED: { label: 'Заплановано', color: '#7F8C8D', bg: '#EAEDED' },
  PLANTED: { label: 'Посаджено', color: '#2980B9', bg: '#EBF5FB' },
  GROWING: { label: 'Росте', color: '#27AE60', bg: '#EAFaf1' },
  FLOWERING: { label: 'Цвіте', color: '#8E44AD', bg: '#F4ECF7' },
  FRUITING: { label: 'Плодоносить', color: '#D35400', bg: '#FBEEE6' },
  HARVESTING: { label: 'Збір урожаю', color: '#D68910', bg: '#FEF9E7' },
  FINISHED: { label: 'Завершено', color: '#95A5A6', bg: '#F2F4F4' },
};

const ZONE_TYPES = [
  { value: 'BED', label: 'Грядка' },
  { value: 'GREENHOUSE', label: 'Теплиця' },
  { value: 'OPEN_GROUND', label: 'Відкритий ґрунт' },
  { value: 'CONTAINER', label: 'Контейнер' },
  { value: 'ORCHARD', label: 'Сад' },
  { value: 'BERRY', label: 'Ягідник' },
  { value: 'FLOWERBED', label: 'Клумба' },
];

export default function GardensScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedGardenId, setSelectedGardenId] = useState<string | null>(null);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});

  // Modals state
  const [addGardenOpen, setAddGardenOpen] = useState(false);
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addPlantZoneId, setAddPlantZoneId] = useState<string | null>(null);
  const [detailZone, setDetailZone] = useState<any | null>(null);
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
  const plantsByZone = useMemo(() => {
    const map: Record<string, typeof allPlants> = {};
    for (const p of allPlants) {
      if (p.zoneId) {
        if (!map[p.zoneId]) map[p.zoneId] = [];
        map[p.zoneId].push(p);
      }
    }
    return map;
  }, [allPlants]);

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
      setZoneName('');
      setZoneWidth('');
      setZoneHeight('');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => api.deleteZone(zoneId),
    onSuccess: () => {
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
    onSuccess: () => {
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

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => {
      const current = prev[zoneId] !== false; // default true
      return {
        ...prev,
        [zoneId]: !current,
      };
    });
  };

  const isZoneExpanded = (zoneId: string) => {
    return expandedZones[zoneId] !== false; // default true
  };

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
      {gardens.length > 0 ? (
        <View style={styles.selectorWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={gardens}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gardensList}
            renderItem={({ item }) => {
              const isSelected = item.id === activeGardenId;
              return (
                <Pressable
                  style={[
                    styles.gardenChip,
                    {
                      backgroundColor: isSelected ? theme.ac : theme.pn,
                      borderColor: isSelected ? theme.ac : theme.bd,
                    },
                  ]}
                  onPress={() => setSelectedGardenId(item.id)}
                >
                  <Trees size={16} color={isSelected ? '#ffffff' : theme.mu} />
                  <Text
                    style={[styles.gardenChipText, { color: isSelected ? '#ffffff' : theme.tx }]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && gardens.length > 1 ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        confirmAction('Видалити сад?', `Видалити сад "${item.name}"?`, () =>
                          deleteGardenMutation.mutate(item.id),
                        )
                      }
                    >
                      <Trash2 size={13} color="#ffffff" style={{ marginLeft: 4, opacity: 0.8 }} />
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {/* Zones Header with "+ Додати зону" */}
      <View style={styles.zonesHeader}>
        <View style={styles.zonesTitleRow}>
          <Layers size={18} color={theme.ac} />
          <Text style={[styles.zonesTitle, { color: theme.tx }]}>Зони саду ({zones.length})</Text>
        </View>
        {activeGardenId ? (
          <Pressable
            style={[styles.addZoneBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
            onPress={() => setAddZoneOpen(true)}
          >
            <Plus size={14} color={theme.ac} />
            <Text style={[styles.addZoneBtnText, { color: theme.ac }]}>Зона</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Zones and Plants List */}
      <FlatList
        data={zones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.zonesContent}
        showsVerticalScrollIndicator={false}
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
                onPress={() => setAddZoneOpen(true)}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.createFirstBtnText}>Створити першу зону</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => {
          const zonePlants = plantsByZone[item.id] ?? [];
          const expanded = isZoneExpanded(item.id);

          return (
            <View style={[styles.zoneBlock, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              {/* Zone Header Bar */}
              <View style={styles.zoneHeaderBar}>
                <Pressable
                  style={styles.zoneHeaderLeft}
                  onPress={() => toggleZone(item.id)}
                >
                  <View style={styles.zoneIconWrap}>
                    <Sprout size={18} color={theme.ac} />
                  </View>
                  <View style={styles.zoneInfo}>
                    <Text style={[styles.zoneName, { color: theme.tx }]}>{item.name}</Text>
                    <Text style={[styles.zoneMeta, { color: theme.mu }]}>
                      {item.type ? `Тип: ${item.type}` : 'Грядка'}
                      {item.area ? ` • ${item.area} м²` : ''}
                      {` • Рослин: ${zonePlants.length}`}
                    </Text>
                  </View>
                </Pressable>

                {/* Actions on Zone */}
                <View style={styles.zoneActions}>
                  <Pressable
                    style={[styles.plantInZoneBtn, { backgroundColor: theme.ac }]}
                    onPress={() => setAddPlantZoneId(item.id)}
                  >
                    <Plus size={14} color="#fff" />
                    <Text style={styles.plantInZoneText}>Рослина</Text>
                  </Pressable>

                  <Pressable
                    hitSlop={8}
                    style={styles.actionIconBtn}
                    onPress={() => setDetailZone(item)}
                  >
                    <Maximize2 size={16} color={theme.mu} />
                  </Pressable>

                  <Pressable
                    hitSlop={8}
                    style={styles.deleteZoneBtn}
                    onPress={() =>
                      confirmAction(
                        'Видалити зону?',
                        `Видалити зону "${item.name}" разом із рослинами?`,
                        () => deleteZoneMutation.mutate(item.id),
                      )
                    }
                  >
                    <Trash2 size={16} color="#C0392B" />
                  </Pressable>

                  <Pressable
                    hitSlop={8}
                    style={styles.toggleChevronBtn}
                    onPress={() => toggleZone(item.id)}
                  >
                    {expanded ? (
                      <ChevronUp size={20} color={theme.mu} />
                    ) : (
                      <ChevronDown size={20} color={theme.mu} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Plants in this Zone */}
              {expanded ? (
                <View style={[styles.plantsContainer, { borderTopColor: theme.bd }]}>
                  {zonePlants.length === 0 ? (
                    <View style={styles.noPlantsWrap}>
                      <Text style={[styles.noPlantsText, { color: theme.mu }]}>
                        У цій зоні ще немає висаджених рослин
                      </Text>
                      <Pressable
                        style={[styles.smallAddPlantBtn, { borderColor: theme.ac }]}
                        onPress={() => setAddPlantZoneId(item.id)}
                      >
                        <Plus size={14} color={theme.ac} />
                        <Text style={[styles.smallAddPlantText, { color: theme.ac }]}>
                          Посадити першу рослину
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    zonePlants.map((plant) => {
                      const st = STATUS_MAP[plant.status] ?? STATUS_MAP.GROWING;
                      return (
                        <View
                          key={plant.id}
                          style={[
                            styles.plantCard,
                            {
                              backgroundColor: theme.name === 'dark' ? '#17251c' : '#f9fcf9',
                              borderColor: theme.bd,
                            },
                          ]}
                        >
                          <View style={styles.plantTopRow}>
                            <View style={styles.plantTitleWrap}>
                              <Text style={[styles.plantNameText, { color: theme.tx }]}>
                                {plant.name}
                              </Text>
                              {plant.variety ? (
                                <Text style={[styles.plantVarietyText, { color: theme.mu }]}>
                                  Сорт: {plant.variety}
                                </Text>
                              ) : null}
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                              <Text style={[styles.statusBadgeText, { color: st.color }]}>
                                {st.label}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.plantMetaRow}>
                            <Text style={[styles.plantQty, { color: theme.mu }]}>
                              Кількість: {plant.quantity} шт.
                            </Text>
                          </View>

                          {/* Quick Plant Actions */}
                          <View style={[styles.plantButtonsRow, { borderTopColor: theme.bd }]}>
                            <Pressable
                              style={styles.pActionBtn}
                              onPress={() => setCarePlant({ id: plant.id, name: plant.name })}
                            >
                              <Droplets size={14} color="#2980B9" />
                              <Text style={[styles.pActionText, { color: '#2980B9' }]}>Догляд</Text>
                            </Pressable>

                            <Pressable
                              style={styles.pActionBtn}
                              onPress={() => setHarvestPlant({ id: plant.id, name: plant.name })}
                            >
                              <Wheat size={14} color="#D35400" />
                              <Text style={[styles.pActionText, { color: '#D35400' }]}>Урожай</Text>
                            </Pressable>

                            <Pressable
                              style={styles.pActionBtn}
                              onPress={() =>
                                confirmAction(
                                  'Видалити рослину?',
                                  `Прибрати "${plant.name}" із грядки?`,
                                  () => deletePlantMutation.mutate(plant.id),
                                )
                              }
                            >
                              <Trash2 size={14} color="#C0392B" />
                              <Text style={[styles.pActionText, { color: '#C0392B' }]}>Видалити</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {/* ================= MODAL: Додати рослину ================= */}
      <Modal visible={Boolean(addPlantZoneId)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Посадити нову рослину</Text>
              <Pressable hitSlop={10} onPress={() => setAddPlantZoneId(null)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Оберіть культуру</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.typesRow}>
                  {plantTypes.slice(0, 15).map((pt) => {
                    const isSelected = plantTypeId === pt.id;
                    return (
                      <Pressable
                        key={pt.id}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: isSelected ? theme.ac : theme.bg,
                            borderColor: isSelected ? theme.ac : theme.bd,
                          },
                        ]}
                        onPress={() => {
                          setPlantTypeId(pt.id);
                          if (!plantName) setPlantName(pt.name);
                        }}
                      >
                        <Text style={[styles.typeChipText, { color: isSelected ? '#fff' : theme.tx }]}>
                          {pt.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Назва рослини *</Text>
              <TextInput
                style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                value={plantName}
                onChangeText={setPlantName}
                placeholder="напр. Томат Чері"
                placeholderTextColor={theme.mu}
              />

              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Сорт / різновид</Text>
              <TextInput
                style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                value={plantVariety}
                onChangeText={setPlantVariety}
                placeholder="напр. Сливка рожева"
                placeholderTextColor={theme.mu}
              />

              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Кількість саджанців</Text>
              <TextInput
                style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                value={plantQuantity}
                onChangeText={setPlantQuantity}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={theme.mu}
              />

              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Статус</Text>
              <View style={styles.statusChipsRow}>
                {['PLANTED', 'GROWING', 'FRUITING'].map((st) => (
                  <Pressable
                    key={st}
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: plantStatus === st ? theme.ac : theme.bg,
                        borderColor: plantStatus === st ? theme.ac : theme.bd,
                      },
                    ]}
                    onPress={() => setPlantStatus(st)}
                  >
                    <Text style={{ color: plantStatus === st ? '#fff' : theme.tx, fontSize: 12, fontWeight: '600' }}>
                      {STATUS_MAP[st]?.label ?? st}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.submitModalBtn, { backgroundColor: theme.ac, opacity: !plantName.trim() ? 0.6 : 1 }]}
              disabled={!plantName.trim() || createPlantMutation.isPending}
              onPress={() => createPlantMutation.mutate()}
            >
              {createPlantMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitModalBtnText}>Посадити в грядку</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: Деталі зони (як на веб-версії /zones/[zoneId]) ================= */}
      <Modal visible={Boolean(detailZone)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sprout size={20} color={theme.ac} />
                  <Text style={[styles.modalTitle, { color: theme.tx }]}>
                    {detailZone?.name ?? 'Зона'}
                  </Text>
                </View>
                <Text style={[styles.muted, { color: theme.mu, marginTop: 2, fontSize: 12 }]}>
                  {detailZone?.type ? `Тип: ${detailZone.type}` : 'Грядка'}
                  {detailZone?.area ? ` • Площа: ${detailZone.area} м²` : ''}
                  {detailZone?.width && detailZone?.height ? ` • ${detailZone.width} × ${detailZone.height} м` : ''}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setDetailZone(null)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <Pressable
                  style={[styles.smallAddPlantBtn, { flex: 1, backgroundColor: theme.ac, borderColor: theme.ac, paddingVertical: 10, justifyContent: 'center' }]}
                  onPress={() => {
                    const zid = detailZone?.id;
                    setDetailZone(null);
                    setAddPlantZoneId(zid);
                  }}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={[styles.smallAddPlantText, { color: '#fff', fontWeight: '700' }]}>
                    Посадити нову рослину
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.tx, fontWeight: '700', marginBottom: 8 }]}>
                Рослини у цій зоні ({plantsByZone[detailZone?.id]?.length ?? 0}):
              </Text>

              {(!plantsByZone[detailZone?.id] || plantsByZone[detailZone?.id].length === 0) ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.bg, borderColor: theme.bd, paddingVertical: 24 }]}>
                  <Sprout size={32} color={theme.mu} />
                  <Text style={[styles.muted, { color: theme.mu, marginTop: 6 }]}>
                    У цій зоні ще немає висаджених рослин
                  </Text>
                </View>
              ) : (
                plantsByZone[detailZone?.id].map((plant: any) => {
                  const st = STATUS_MAP[plant.status] ?? STATUS_MAP.GROWING;
                  return (
                    <View
                      key={plant.id}
                      style={[
                        styles.plantCard,
                        {
                          backgroundColor: theme.name === 'dark' ? '#17251c' : '#f9fcf9',
                          borderColor: theme.bd,
                          marginBottom: 10,
                        },
                      ]}
                    >
                      <View style={styles.plantTopRow}>
                        <View style={styles.plantTitleWrap}>
                          <Text style={[styles.plantNameText, { color: theme.tx }]}>
                            {plant.name}
                          </Text>
                          {plant.variety ? (
                            <Text style={[styles.plantVarietyText, { color: theme.mu }]}>
                              Сорт: {plant.variety}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: st.color }]}>
                            {st.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.plantMetaRow}>
                        <Text style={[styles.plantQty, { color: theme.mu }]}>
                          Кількість: {plant.quantity ?? 1} шт.
                        </Text>
                      </View>

                      <View style={[styles.plantButtonsRow, { borderTopColor: theme.bd }]}>
                        <Pressable
                          style={styles.pActionBtn}
                          onPress={() => {
                            setDetailZone(null);
                            setHarvestPlant({ id: plant.id, name: plant.name });
                          }}
                        >
                          <Wheat size={14} color="#D35400" />
                          <Text style={[styles.pActionText, { color: '#D35400' }]}>Збір</Text>
                        </Pressable>

                        <Pressable
                          style={styles.pActionBtn}
                          onPress={() => {
                            setDetailZone(null);
                            setCarePlant({ id: plant.id, name: plant.name });
                          }}
                        >
                          <Droplets size={14} color="#2980B9" />
                          <Text style={[styles.pActionText, { color: '#2980B9' }]}>Догляд</Text>
                        </Pressable>

                        <Pressable
                          style={styles.pActionBtn}
                          onPress={() =>
                            confirmAction('Видалити рослину?', `Видалити "${plant.name}"?`, () =>
                              deletePlantMutation.mutate(plant.id),
                            )
                          }
                        >
                          <Trash2 size={14} color="#C0392B" />
                          <Text style={[styles.pActionText, { color: '#C0392B' }]}>Видалити</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              style={[styles.submitModalBtn, { backgroundColor: theme.pn, borderColor: theme.bd, borderWidth: 1, marginTop: 12 }]}
              onPress={() => setDetailZone(null)}
            >
              <Text style={[styles.submitModalBtnText, { color: theme.tx }]}>Закрити</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: Додати сад ================= */}
      <Modal visible={addGardenOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Створити новий сад</Text>
              <Pressable hitSlop={10} onPress={() => setAddGardenOpen(false)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Назва саду *</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={gardenName}
              onChangeText={setGardenName}
              placeholder="напр. Дача у Вишгороді"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Локація / місто</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={gardenLocation}
              onChangeText={setGardenLocation}
              placeholder="напр. Київська область"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Загальна площа (м²)</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={gardenArea}
              onChangeText={setGardenArea}
              keyboardType="numeric"
              placeholder="напр. 600"
              placeholderTextColor={theme.mu}
            />

            <Pressable
              style={[styles.submitModalBtn, { backgroundColor: theme.ac, opacity: !gardenName.trim() ? 0.6 : 1 }]}
              disabled={!gardenName.trim() || createGardenMutation.isPending}
              onPress={() => createGardenMutation.mutate()}
            >
              {createGardenMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitModalBtnText}>Створити сад</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: Додати зону ================= */}
      <Modal visible={addZoneOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Додати зону до саду</Text>
              <Pressable hitSlop={10} onPress={() => setAddZoneOpen(false)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Назва зони *</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={zoneName}
              onChangeText={setZoneName}
              placeholder="напр. Теплиця з перцем"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Тип зони</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.typesRow}>
                {ZONE_TYPES.map((zt) => {
                  const isSel = zoneType === zt.value;
                  return (
                    <Pressable
                      key={zt.value}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSel ? theme.ac : theme.bg,
                          borderColor: isSel ? theme.ac : theme.bd,
                        },
                      ]}
                      onPress={() => setZoneType(zt.value)}
                    >
                      <Text style={[styles.typeChipText, { color: isSel ? '#fff' : theme.tx }]}>
                        {zt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.mu }]}>Ширина (м)</Text>
                <TextInput
                  style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                  value={zoneWidth}
                  onChangeText={setZoneWidth}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={theme.mu}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.mu }]}>Довжина (м)</Text>
                <TextInput
                  style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                  value={zoneHeight}
                  onChangeText={setZoneHeight}
                  keyboardType="numeric"
                  placeholder="6"
                  placeholderTextColor={theme.mu}
                />
              </View>
            </View>

            <Pressable
              style={[styles.submitModalBtn, { backgroundColor: theme.ac, opacity: !zoneName.trim() ? 0.6 : 1 }]}
              disabled={!zoneName.trim() || createZoneMutation.isPending}
              onPress={() => createZoneMutation.mutate()}
            >
              {createZoneMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitModalBtnText}>Створити зону</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: Збір урожаю ================= */}
      <Modal visible={Boolean(harvestPlant)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>
                Зафіксувати урожай: {harvestPlant?.name}
              </Text>
              <Pressable hitSlop={10} onPress={() => setHarvestPlant(null)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Кількість *</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={harvestQty}
              onChangeText={setHarvestQty}
              keyboardType="numeric"
              placeholder="напр. 5"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Одиниця виміру</Text>
            <View style={styles.statusChipsRow}>
              {[
                { val: 'PIECE', label: 'Штук' },
                { val: 'GRAM', label: 'Грам' },
                { val: 'LITER', label: 'Літрів' },
              ].map((u) => (
                <Pressable
                  key={u.val}
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: harvestUnit === u.val ? '#D35400' : theme.bg,
                      borderColor: harvestUnit === u.val ? '#D35400' : theme.bd,
                    },
                  ]}
                  onPress={() => setHarvestUnit(u.val as any)}
                >
                  <Text style={{ color: harvestUnit === u.val ? '#fff' : theme.tx, fontSize: 13, fontWeight: '600' }}>
                    {u.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Нотатка про якість</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={harvestNotes}
              onChangeText={setHarvestNotes}
              placeholder="Стиглі, солодкі плоди"
              placeholderTextColor={theme.mu}
            />

            <Pressable
              style={[styles.submitModalBtn, { backgroundColor: '#D35400', opacity: !harvestQty.trim() ? 0.6 : 1 }]}
              disabled={!harvestQty.trim() || createHarvestMutation.isPending}
              onPress={() => createHarvestMutation.mutate()}
            >
              {createHarvestMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitModalBtnText}>Зберегти запис урожаю</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: Догляд / Полив ================= */}
      <Modal visible={Boolean(carePlant)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>
                Зафіксувати догляд: {carePlant?.name}
              </Text>
              <Pressable hitSlop={10} onPress={() => setCarePlant(null)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Тип операції</Text>
            <View style={styles.statusChipsRow}>
              {[
                { val: 'WATERING', label: 'Полив 💧' },
                { val: 'FERTILIZING', label: 'Добрива 🧪' },
                { val: 'WEEDING', label: 'Прополка 🌿' },
                { val: 'PRUNING', label: 'Обрізка ✂️' },
              ].map((c) => (
                <Pressable
                  key={c.val}
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: careType === c.val ? '#2980B9' : theme.bg,
                      borderColor: careType === c.val ? '#2980B9' : theme.bd,
                    },
                  ]}
                  onPress={() => setCareType(c.val)}
                >
                  <Text style={{ color: careType === c.val ? '#fff' : theme.tx, fontSize: 12, fontWeight: '600' }}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Коментар</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={careNotes}
              onChangeText={setCareNotes}
              placeholder="Полив теплою водою під корінь"
              placeholderTextColor={theme.mu}
            />

            <Pressable
              style={[styles.submitModalBtn, { backgroundColor: '#2980B9' }]}
              disabled={createCareMutation.isPending}
              onPress={() => createCareMutation.mutate()}
            >
              {createCareMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitModalBtnText}>Зафіксувати догляд</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  selectorWrap: { marginBottom: 14 },
  gardensList: { paddingHorizontal: 18, gap: 8 },
  gardenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  gardenChipText: { fontSize: 14, fontWeight: '600' },
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
  zoneBlock: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  zoneHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  zoneHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: '700' },
  zoneMeta: { fontSize: 12, marginTop: 2 },
  zoneActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plantInZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  plantInZoneText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionIconBtn: { padding: 6, borderRadius: 8 },
  deleteZoneBtn: { padding: 4 },
  toggleChevronBtn: { padding: 4, borderRadius: 8 },
  plantsContainer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 10,
  },
  noPlantsWrap: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  noPlantsText: { fontSize: 13 },
  smallAddPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallAddPlantText: { fontSize: 12, fontWeight: '700' },
  plantCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  plantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  plantTitleWrap: { flex: 1 },
  plantNameText: { fontSize: 15, fontWeight: '700' },
  plantVarietyText: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  plantMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plantQty: { fontSize: 12 },
  plantButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    justifyContent: 'space-around',
  },
  pActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  pActionText: { fontSize: 12, fontWeight: '600' },
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  typesRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  statusChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  submitModalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
