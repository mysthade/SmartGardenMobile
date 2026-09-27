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
import { ArrowLeft, BookOpen, Calendar, Camera } from 'lucide-react-native';

export default function JournalScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const plantsQuery = useQuery({
    queryKey: ['plants', 'journal'],
    queryFn: () => api.listPlants({ limit: 10 }),
    staleTime: 60_000,
  });

  const plantId = plantsQuery.data?.data[0]?.id;

  const journalQuery = useQuery({
    queryKey: ['journal', plantId],
    queryFn: () => api.listJournal(plantId!),
    enabled: Boolean(plantId),
    staleTime: 60_000,
  });

  const entries = journalQuery.data?.data ?? [];

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
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Фото-щоденник</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={journalQuery.isRefetching || plantsQuery.isRefetching}
            onRefresh={() => {
              void plantsQuery.refetch();
              if (plantId) void journalQuery.refetch();
            }}
            tintColor={theme.ac}
          />
        }
        ListEmptyComponent={
          journalQuery.isLoading || plantsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.ac} size="large" />
              <Text style={[styles.muted, { color: theme.mu, marginTop: 12 }]}>
                Завантаження щоденника…
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <Camera size={40} color={theme.ac} />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>
                Ще немає записів у щоденнику
              </Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                Фіксуйте динаміку росту ваших рослин, додавайте замітки та спостереження.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.cardHeader}>
              <View style={styles.dateRow}>
                <Calendar size={14} color={theme.mu} />
                <Text style={[styles.dateText, { color: theme.mu }]}>
                  {new Date(item.observedAt).toLocaleDateString('uk-UA')}
                </Text>
              </View>
              <Text style={[styles.plantTag, { color: theme.ac }]}>🌱 Запис росту</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.tx }]}>{item.title}</Text>
            {item.description ? (
              <Text style={[styles.cardText, { color: theme.mu }]}>{item.description}</Text>
            ) : null}
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
  listContent: { paddingHorizontal: 18, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '500' },
  plantTag: { fontSize: 13, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardText: { fontSize: 13, lineHeight: 18 },
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
