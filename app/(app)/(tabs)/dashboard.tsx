import { useDashboardSummary } from '@/src/hooks/use-dashboard-summary';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { useAuth } from '@/src/features/auth/auth-context';
import { useTheme } from '@/src/theme/theme-context';
import {
  Trees,
  Map,
  Leaf,
  ClipboardList,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Sun,
  Droplets,
  Calendar,
} from 'lucide-react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const summary = useDashboardSummary();

  const gardens = useQuery({
    queryKey: ['gardens', 'dashboard'],
    queryFn: () => api.listGardens({ limit: 10 }),
    staleTime: 60_000,
  });

  const data = summary.data;
  const firstName = user?.name?.split(/\s+/)[0] ?? 'садівнику';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => {
            void summary.refetch();
            void gardens.refetch();
          }}
          tintColor={theme.ac}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.tx }]}>Привіт, {firstName} 👋</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Ваш сад — актуальні дані з веб-версії
          </Text>
        </View>
      </View>

      {/* Weather & Garden Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: theme.name === 'dark' ? '#17281f' : '#eaf6ee',
            borderColor: theme.bd,
          },
        ]}
      >
        <View style={styles.bannerHeader}>
          <View style={styles.bannerBadge}>
            <Sparkles size={14} color={theme.ac} />
            <Text style={[styles.badgeText, { color: theme.ac }]}>Статус саду</Text>
          </View>
          <View style={styles.bannerRow}>
            <Sun size={18} color="#E67E22" />
            <Text style={[styles.weatherText, { color: theme.tx }]}>+21°C Сонячно</Text>
          </View>
        </View>
        <Text style={[styles.bannerAdvice, { color: theme.tx }]}>
          Сприятливий день для догляду за грядками та поливу ввечері.
        </Text>
      </View>

      {/* Quick Action Chips */}
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.actionChip, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.push('/tasks')}
        >
          <Droplets size={16} color={theme.ac} />
          <Text style={[styles.actionChipText, { color: theme.tx }]}>Полив</Text>
        </Pressable>

        <Pressable
          style={[styles.actionChip, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.push('/tasks')}
        >
          <Calendar size={16} color={theme.ac} />
          <Text style={[styles.actionChipText, { color: theme.tx }]}>Завдання</Text>
        </Pressable>

        <Pressable
          style={[styles.actionChip, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.push('/gardens')}
        >
          <PlusCircle size={16} color={theme.ac} />
          <Text style={[styles.actionChipText, { color: theme.tx }]}>Нова рослина</Text>
        </Pressable>
      </View>

      {/* Metrics 2x2 Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.tx }]}>Показники саду</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          label="Сади"
          value={data?.gardensCount}
          loading={summary.isLoading}
          icon={<Trees size={20} color={theme.ac} />}
          theme={theme}
          onPress={() => router.push('/gardens')}
        />
        <MetricCard
          label="Зони"
          value={data?.zonesCount}
          loading={summary.isLoading}
          icon={<Map size={20} color={theme.ac} />}
          theme={theme}
          onPress={() => router.push('/gardens')}
        />
        <MetricCard
          label="Рослини"
          value={data?.plantsCount}
          loading={summary.isLoading}
          icon={<Leaf size={20} color={theme.ac} />}
          theme={theme}
          onPress={() => router.push('/gardens')}
        />
        <MetricCard
          label="Задачі на сьогодні"
          value={data?.tasksTodayCount}
          loading={summary.isLoading}
          icon={<ClipboardList size={20} color={theme.ac} />}
          theme={theme}
          onPress={() => router.push('/tasks')}
        />
      </View>

      {/* Gardens Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.tx }]}>Мої сади</Text>
        <Pressable onPress={() => router.push('/gardens')}>
          <Text style={[styles.seeAll, { color: theme.ac }]}>Всі сади →</Text>
        </Pressable>
      </View>

      {gardens.isLoading ? (
        <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Text style={[styles.muted, { color: theme.mu }]}>Завантаження садів…</Text>
        </View>
      ) : (gardens.data?.data.length ?? 0) === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Text style={[styles.muted, { color: theme.mu }]}>
            Ще немає створених садів. Перейдіть у вкладку «Сади» для створення першого саду.
          </Text>
        </View>
      ) : (
        gardens.data?.data.map((garden) => (
          <Pressable
            key={garden.id}
            style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}
            onPress={() => router.push('/gardens')}
          >
            <View style={styles.gardenCardHeader}>
              <View style={styles.gardenTitleRow}>
                <Trees size={18} color={theme.ac} />
                <Text style={[styles.gardenName, { color: theme.tx }]}>{garden.name}</Text>
              </View>
              <ArrowRight size={16} color={theme.mu} />
            </View>
            {garden.description ? (
              <Text style={[styles.muted, { color: theme.mu }]} numberOfLines={2}>
                {garden.description}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  loading,
  icon,
  theme,
  onPress,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: React.ReactNode;
  theme: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.metricCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}
      onPress={onPress}
    >
      <View style={styles.metricIconRow}>
        <View
          style={[
            styles.metricIconWrap,
            { backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee' },
          ]}
        >
          {icon}
        </View>
        <Text style={[styles.metricValue, { color: theme.tx }]}>
          {loading ? '…' : (value ?? 0)}
        </Text>
      </View>
      <Text style={[styles.metricLabel, { color: theme.mu }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  header: {
    marginBottom: 16,
  },
  greeting: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  statusBanner: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weatherText: { fontSize: 13, fontWeight: '600' },
  bannerAdvice: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionChipText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontSize: 24, fontWeight: '800' },
  metricLabel: { fontSize: 13, fontWeight: '500' },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  gardenCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gardenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gardenName: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, marginTop: 6, lineHeight: 18 },
});
