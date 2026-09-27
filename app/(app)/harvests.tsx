import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
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
import { ArrowLeft, Wheat, Calendar, Scale } from 'lucide-react-native';

export default function HarvestsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const plantsQuery = useQuery({
    queryKey: ['plants', 'harvests'],
    queryFn: () => api.listPlants({ limit: 10 }),
    staleTime: 60_000,
  });

  const plantId = plantsQuery.data?.data[0]?.id;

  const harvestsQuery = useQuery({
    queryKey: ['harvests', plantId],
    queryFn: () => api.listHarvests(plantId!),
    enabled: Boolean(plantId),
    staleTime: 60_000,
  });

  const harvests = harvestsQuery.data?.data ?? [];
  const totalWeight = harvests.reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 12 }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={theme.tx} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Облік урожаю</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Card */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.name === 'dark' ? '#261b11' : '#fef5e7',
            borderColor: theme.bd,
          },
        ]}
      >
        <View style={styles.summaryIconWrap}>
          <Wheat size={24} color="#D35400" />
        </View>
        <View>
          <Text style={[styles.summaryLabel, { color: theme.mu }]}>Всього зафіксовано зборів</Text>
          <Text style={[styles.summaryValue, { color: theme.tx }]}>
            {totalWeight > 0 ? `${totalWeight} од.` : '0 од.'}
          </Text>
        </View>
      </View>

      <FlatList
        data={harvests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={harvestsQuery.isRefetching || plantsQuery.isRefetching}
            onRefresh={() => {
              void plantsQuery.refetch();
              if (plantId) void harvestsQuery.refetch();
            }}
            tintColor={theme.ac}
          />
        }
        ListEmptyComponent={
          harvestsQuery.isLoading || plantsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.ac} size="large" />
              <Text style={[styles.muted, { color: theme.mu, marginTop: 12 }]}>
                Завантаження записів урожаю…
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <Wheat size={40} color="#D35400" />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>
                Ще немає записів про збір урожаю
              </Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                Фіксуйте кількість та якість зібраних овочів, фруктів та ягід.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cropName, { color: theme.tx }]}>Збір урожаю</Text>
              <View style={styles.weightTag}>
                <Scale size={14} color="#D35400" />
                <Text style={styles.weightText}>
                  {item.quantity} {item.unit === 'GRAM' ? 'г' : item.unit === 'PIECE' ? 'шт' : 'л'}
                </Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.dateRow}>
                <Calendar size={13} color={theme.mu} />
                <Text style={[styles.dateText, { color: theme.mu }]}>
                  {new Date(item.harvestedAt).toLocaleDateString('uk-UA')}
                </Text>
              </View>
              {item.notes ? (
                <Text style={[styles.notesText, { color: theme.mu }]} numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 18, fontWeight: '700' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  listContent: { paddingHorizontal: 18, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropName: { fontSize: 16, fontWeight: '700' },
  weightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef5e7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  weightText: { color: '#D35400', fontSize: 13, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12 },
  notesText: { fontSize: 12, flex: 1 },
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
