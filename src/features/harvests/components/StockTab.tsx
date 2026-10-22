import { memo, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowUpDown, Box, Minus, Search, ShieldCheck } from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import { getUnitShortLabel } from '../lib/harvest-defaults';
import type { CropStockBalance } from '../types';

interface StockTabProps {
  stockBalances: CropStockBalance[];
  theme: ThemeTokens;
  onOpenUsage: (item: CropStockBalance) => void;
}

type SortMode = 'QUANTITY' | 'DATE' | 'NAME';

function StockTabInner({ stockBalances, theme, onOpenUsage }: StockTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('QUANTITY');

  const filteredBalances = useMemo(() => {
    let list = stockBalances;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) =>
        item.plantName.toLowerCase().includes(q) ||
        item.zoneNames.some((z) => z.toLowerCase().includes(q)),
      );
    }

    return [...list].sort((a, b) => {
      if (sortMode === 'QUANTITY') {
        return b.remaining - a.remaining;
      }
      if (sortMode === 'DATE') {
        const da = a.lastHarvestDate ? new Date(a.lastHarvestDate).getTime() : 0;
        const db = b.lastHarvestDate ? new Date(b.lastHarvestDate).getTime() : 0;
        return db - da;
      }
      return a.plantName.localeCompare(b.plantName);
    });
  }, [stockBalances, searchQuery, sortMode]);

  return (
    <View style={styles.container}>
      {/* Search and Sort Toolbar */}
      <View style={styles.toolbar}>
        <View style={[styles.searchBox, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Search size={16} color={theme.mu} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Пошук у запасах..."
            placeholderTextColor={theme.mu}
            style={[styles.searchInput, { color: theme.tx }]}
          />
        </View>

        <Pressable
          style={[styles.sortBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => {
            setSortMode((prev) => {
              if (prev === 'QUANTITY') return 'DATE';
              if (prev === 'DATE') return 'NAME';
              return 'QUANTITY';
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Змінити сортування"
        >
          <ArrowUpDown size={16} color={theme.ac} />
          <Text style={[styles.sortBtnText, { color: theme.tx }]}>
            {sortMode === 'QUANTITY' ? 'За кількістю' : sortMode === 'DATE' ? 'За датою' : 'За назвою'}
          </Text>
        </Pressable>
      </View>

      {/* Info notice badge */}
      <View style={[styles.noticeBadge, { backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee', borderColor: theme.bd }]}>
        <ShieldCheck size={16} color={theme.ac} />
        <Text style={[styles.noticeText, { color: theme.tx }]}>
          Облік запасів (зібрано − використано). Списання синхронізуються лише на цьому пристрої.
        </Text>
      </View>

      {/* List of Crop Stock Cards */}
      <FlatList
        data={filteredBalances}
        keyExtractor={(item) => `${item.plantName}_${item.unit}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <Box size={40} color={theme.mu} />
            <Text style={[styles.emptyTitle, { color: theme.tx }]}>
              {searchQuery ? 'За вашим запитом нічого не знайдено' : 'Запасів ще немає'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
              {searchQuery
                ? 'Спробуйте змінити пошукове слово'
                : 'Запишіть перший урожай через «+ Збір», щоб сформувати склад.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const unitShort = getUnitShortLabel(item.unit);
          const percentRemaining = item.totalHarvested > 0
            ? Math.round((item.remaining / item.totalHarvested) * 100)
            : 0;

          return (
            <View style={[styles.stockCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cropName, { color: theme.tx }]}>{item.plantName}</Text>
                  <Text style={[styles.cropMeta, { color: theme.mu }]}>
                    {item.zoneNames.length > 0 ? item.zoneNames.join(', ') : 'Усі грядки'}
                    {item.lastHarvestDate
                      ? ` · Збір: ${new Date(item.lastHarvestDate).toLocaleDateString('uk-UA')}`
                      : ''}
                  </Text>
                </View>

                {/* Quick Write-Off Action */}
                <Pressable
                  disabled={item.remaining <= 0}
                  style={[
                    styles.quickUseBtn,
                    {
                      backgroundColor: item.remaining > 0 ? theme.ac : theme.bd,
                      opacity: item.remaining > 0 ? 1 : 0.4,
                    },
                  ]}
                  onPress={() => onOpenUsage(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Списати запас ${item.plantName}`}
                >
                  <Minus size={16} color="#ffffff" />
                  <Text style={styles.quickUseBtnText}>Списати</Text>
                </Pressable>
              </View>

              {/* Balances Row */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.mu }]}>Зібрано</Text>
                  <Text style={[styles.metricVal, { color: theme.tx }]}>
                    {item.totalHarvested} {unitShort}
                  </Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.mu }]}>Використано</Text>
                  <Text style={[styles.metricVal, { color: '#E67E22' }]}>
                    {item.totalUsed} {unitShort}
                  </Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.mu }]}>Залишилось</Text>
                  <Text style={[styles.metricVal, { color: item.remaining > 0 ? theme.ac : '#E74C3C' }]}>
                    {item.remaining} {unitShort}
                  </Text>
                </View>
              </View>

              {/* Progress Scale */}
              <View style={styles.progressWrap}>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: theme.name === 'dark' ? '#222f27' : '#ebf0eb' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, percentRemaining))}%`,
                        backgroundColor: percentRemaining > 20 ? theme.ac : '#E74C3C',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.mu }]}>
                  {percentRemaining}% запасу в наявності
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

export const StockTab = memo(StockTabInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 90,
  },
  stockCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '800',
  },
  cropMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  quickUseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 36,
  },
  quickUseBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  progressWrap: {
    marginTop: 8,
    gap: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'right',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
