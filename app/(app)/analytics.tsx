import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import { type ThemeTokens } from '@/src/theme/tokens';
import { ArrowLeft, ChevronRight, Sprout, TrendingUp, Wheat } from 'lucide-react-native';
import { convertToKg } from '@/src/features/harvests/lib/harvest-calculations';

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.getAnalyticsSummary(),
    staleTime: 60_000,
  });

  const harvestsQuery = useQuery({
    queryKey: ['harvests', 'all'],
    queryFn: () => api.listAllHarvests({ limit: 100 }),
    staleTime: 60_000,
  });

  const data = summaryQuery.data;
  const harvests = harvestsQuery.data?.data ?? [];

  // Total harvest kg this year (synchronized with harvests.tsx)
  const currentYear = new Date().getFullYear();
  let seasonMassKg = 0;
  for (const h of harvests) {
    if (new Date(h.harvestedAt).getFullYear() === currentYear) {
      const kg = convertToKg(Number(h.quantity) || 0, h.unit);
      if (kg !== null) seasonMassKg += kg;
    }
  }
  seasonMassKg = Math.round(seasonMassKg * 10) / 10;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={theme.tx} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Аналітика саду</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Harvest Shortcut Banner */}
      <Pressable
        style={[
          styles.harvestBanner,
          {
            backgroundColor: theme.name === 'dark' ? '#261b11' : '#fef5e7',
            borderColor: theme.bd,
          },
        ]}
        onPress={() => router.push('/harvests' as never)}
      >
        <View style={styles.harvestBannerLeft}>
          <View style={styles.harvestIconWrap}>
            <Wheat size={22} color="#D35400" />
          </View>
          <View>
            <Text style={[styles.harvestBannerTitle, { color: theme.tx }]}>
              Урожай сезону {currentYear}: {seasonMassKg} кг
            </Text>
            <Text style={[styles.harvestBannerSub, { color: theme.mu }]}>
              Детальні підсумки, залишки на складі та графіки
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#D35400" />
      </Pressable>

      {/* Overview Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <TrendingUp size={20} color={theme.ac} />
          <Text style={[styles.statNumber, { color: theme.tx }]}>
            {data?.openTasksCount ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]}>Активних завдань</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Sprout size={20} color="#27AE60" />
          <Text style={[styles.statNumber, { color: theme.tx }]}>
            {data?.plantsCount ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]}>Рослин у саду</Text>
        </View>
      </View>

      {/* Progress Bars */}
      <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <Text style={[styles.cardTitle, { color: theme.tx }]}>Баланс операцій догляду</Text>

        <ProgressBar label="Полив та зволоження" percentage={92} color="#2980B9" theme={theme} />
        <ProgressBar label="Підживлення та добрива" percentage={65} color="#8E44AD" theme={theme} />
        <ProgressBar label="Прополка та мульчування" percentage={78} color="#27AE60" theme={theme} />
        <ProgressBar label="Профілактика шкідників" percentage={84} color="#D35400" theme={theme} />
      </View>

      {/* Productivity Note */}
      <View
        style={[
          styles.noteCard,
          {
            backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee',
            borderColor: theme.bd,
          },
        ]}
      >
        <Text style={[styles.noteTitle, { color: theme.ac }]}>🌿 Висока активність догляду</Text>
        <Text style={[styles.noteText, { color: theme.tx }]}>
          Ваш графік поливу відповідає погодним умовам сезону. Більшість рослин перебувають у стадії активного вегетативного росту.
        </Text>
      </View>
    </ScrollView>
  );
}

function ProgressBar({
  label,
  percentage,
  color,
  theme,
}: {
  label: string;
  percentage: number;
  color: string;
  theme: ThemeTokens;
}) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: theme.tx }]}>{label}</Text>
        <Text style={[styles.progressVal, { color: theme.mu }]}>{percentage}%</Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: theme.name === 'dark' ? '#222f27' : '#ebf0eb' }]}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  harvestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  harvestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  harvestIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  harvestBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  statNumber: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13 },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  progressWrap: { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressVal: { fontSize: 13, fontWeight: '700' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  noteCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  noteTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  noteText: { fontSize: 13, lineHeight: 18 },
});
