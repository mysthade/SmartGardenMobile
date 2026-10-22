import { memo, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Calendar,
  Copy,
  Edit3,
  RefreshCw,
  Scale,
  Trash2,
  Wheat,
} from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import { getQualityLabel, getUnitShortLabel } from '../lib/harvest-defaults';
import type { HarvestExtendedItem, HarvestFilterType } from '../types';

interface HarvestsListTabProps {
  harvests: HarvestExtendedItem[];
  theme: ThemeTokens;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectHarvest: (item: HarvestExtendedItem) => void;
  onDuplicateHarvest: (item: HarvestExtendedItem) => void;
  onDeleteHarvest: (harvestId: string) => void;
  onRetrySync?: (harvestId: string) => void;
}

function HarvestsListTabInner({
  harvests,
  theme,
  loading,
  refreshing,
  onRefresh,
  onSelectHarvest,
  onDuplicateHarvest,
  onDeleteHarvest,
  onRetrySync,
}: HarvestsListTabProps) {
  const [activeFilter, setActiveFilter] = useState<HarvestFilterType>('ALL');

  // Filter items
  const filteredHarvests = useMemo(() => {
    switch (activeFilter) {
      case 'WITHOUT_DETAILS':
        return harvests.filter((h) => h.isWithoutDetails);
      case 'WITH_PHOTOS':
        return harvests.filter((h) => h.hasPhoto);
      case 'HAS_PROBLEMS':
        return harvests.filter((h) => h.hasProblem);
      case 'ALL':
      default:
        return harvests;
    }
  }, [harvests, activeFilter]);

  // Group by date string (e.g. "Сьогодні", "Вчора", або "20 жовтня 2026")
  const groupedSections = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groups: Array<{ title: string; dateKey: string; data: HarvestExtendedItem[] }> = [];
    const groupMap = new Map<string, HarvestExtendedItem[]>();

    for (const item of filteredHarvests) {
      const d = new Date(item.harvestedAt);
      const dateKey = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'other';
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(item);
    }

    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => b.localeCompare(a));

    for (const key of sortedKeys) {
      let title = key;
      if (key === todayStr) {
        title = 'Сьогодні';
      } else if (key === yesterdayStr) {
        title = 'Вчора';
      } else if (key !== 'other') {
        const d = new Date(key);
        title = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        title = 'Раніше';
      }

      groups.push({
        title,
        dateKey: key,
        data: groupMap.get(key)!,
      });
    }

    return groups;
  }, [filteredHarvests]);

  // Flatten for FlatList with section headers
  const flatData = useMemo(() => {
    const result: Array<{ type: 'HEADER'; title: string } | { type: 'ITEM'; item: HarvestExtendedItem }> = [];
    for (const g of groupedSections) {
      result.push({ type: 'HEADER', title: g.title });
      for (const item of g.data) {
        result.push({ type: 'ITEM', item });
      }
    }
    return result;
  }, [groupedSections]);

  const withoutDetailsCount = harvests.filter((h) => h.isWithoutDetails).length;

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      <View style={styles.filtersRow}>
        {(
          [
            { key: 'ALL', label: 'Усі збори' },
            {
              key: 'WITHOUT_DETAILS',
              label: withoutDetailsCount > 0 ? `Без деталей (${withoutDetailsCount})` : 'Без деталей',
            },
            { key: 'WITH_PHOTOS', label: 'З фото' },
            { key: 'HAS_PROBLEMS', label: 'Проблеми' },
          ] as const
        ).map((f) => {
          const isSelected = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected ? theme.ac : theme.pn,
                  borderColor: isSelected ? theme.ac : theme.bd,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Фільтр ${f.label}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isSelected ? '#ffffff' : theme.tx },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Main List */}
      <FlatList
        data={flatData}
        keyExtractor={(elem, idx) => (elem.type === 'HEADER' ? `hdr_${elem.title}` : `item_${elem.item.id}_${idx}`)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.ac} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.ac} size="large" />
              <Text style={[styles.muted, { color: theme.mu, marginTop: 12 }]}>
                Завантаження зборів…
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <Wheat size={40} color="#D35400" />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>
                {activeFilter === 'WITHOUT_DETAILS'
                  ? 'Усі збори мають заповнені деталі!'
                  : 'Ще немає записів про збір'}
              </Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                {activeFilter === 'WITHOUT_DETAILS'
                  ? 'Чудова робота — всі записи містять нотатки або оцінку якості.'
                  : 'Натисніть кнопку «+ Збір» внизу, щоб швидко зафіксувати зібраний урожай.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item: elem }) => {
          if (elem.type === 'HEADER') {
            return (
              <View style={styles.sectionHeaderRow}>
                <Calendar size={13} color={theme.mu} />
                <Text style={[styles.sectionHeaderText, { color: theme.mu }]}>
                  {elem.title}
                </Text>
              </View>
            );
          }

          const h = elem.item;
          const isOffline = h.syncStatus === 'PENDING' || h.syncStatus === 'FAILED';

          return (
            <Pressable
              onPress={() => onSelectHarvest(h)}
              onLongPress={() => onDuplicateHarvest(h)}
              style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}
              accessibilityRole="button"
              accessibilityLabel={`Збір урожаю ${h.plantName}, ${h.quantity} ${getUnitShortLabel(h.unit)}`}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cropName, { color: theme.tx }]}>{h.plantName}</Text>
                    {h.zoneName ? (
                      <Text style={[styles.zoneBadge, { color: theme.mu }]}>
                        · {h.zoneName}
                      </Text>
                    ) : null}
                  </View>

                  {/* Quality & status badges */}
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.qualityBadge,
                        {
                          backgroundColor:
                            h.quality === 'EXCELLENT'
                              ? '#eaf6ee'
                              : h.quality === 'GOOD'
                              ? '#ebf5fb'
                              : '#fef5e7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.qualityText,
                          {
                            color:
                              h.quality === 'EXCELLENT'
                                ? '#27AE60'
                                : h.quality === 'GOOD'
                                ? '#2980B9'
                                : '#D35400',
                          },
                        ]}
                      >
                        {getQualityLabel(h.quality)}
                      </Text>
                    </View>

                    {h.isWithoutDetails ? (
                      <View style={[styles.detailNoticeBadge, { backgroundColor: '#fdebd0' }]}>
                        <Text style={[styles.detailNoticeText, { color: '#D35400' }]}>
                          Без деталей
                        </Text>
                      </View>
                    ) : null}

                    {isOffline ? (
                      <Pressable
                        style={[styles.offlineBadge, { backgroundColor: '#fde8e8' }]}
                        onPress={() => onRetrySync?.(h.id)}
                      >
                        <RefreshCw size={10} color="#E74C3C" />
                        <Text style={[styles.offlineText, { color: '#E74C3C' }]}>
                          {h.syncStatus === 'FAILED' ? 'Помилка' : 'Офлайн'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* Big Quantity Tag */}
                <View style={styles.weightTag}>
                  <Scale size={14} color="#D35400" />
                  <Text style={styles.weightText}>
                    {h.quantity} {getUnitShortLabel(h.unit)}
                  </Text>
                </View>
              </View>

              {/* Notes Preview */}
              {h.notes ? (
                <Text style={[styles.notesText, { color: theme.tx }]} numberOfLines={2}>
                  {h.notes}
                </Text>
              ) : null}

              {/* Card Footer Actions */}
              <View style={[styles.cardFooter, { borderTopColor: 'rgba(128,128,128,0.1)' }]}>
                <Text style={[styles.dateText, { color: theme.mu }]}>
                  {new Date(h.harvestedAt).toLocaleTimeString('uk-UA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                <View style={styles.actionsRight}>
                  {h.isWithoutDetails ? (
                    <Pressable
                      style={styles.addDetailsBtn}
                      onPress={() => onSelectHarvest(h)}
                      hitSlop={6}
                    >
                      <Edit3 size={13} color={theme.ac} />
                      <Text style={[styles.addDetailsText, { color: theme.ac }]}>
                        Дозаповнити
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={styles.iconActionBtn}
                    onPress={() => onDuplicateHarvest(h)}
                    accessibilityLabel="Повторити цей збір"
                    hitSlop={6}
                  >
                    <Copy size={15} color={theme.mu} />
                  </Pressable>

                  <Pressable
                    style={styles.iconActionBtn}
                    onPress={() => onDeleteHarvest(h.id)}
                    accessibilityLabel="Видалити збір"
                    hitSlop={6}
                  >
                    <Trash2 size={15} color="#E74C3C" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export const HarvestsListTab = memo(HarvestsListTabInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 34,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 90,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '800',
  },
  zoneBadge: {
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailNoticeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailNoticeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '800',
  },
  weightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef5e7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  weightText: {
    color: '#D35400',
    fontSize: 15,
    fontWeight: '800',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 12,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addDetailsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconActionBtn: {
    padding: 4,
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
  muted: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
