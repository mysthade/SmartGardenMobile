import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Building2,
  Flower2,
  Footprints,
  Layers,
  Lock,
  Maximize2,
  Search,
  Wrench,
  X,
} from 'lucide-react-native';
import type { PlanObjectLayer } from '@smart-garden/types';
import { useGardenPlannerStore } from '../../store/use-planner-store';
import type { CanvasPlanObject } from '../../types';

interface ObjectListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAndCenter: (obj: CanvasPlanObject) => void;
  onFitToScreen: () => void;
  isDark: boolean;
}

type CategoryFilter = 'ALL' | PlanObjectLayer;

const CATEGORIES: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'ALL', label: 'Усі' },
  { key: 'BUILDINGS', label: 'Будівлі' },
  { key: 'PLANTS', label: 'Рослини' },
  { key: 'PATHS', label: 'Доріжки' },
  { key: 'UTILITIES', label: 'Комунікації' },
  { key: 'OTHER', label: 'Інше' },
];

export const ObjectListModal = React.memo(function ObjectListModal({
  visible,
  onClose,
  onSelectAndCenter,
  onFitToScreen,
  isDark,
}: ObjectListModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');

  const objects = useGardenPlannerStore((s) => s.objects);
  const objectIds = useGardenPlannerStore((s) => s.objectIds);
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const checkRules = useGardenPlannerStore((s) => s.settings.checkRules);
  const plotWidthCm = useGardenPlannerStore((s) => s.plan.widthCm);
  const plotHeightCm = useGardenPlannerStore((s) => s.plan.heightCm);

  const bg = isDark ? '#0f172a' : '#ffffff';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const border = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  // Filtered objects
  const filteredList = useMemo(() => {
    return objectIds
      .map((id) => objects[id])
      .filter((obj): obj is CanvasPlanObject => {
        if (!obj || obj.deleted) return false;
        if (activeCategory !== 'ALL' && obj.layer !== activeCategory) return false;
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          const matchLabel = obj.label.toLowerCase().includes(q);
          const matchType = obj.type.toLowerCase().includes(q);
          if (!matchLabel && !matchType) return false;
        }
        return true;
      });
  }, [objectIds, objects, activeCategory, searchQuery]);

  const totalCount = objectIds.filter((id) => objects[id] && !objects[id]?.deleted).length;

  const getLayerIcon = (layer: PlanObjectLayer) => {
    switch (layer) {
      case 'BUILDINGS':
        return <Building2 size={16} color="#f59e0b" />;
      case 'PLANTS':
        return <Flower2 size={16} color="#10b981" />;
      case 'PATHS':
        return <Footprints size={16} color="#8b5cf6" />;
      case 'UTILITIES':
        return <Wrench size={16} color="#0ea5e9" />;
      default:
        return <Layers size={16} color={muted} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View>
              <Text style={[styles.title, { color: text }]}>Список обʼєктів</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Всього на плані: {totalCount} {totalCount === 1 ? 'обʼєкт' : 'обʼєктів'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                style={[styles.fitBtn, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => {
                  onFitToScreen();
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Показати всі об'єкти"
              >
                <Maximize2 size={15} color={muted} />
                <Text style={[styles.fitBtnText, { color: text }]}>Показати все</Text>
              </Pressable>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: cardBg }]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрити"
              >
                <X size={18} color={text} />
              </Pressable>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: border }]}>
              <Search size={16} color={muted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: text }]}
                placeholder="Пошук за назвою або типом..."
                placeholderTextColor={muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#0284c7'
                          : '#0ea5e9'
                        : cardBg,
                      borderColor: isSelected ? 'transparent' : border,
                    },
                  ]}
                  onPress={() => setActiveCategory(cat.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#ffffff' : text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Object List */}
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
            {filteredList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: muted }]}>Обʼєктів не знайдено</Text>
              </View>
            ) : (
              filteredList.map((obj) => {
                const isSelected = selectedIds.includes(obj.id);
                const isOutOfBounds =
                  obj.xCm < 0 ||
                  obj.yCm < 0 ||
                  obj.xCm + obj.widthCm > plotWidthCm ||
                  obj.yCm + obj.heightCm > plotHeightCm;
                const hasWarning = checkRules && (obj.hasCollision || isOutOfBounds);

                return (
                  <Pressable
                    key={obj.id}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: isSelected
                          ? '#10b981'
                          : hasWarning
                            ? '#ef4444'
                            : border,
                      },
                    ]}
                    onPress={() => {
                      onSelectAndCenter(obj);
                      onClose();
                    }}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemTitleRow}>
                        <View style={styles.iconBadge}>{getLayerIcon(obj.layer)}</View>
                        <Text style={[styles.itemLabel, { color: text }]} numberOfLines={1}>
                          {obj.label}
                        </Text>
                        {obj.locked && <Lock size={13} color="#94a3b8" style={{ marginLeft: 6 }} />}
                      </View>
                      {hasWarning && (
                        <View style={styles.warningBadge}>
                          <AlertTriangle size={13} color="#ef4444" />
                          <Text style={styles.warningText}>
                            {obj.hasCollision ? 'Перетин' : 'За межами'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.itemDetailsRow}>
                      <Text style={[styles.itemDetailText, { color: muted }]}>
                        Розмір: {(obj.widthCm / 100).toFixed(2)} × {(obj.heightCm / 100).toFixed(2)} м
                      </Text>
                      <Text style={[styles.itemDetailText, { color: muted }]}>
                        X: {(obj.xCm / 100).toFixed(2)} м • Y: {(obj.yCm / 100).toFixed(2)} м
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  fitBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  categoryScroll: {
    maxHeight: 44,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryContent: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
  },
  itemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    marginRight: 8,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  warningText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  itemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemDetailText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
