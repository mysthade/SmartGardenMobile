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
import { AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react-native';

export default function ProblemsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const plantsQuery = useQuery({
    queryKey: ['plants', 'problems'],
    queryFn: () => api.listPlants({ limit: 10 }),
    staleTime: 60_000,
  });

  const plantId = plantsQuery.data?.data[0]?.id;

  const problemsQuery = useQuery({
    queryKey: ['problems', plantId],
    queryFn: () => api.listProblems(plantId!),
    enabled: Boolean(plantId),
    staleTime: 60_000,
  });

  const problems = problemsQuery.data?.data ?? [];

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
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Проблеми та шкідники</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={problems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={problemsQuery.isRefetching || plantsQuery.isRefetching}
            onRefresh={() => {
              void plantsQuery.refetch();
              if (plantId) void problemsQuery.refetch();
            }}
            tintColor={theme.ac}
          />
        }
        ListEmptyComponent={
          problemsQuery.isLoading || plantsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.ac} size="large" />
              <Text style={[styles.muted, { color: theme.mu, marginTop: 12 }]}>
                Завантаження списку проблем…
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <CheckCircle2 size={40} color={theme.ac} />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>
                Шкідників або хвороб не виявлено!
              </Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                Ваш сад у безпеці. Якщо помітите пожовтіння листя чи паразитів — зафіксуйте їх тут.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isResolved = Boolean(item.resolvedAt);
          return (
            <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <ShieldAlert size={18} color={isResolved ? theme.ac : '#E74C3C'} />
                  <Text style={[styles.problemTitle, { color: theme.tx }]}>{item.title}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isResolved ? '#eaf6ee' : '#fdebd0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: isResolved ? theme.ac : '#D35400' },
                    ]}
                  >
                    {isResolved ? 'Вирішено' : 'Активна'}
                  </Text>
                </View>
              </View>
              {item.description ? (
                <Text style={[styles.desc, { color: theme.mu }]}>{item.description}</Text>
              ) : null}
            </View>
          );
        }}
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
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  problemTitle: { fontSize: 15, fontWeight: '700' },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
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
