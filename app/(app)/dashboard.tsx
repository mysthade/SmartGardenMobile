import { useDashboardSummary } from '@/src/hooks/use-dashboard-summary';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/src/lib/api';
import { useAuth } from '@/src/features/auth/auth-context';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const summary = useDashboardSummary();
  const gardens = useQuery({
    queryKey: ['gardens', 'dashboard'],
    queryFn: () => api.listGardens({ limit: 10 }),
    staleTime: 60_000,
  });

  const data = summary.data;
  const firstName = user?.name?.split(/\s+/)[0] ?? '';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => {
            void summary.refetch();
            void gardens.refetch();
          }}
          tintColor="#2F7A4F"
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Привіт, {firstName} 👋</Text>
          <Text style={styles.hint}>Ваш сад — ті самі дані, що й на сайті</Text>
        </View>
        <Pressable
          onPress={() => {
            void logout().then(() => router.replace('/login'));
          }}
        >
          <Text style={styles.logout}>Вихід</Text>
        </Pressable>
      </View>

      {summary.isError ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>Не вдалося завантажити огляд</Text>
          <Pressable onPress={() => void summary.refetch()}>
            <Text style={styles.retry}>Спробувати ще раз</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.metrics}>
        <Metric label="Сади" value={data?.gardensCount} loading={summary.isLoading} />
        <Metric label="Зони" value={data?.zonesCount} loading={summary.isLoading} />
        <Metric label="Рослини" value={data?.plantsCount} loading={summary.isLoading} />
        <Metric label="Задачі сьогодні" value={data?.tasksTodayCount} loading={summary.isLoading} />
      </View>

      <Text style={styles.sectionTitle}>Мої сади</Text>
      {gardens.isLoading ? (
        <View style={styles.card}>
          <Text style={styles.muted}>Завантаження…</Text>
        </View>
      ) : (gardens.data?.data.length ?? 0) === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>Ще немає садів. Створіть їх на сайті або тут згодом.</Text>
        </View>
      ) : (
        gardens.data?.data.map((garden) => (
          <View key={garden.id} style={styles.card}>
            <Text style={styles.gardenName}>{garden.name}</Text>
            {garden.description ? <Text style={styles.muted}>{garden.description}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{loading ? '…' : (value ?? 0)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCF8' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  hello: { fontSize: 22, fontWeight: '700', color: '#1C2A1F' },
  hint: { fontSize: 13, color: '#6B7A6E', marginTop: 2 },
  logout: { color: '#C0392B', fontSize: 14, fontWeight: '500' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E4EBE4',
    minWidth: '46%',
    flexGrow: 1,
  },
  metricValue: { fontSize: 26, fontWeight: '700', color: '#2F7A4F' },
  metricLabel: { fontSize: 12, color: '#6B7A6E', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1C2A1F', marginTop: 24, marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EBE4',
    marginBottom: 10,
  },
  gardenName: { fontSize: 16, fontWeight: '600', color: '#1C2A1F' },
  muted: { fontSize: 14, color: '#6B7A6E', marginTop: 4 },
  errorText: { color: '#C0392B', fontSize: 14 },
  retry: { color: '#2F7A4F', fontSize: 14, fontWeight: '500', marginTop: 8 },
});
