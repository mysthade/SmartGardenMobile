import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Sprout,
  Wheat,
} from 'lucide-react-native';
import { QueryErrorCard } from '@/src/components/QueryErrorCard';
import {
  buildProductivityInsights,
  computeCareBreakdown,
  computeHarvestMetrics,
  computeStatusBreakdown,
  computeTaskCompletionRate,
} from '@/src/features/analytics/lib/analytics-metrics';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import { type ThemeTokens } from '@/src/theme/tokens';

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedGardenId, setSelectedGardenId] = useState<string | undefined>(undefined);

  const gardensQuery = useQuery({
    queryKey: ['gardens', 'analytics-filter'],
    queryFn: () => api.listGardens({ limit: 50 }),
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary', selectedGardenId ?? 'all'],
    queryFn: () => api.getAnalyticsSummary(selectedGardenId),
    staleTime: 30_000,
  });

  const gardens = gardensQuery.data?.data ?? [];
  const data = summaryQuery.data;
  const currentYear = new Date().getFullYear();

  const harvestMetrics = computeHarvestMetrics(data, currentYear);
  const taskCompletionRate = computeTaskCompletionRate(data);
  const careBreakdown = computeCareBreakdown(data?.careByType ?? []);
  const statusBreakdown = computeStatusBreakdown(data?.plantsByStatus ?? []);
  const insights = buildProductivityInsights(
    data,
    harvestMetrics.seasonMassKg,
    harvestMetrics.yieldKgPerSqM,
  );

  const maxMonthlyKg = Math.max(0.1, ...harvestMetrics.monthlyMassSeries.map((p) => p.kg));

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={summaryQuery.isRefetching}
          onRefresh={() => {
            void summaryQuery.refetch();
            void gardensQuery.refetch();
          }}
          colors={[theme.ac]}
        />
      }
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={theme.tx} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Аналітика продуктивності</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Garden Filter */}
      {gardens.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setSelectedGardenId(undefined)}
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedGardenId ? theme.ac : theme.pn,
                borderColor: !selectedGardenId ? theme.ac : theme.bd,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: !selectedGardenId ? '#fff' : theme.tx }]}>
              Усі сади
            </Text>
          </Pressable>
          {gardens.map((garden) => {
            const active = selectedGardenId === garden.id;
            return (
              <Pressable
                key={garden.id}
                onPress={() => setSelectedGardenId(garden.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.ac : theme.pn,
                    borderColor: active ? theme.ac : theme.bd,
                  },
                ]}
              >
                <Text style={[styles.filterText, { color: active ? '#fff' : theme.tx }]}>
                  {garden.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {summaryQuery.isError && !data ? (
        <QueryErrorCard
          error={summaryQuery.error}
          fallbackMessage="Не вдалося завантажити аналітику саду"
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : null}

      {/* Harvest & Yield Hero Banner */}
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
          <View style={{ flex: 1 }}>
            <Text style={[styles.harvestBannerTitle, { color: theme.tx }]}>
              Урожай {currentYear}: {harvestMetrics.seasonMassKg} кг
              {harvestMetrics.seasonPieces > 0 ? ` · ${harvestMetrics.seasonPieces} шт` : ''}
              {harvestMetrics.seasonLiters > 0 ? ` · ${harvestMetrics.seasonLiters} л` : ''}
            </Text>
            <Text style={[styles.harvestBannerSub, { color: theme.mu }]}>
              {harvestMetrics.yieldKgPerSqM !== null
                ? `Продуктивність: ${harvestMetrics.yieldKgPerSqM} кг/м² · Площа ${Math.round((data?.totalAreaSqM ?? 0) * 10) / 10} м²`
                : `Зон: ${data?.zonesCount ?? 0} · Натисніть для детального обліку`}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#D35400" />
      </Pressable>

      {/* 2x2 Real KPI Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Sprout size={20} color="#27AE60" />
          <Text style={[styles.statNumber, { color: theme.tx }]}>{data?.plantsCount ?? 0}</Text>
          <Text style={[styles.statLabel, { color: theme.mu }]}>
            Рослин у {data?.zonesCount ?? 0} зонах
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <CheckCircle2 size={20} color={theme.ac} />
          <Text style={[styles.statNumber, { color: theme.tx }]}>
            {taskCompletionRate !== null ? `${taskCompletionRate}%` : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]}>
            Виконано завдань ({data?.completedTasksCount ?? 0}/{(data?.completedTasksCount ?? 0) + (data?.openTasksCount ?? 0)})
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Droplets size={20} color="#2980B9" />
          <Text style={[styles.statNumber, { color: theme.tx }]}>
            {data?.careLast30DaysCount ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]}>Операцій догляду за 30 дн.</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <AlertTriangle
            size={20}
            color={(data?.openProblemsCount ?? 0) > 0 ? '#D35400' : '#27AE60'}
          />
          <Text style={[styles.statNumber, { color: theme.tx }]}>
            {data?.openProblemsCount ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]}>
            Відкритих проблем · {data?.resolvedProblemsCount ?? 0} вир.
          </Text>
        </View>
      </View>

      {/* Monthly Harvest Dynamics */}
      <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.tx, marginBottom: 0 }]}>
            Динаміка врожаю (кг)
          </Text>
          <Text style={[styles.cardMeta, { color: theme.mu }]}>
            Всього: {harvestMetrics.totalMassKg} кг
          </Text>
        </View>

        {harvestMetrics.monthlyMassSeries.length === 0 ? (
          <Text style={[styles.emptyHint, { color: theme.mu }]}>
            Поки немає зафіксованих зборів у кілограмах або грамах.
          </Text>
        ) : (
          <View style={styles.chartRow}>
            {harvestMetrics.monthlyMassSeries.map((point) => {
              const heightPct = Math.max(8, Math.round((point.kg / maxMonthlyKg) * 100));
              return (
                <View key={point.period} style={styles.chartCol}>
                  <Text style={[styles.chartVal, { color: theme.tx }]}>{point.kg}</Text>
                  <View style={styles.chartTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${heightPct}%`, backgroundColor: '#D35400' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartLabel, { color: theme.mu }]}>{point.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Real Care Operations Breakdown */}
      <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.tx, marginBottom: 0 }]}>
            Реальний баланс догляду
          </Text>
          <Activity size={16} color={theme.mu} />
        </View>

        {careBreakdown.length === 0 ? (
          <Text style={[styles.emptyHint, { color: theme.mu }]}>
            Ще немає записів догляду. Додайте полив чи підживлення у вкладці «Догляд» рослини.
          </Text>
        ) : (
          careBreakdown.map((row) => (
            <ProgressBar
              key={row.key}
              label={`${row.label} (${row.count})`}
              percentage={row.percentage}
              color={row.color}
              theme={theme}
            />
          ))
        )}
      </View>

      {/* Plants by Status */}
      <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <Text style={[styles.cardTitle, { color: theme.tx }]}>Стан рослин за етапами</Text>
        {statusBreakdown.length === 0 ? (
          <Text style={[styles.emptyHint, { color: theme.mu }]}>
            У вибраному саду ще немає рослин.
          </Text>
        ) : (
          statusBreakdown.map((row) => (
            <ProgressBar
              key={row.key}
              label={`${row.label} (${row.count})`}
              percentage={row.percentage}
              color={row.color}
              theme={theme}
            />
          ))
        )}
      </View>

      {/* Data-driven Insights */}
      {insights.map((insight, index) => {
        const bg =
          insight.tone === 'warn'
            ? theme.name === 'dark'
              ? '#2b1b14'
              : '#fdecea'
            : insight.tone === 'info'
              ? theme.name === 'dark'
                ? '#18242e'
                : '#eaf3fa'
              : theme.name === 'dark'
                ? '#17251c'
                : '#eaf6ee';
        const titleColor =
          insight.tone === 'warn' ? '#C0392B' : insight.tone === 'info' ? '#2980B9' : theme.ac;

        return (
          <View
            key={`${insight.title}-${index}`}
            style={[styles.noteCard, { backgroundColor: bg, borderColor: theme.bd }]}
          >
            <Text style={[styles.noteTitle, { color: titleColor }]}>{insight.title}</Text>
            <Text style={[styles.noteText, { color: theme.tx }]}>{insight.message}</Text>
          </View>
        );
      })}
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
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 19, fontWeight: '700' },
  filterRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  harvestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  harvestBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  harvestIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(211, 84, 0, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestBannerTitle: { fontSize: 15, fontWeight: '700' },
  harvestBannerSub: { fontSize: 12, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  cardMeta: { fontSize: 12, fontWeight: '600' },
  emptyHint: { fontSize: 13, lineHeight: 19 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 130,
    paddingTop: 12,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartTrack: {
    width: 22,
    height: 82,
    justifyContent: 'flex-end',
    marginVertical: 4,
  },
  chartBar: {
    width: '100%',
    borderRadius: 6,
  },
  chartVal: { fontSize: 11, fontWeight: '700' },
  chartLabel: { fontSize: 11, fontWeight: '500' },
  progressWrap: { marginBottom: 14 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  progressVal: { fontSize: 13, fontWeight: '700' },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  noteTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  noteText: { fontSize: 13, lineHeight: 20 },
});
