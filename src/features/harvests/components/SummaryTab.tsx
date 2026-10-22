import { memo, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Calendar,
  Layers,
  Scale,
  TrendingUp,
} from 'lucide-react-native';
import type { HarvestDto, PlantDto, ZoneDto } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import {
  buildMonthlySeries,
  calculateZoneYieldStats,
  compareHarvestSeasons,
  getAvailableHarvestYears,
} from '../lib/harvest-calculations';
import { getUnitShortLabel } from '../lib/harvest-defaults';
import { HarvestChartsSvg } from './HarvestChartsSvg';

interface SummaryTabProps {
  harvests: Array<HarvestDto & { plantName?: string; zoneId?: string; zoneName?: string }>;
  zones: ZoneDto[];
  plants: PlantDto[];
  theme: ThemeTokens;
  onFilterByZone?: (zoneId: string) => void;
  onFilterByCrop?: (cropName: string) => void;
}

function SummaryTabInner({
  harvests,
  zones,
  plants,
  theme,
  onFilterByZone,
  onFilterByCrop,
}: SummaryTabProps) {
  const availableYears = useMemo(() => getAvailableHarvestYears(harvests), [harvests]);
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] ?? new Date().getFullYear(),
  );

  const comparison = useMemo(
    () => compareHarvestSeasons(harvests, zones, plants, selectedYear),
    [harvests, zones, plants, selectedYear],
  );

  const zoneYields = useMemo(
    () => calculateZoneYieldStats(harvests, zones, plants, selectedYear),
    [harvests, zones, plants, selectedYear],
  );

  const monthlyData = useMemo(
    () => buildMonthlySeries(harvests, selectedYear),
    [harvests, selectedYear],
  );

  // Overall average yield kg/m2 for garden
  const totalGardenArea = zones.reduce((acc, z) => acc + (Number(z.area) || 0), 0);
  const gardenYieldKgPerM2 =
    totalGardenArea > 0
      ? Math.round((comparison.currentTotalMassKg / totalGardenArea) * 100) / 100
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Year Chips */}
      <View style={styles.yearChipsRow}>
        {availableYears.map((yr) => {
          const isSelected = selectedYear === yr;
          return (
            <Pressable
              key={yr}
              onPress={() => setSelectedYear(yr)}
              style={[
                styles.yearChip,
                {
                  backgroundColor: isSelected ? theme.ac : theme.pn,
                  borderColor: isSelected ? theme.ac : theme.bd,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Сезон ${yr}`}
            >
              <Calendar size={14} color={isSelected ? '#ffffff' : theme.mu} />
              <Text
                style={[
                  styles.yearChipText,
                  { color: isSelected ? '#ffffff' : theme.tx },
                ]}
              >
                Сезон {yr}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Main Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        {/* Mass Card */}
        <View style={[styles.metricCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.metricCardHeader}>
            <Scale size={18} color="#D35400" />
            <Text style={[styles.metricCardLabel, { color: theme.mu }]}>Загальна маса</Text>
          </View>
          <Text style={[styles.metricCardValue, { color: theme.tx }]}>
            {comparison.currentTotalMassKg} <Text style={{ fontSize: 16 }}>кг</Text>
          </Text>

          {/* Comparison Delta */}
          <View style={styles.deltaRow}>
            {comparison.massDiffKg >= 0 ? (
              <ArrowUpRight size={14} color="#27AE60" />
            ) : (
              <ArrowDownRight size={14} color="#E74C3C" />
            )}
            <Text
              style={[
                styles.deltaText,
                { color: comparison.massDiffKg >= 0 ? '#27AE60' : '#E74C3C' },
              ]}
            >
              {comparison.massDiffKg >= 0 ? `+${comparison.massDiffKg}` : comparison.massDiffKg} кг
              ({comparison.massDiffPercent >= 0 ? `+${comparison.massDiffPercent}` : comparison.massDiffPercent}%)
            </Text>
          </View>
        </View>

        {/* Yield per m2 Card */}
        <View style={[styles.metricCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.metricCardHeader}>
            <TrendingUp size={18} color={theme.ac} />
            <Text style={[styles.metricCardLabel, { color: theme.mu }]}>Врожайність</Text>
          </View>
          <Text style={[styles.metricCardValue, { color: theme.tx }]}>
            {gardenYieldKgPerM2} <Text style={{ fontSize: 16 }}>кг/м²</Text>
          </Text>
          <Text style={[styles.deltaText, { color: theme.mu }]}>
            з {totalGardenArea} м² площі
          </Text>
        </View>
      </View>

      {/* Secondary Metrics: Pieces & Liters */}
      <View style={styles.metricsGrid}>
        <View style={[styles.miniMetricCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Text style={[styles.miniMetricLabel, { color: theme.mu }]}>Штучний урожай</Text>
          <Text style={[styles.miniMetricValue, { color: theme.tx }]}>
            {comparison.currentTotalPieces} шт
          </Text>
          <Text style={[styles.miniDelta, { color: comparison.piecesDiff >= 0 ? '#27AE60' : '#E74C3C' }]}>
            {comparison.piecesDiff >= 0 ? `+${comparison.piecesDiff}` : comparison.piecesDiff} шт vs {comparison.previousSeasonYear}
          </Text>
        </View>

        <View style={[styles.miniMetricCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Text style={[styles.miniMetricLabel, { color: theme.mu }]}>Рідкий урожай</Text>
          <Text style={[styles.miniMetricValue, { color: theme.tx }]}>
            {comparison.currentTotalLiters} л
          </Text>
          <Text style={[styles.miniDelta, { color: comparison.litersDiff >= 0 ? '#27AE60' : '#E74C3C' }]}>
            {comparison.litersDiff >= 0 ? `+${comparison.litersDiff}` : comparison.litersDiff} л vs {comparison.previousSeasonYear}
          </Text>
        </View>
      </View>

      {/* SVG Charts */}
      <HarvestChartsSvg monthlyData={monthlyData} theme={theme} year={selectedYear} />

      {/* Best & Worst Zones Callout */}
      {comparison.bestZone ? (
        <View style={styles.zonesHighlightRow}>
          <View style={[styles.highlightBox, { backgroundColor: theme.pn, borderColor: '#27AE60' }]}>
            <View style={styles.highlightHeader}>
              <Award size={16} color="#27AE60" />
              <Text style={[styles.highlightTitle, { color: '#27AE60' }]}>Найкраща грядка</Text>
            </View>
            <Text style={[styles.highlightName, { color: theme.tx }]} numberOfLines={1}>
              {comparison.bestZone.name}
            </Text>
            <Text style={[styles.highlightMeta, { color: theme.mu }]}>
              {comparison.bestZone.yieldKgPerM2} кг/м² ({comparison.bestZone.totalKg} кг)
            </Text>
          </View>

          {comparison.worstZone ? (
            <View style={[styles.highlightBox, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <View style={styles.highlightHeader}>
                <Layers size={16} color={theme.mu} />
                <Text style={[styles.highlightTitle, { color: theme.mu }]}>Потребує уваги</Text>
              </View>
              <Text style={[styles.highlightName, { color: theme.tx }]} numberOfLines={1}>
                {comparison.worstZone.name}
              </Text>
              <Text style={[styles.highlightMeta, { color: theme.mu }]}>
                {comparison.worstZone.yieldKgPerM2} кг/м² ({comparison.worstZone.totalKg} кг)
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Top Crops Breakdown */}
      {comparison.topCrops.length > 0 ? (
        <View style={[styles.sectionCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Text style={[styles.sectionTitle, { color: theme.tx }]}>Топ-культури сезону {selectedYear}</Text>
          <View style={styles.topCropsList}>
            {comparison.topCrops.map((c, idx) => (
              <Pressable
                key={c.name}
                style={styles.topCropRow}
                onPress={() => onFilterCropSafe(c.name, onFilterByCrop)}
              >
                <View style={styles.topCropRank}>
                  <Text style={[styles.rankNumber, { color: theme.ac }]}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topCropName, { color: theme.tx }]}>{c.name}</Text>
                  <Text style={[styles.topCropSub, { color: theme.mu }]}>
                    {c.massKg ? `${c.massKg} кг` : `${c.quantity} ${getUnitShortLabel(c.unit)}`}
                  </Text>
                </View>
                <Text style={[styles.topCropQty, { color: theme.tx }]}>
                  {c.quantity} {getUnitShortLabel(c.unit)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Zones Yield Table */}
      <View style={[styles.sectionCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <Text style={[styles.sectionTitle, { color: theme.tx }]}>Врожайність за зонами (кг/м²)</Text>
        {zoneYields.map((zy) => (
          <Pressable
            key={zy.zoneId}
            style={styles.zoneYieldRow}
            onPress={() => onFilterZoneSafe(zy.zoneId, onFilterByZone)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.zoneYieldName, { color: theme.tx }]}>{zy.zoneName}</Text>
              <Text style={[styles.zoneYieldMeta, { color: theme.mu }]}>
                Площа: {zy.areaM2} м² · Культур: {zy.cropsCount}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.zoneYieldVal, { color: theme.ac }]}>
                {zy.yieldKgPerM2} кг/м²
              </Text>
              <Text style={[styles.zoneYieldTotal, { color: theme.mu }]}>
                {zy.totalMassKg} кг
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function onFilterZoneSafe(zoneId: string, cb?: (zid: string) => void) {
  cb?.(zoneId);
}

function onFilterCropSafe(cropName: string, cb?: (name: string) => void) {
  cb?.(cropName);
}

export const SummaryTab = memo(SummaryTabInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 90,
  },
  yearChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  yearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 38,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricCardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricCardValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniMetricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  miniMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  miniDelta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  zonesHighlightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  highlightBox: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  highlightName: {
    fontSize: 15,
    fontWeight: '800',
  },
  highlightMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  topCropsList: {
    gap: 10,
  },
  topCropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  topCropRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  topCropName: {
    fontSize: 14,
    fontWeight: '700',
  },
  topCropSub: {
    fontSize: 11,
  },
  topCropQty: {
    fontSize: 14,
    fontWeight: '800',
  },
  zoneYieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  zoneYieldName: {
    fontSize: 14,
    fontWeight: '700',
  },
  zoneYieldMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  zoneYieldVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  zoneYieldTotal: {
    fontSize: 11,
  },
});
