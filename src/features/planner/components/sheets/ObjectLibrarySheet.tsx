import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { PLAN_OBJECT_PRESETS, type PlanObjectPreset, type PlanObjectType } from '@smart-garden/types';
import { cmToMeters } from '@smart-garden/validation';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface ObjectLibrarySheetProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Всі' },
  { id: 'buildings', label: 'Будівлі' },
  { id: 'utilities', label: 'Комунікації' },
  { id: 'plants', label: 'Рослини' },
  { id: 'paths', label: 'Доріжки/Паркани' },
  { id: 'other', label: 'Інше' },
];

const PRESET_EMOJIS: Record<PlanObjectType, string> = {
  HOUSE: '🏡',
  SHED: '🏚️',
  GAZEBO: '🛖',
  BBQ: '🍖',
  GREENHOUSE: '🌱',
  GARAGE: '🚗',
  WELL: '🪣',
  BOREHOLE: '💧',
  COMPOSTER: '🍂',
  POND: '🐟',
  POOL: '🏊',
  FENCE: '🪵',
  GATE: '🚪',
  PATH: '🧱',
  TREE: '🌳',
  BUSH: '🌿',
  FLOWERBED: '🌸',
  RAISED_BED: '🪵',
  LAWN: '🌾',
  PARKING: '🅿️',
  TOILET: '🚻',
  CUSTOM: '📦',
};

export function ObjectLibrarySheet({ visible, onClose, isDark }: ObjectLibrarySheetProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const addObjectFromPreset = useGardenPlannerStore((s) => s.addObjectFromPreset);

  const presetsList = useMemo(() => {
    return Object.values(PLAN_OBJECT_PRESETS).filter((preset) => {
      const matchCat =
        selectedCategory === 'all' || preset.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        preset.label.toLowerCase().includes(search.toLowerCase()) ||
        preset.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  const handleSelectPreset = (preset: PlanObjectPreset) => {
    addObjectFromPreset(preset.type);
    onClose();
  };

  const bg = isDark ? '#151f1a' : '#ffffff';
  const text = isDark ? '#eaf2ec' : '#14201a';
  const muted = isDark ? '#8ea497' : '#5f6f66';
  const border = isDark ? '#243228' : '#e2ece2';
  const cardBg = isDark ? '#1e2b24' : '#f6faf6';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <Text style={[styles.title, { color: text }]}>Бібліотека обʼєктів</Text>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: cardBg }]}
              onPress={onClose}
              hitSlop={8}
            >
              <X size={18} color={text} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={[styles.searchWrap, { backgroundColor: cardBg, borderColor: border }]}>
            <Search size={16} color={muted} />
            <TextInput
              style={[styles.searchInput, { color: text }]}
              placeholder="Пошук об'єкта (наприклад, альтанка, теплиця)..."
              placeholderTextColor={muted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Categories row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? '#2f8f57' : cardBg,
                      borderColor: active ? '#2f8f57' : border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? '#ffffff' : muted, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Presets grid */}
          <FlatList
            data={presetsList}
            keyExtractor={(item) => item.type}
            numColumns={2}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => {
              const emoji = PRESET_EMOJIS[item.type] || '📦';
              const wM = cmToMeters(item.defaultWidthCm);
              const hM = cmToMeters(item.defaultHeightCm);

              return (
                <Pressable
                  style={[
                    styles.card,
                    { backgroundColor: cardBg, borderColor: border },
                  ]}
                  onPress={() => handleSelectPreset(item)}
                >
                  <View style={[styles.cardIconWrap, { backgroundColor: `${item.defaultColor}20` }]}>
                    <Text style={styles.cardEmoji}>{emoji}</Text>
                  </View>
                  <Text style={[styles.cardLabel, { color: text }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.cardDims, { color: muted }]}>
                    {wM} × {hM} м
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardDims: {
    fontSize: 11,
    marginTop: 2,
  },
});
