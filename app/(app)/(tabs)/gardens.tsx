import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import { Trees, Map, Plus, ChevronRight, Sprout, Layers } from 'lucide-react-native';

export default function GardensScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedGardenId, setSelectedGardenId] = useState<string | null>(null);

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

  const gardens = gardensQuery.data?.data ?? [];
  const zones = zonesQuery.data?.data ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.tx }]}>Мої сади та зони</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Керуйте територіями, грядками та посадками
          </Text>
        </View>
      </View>

      {/* Gardens Horizontal Selector */}
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
                      backgroundColor: isSelected
                        ? theme.ac
                        : theme.pn,
                      borderColor: isSelected ? theme.ac : theme.bd,
                    },
                  ]}
                  onPress={() => setSelectedGardenId(item.id)}
                >
                  <Trees size={16} color={isSelected ? '#ffffff' : theme.mu} />
                  <Text
                    style={[
                      styles.gardenChipText,
                      { color: isSelected ? '#ffffff' : theme.tx },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {/* Main Zones Content */}
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
            }}
            tintColor={theme.ac}
          />
        }
        ListHeaderComponent={
          <View style={styles.zonesHeader}>
            <View style={styles.zonesTitleRow}>
              <Layers size={18} color={theme.ac} />
              <Text style={[styles.zonesTitle, { color: theme.tx }]}>
                Зони саду ({zones.length})
              </Text>
            </View>
          </View>
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
              <Map size={36} color={theme.mu} />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>Немає зон у цьому саді</Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                Створіть зони (наприклад «Теплиця», «Грядка з полуницею»), щоб додавати рослини.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.zoneCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.zoneIconWrap}>
              <Sprout size={20} color={theme.ac} />
            </View>
            <View style={styles.zoneInfo}>
              <Text style={[styles.zoneName, { color: theme.tx }]}>{item.name}</Text>
              <Text style={[styles.zoneMeta, { color: theme.mu }]}>
                {item.type ? `Тип: ${item.type}` : 'Зона посадки'}
                {item.area ? ` • ${item.area} м²` : ''}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.mu} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 18, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  selectorWrap: { marginBottom: 16 },
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
  zonesContent: { paddingHorizontal: 18, paddingBottom: 40 },
  zonesHeader: { marginBottom: 12 },
  zonesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zonesTitle: { fontSize: 17, fontWeight: '700' },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  zoneIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: '700' },
  zoneMeta: { fontSize: 13, marginTop: 4 },
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
  center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
});
