import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Droplets, Trash2, Wheat } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import type { PlantDto } from '@smart-garden/types';
import { STATUS_MAP } from '../lib/gardens-helpers';

type Theme = {
  name: string;
  tx: string;
  mu: string;
  bd: string;
};

type PlantRowProps = {
  plant: PlantDto;
  isHighlighted: boolean;
  theme: Theme;
  onToggleHighlight: () => void;
  onCare: () => void;
  onHarvest: () => void;
  onDelete: () => void;
  onOpenCard?: () => void;
};

function PlantRowInner({
  plant,
  isHighlighted,
  theme,
  onToggleHighlight,
  onCare,
  onHarvest,
  onDelete,
  onOpenCard,
}: PlantRowProps) {
  const router = useRouter();
  const st = STATUS_MAP[plant.status] ?? STATUS_MAP.GROWING;

  const handlePress = () => {
    if (onOpenCard) {
      onOpenCard();
    } else {
      router.push(`/plants/${plant.id}` as Href);
    }
  };

  return (
    <View
      style={[
        styles.plantCard,
        {
          backgroundColor: theme.name === 'dark' ? '#17251c' : '#f9fcf9',
          borderColor: isHighlighted ? '#2f8f57' : theme.bd,
          borderWidth: isHighlighted ? 1.5 : 1,
        },
      ]}
    >
      <Pressable
        style={styles.plantTopRow}
        onPress={handlePress}
        onLongPress={onToggleHighlight}
        accessibilityLabel={`Рослина ${plant.name}, відкрити картку`}
      >
        <View style={styles.plantTitleWrap}>
          <Text style={[styles.plantNameText, { color: theme.tx }]}>{plant.name}</Text>
          {plant.variety ? (
            <Text style={[styles.plantVarietyText, { color: theme.mu }]}>
              Сорт: {plant.variety}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </Pressable>

      <View style={styles.plantMetaRow}>
        <Text style={[styles.plantQty, { color: theme.mu }]}>
          Кількість: {plant.quantity} шт.
        </Text>
      </View>

      {/* Quick Plant Actions */}
      <View style={[styles.plantButtonsRow, { borderTopColor: theme.bd }]}>
        <Pressable style={styles.pActionBtn} onPress={onCare}>
          <Droplets size={14} color="#2980B9" />
          <Text style={[styles.pActionText, { color: '#2980B9' }]}>Догляд</Text>
        </Pressable>

        <Pressable style={styles.pActionBtn} onPress={onHarvest}>
          <Wheat size={14} color="#D35400" />
          <Text style={[styles.pActionText, { color: '#D35400' }]}>Урожай</Text>
        </Pressable>

        <Pressable style={styles.pActionBtn} onPress={onDelete}>
          <Trash2 size={14} color="#C0392B" />
          <Text style={[styles.pActionText, { color: '#C0392B' }]}>Видалити</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plantCard: {
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  plantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  plantTitleWrap: { flex: 1 },
  plantNameText: { fontSize: 15, fontWeight: '700' },
  plantVarietyText: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  plantMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plantQty: { fontSize: 12 },
  plantButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    justifyContent: 'space-around',
  },
  pActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pActionText: { fontSize: 12, fontWeight: '600' },
});

export const PlantRow = memo(PlantRowInner, (prev, next) => {
  return (
    prev.plant.id === next.plant.id &&
    prev.plant.name === next.plant.name &&
    prev.plant.variety === next.plant.variety &&
    prev.plant.status === next.plant.status &&
    prev.plant.quantity === next.plant.quantity &&
    prev.isHighlighted === next.isHighlighted &&
    prev.theme.name === next.theme.name &&
    prev.theme.bd === next.theme.bd &&
    prev.theme.tx === next.theme.tx &&
    prev.theme.mu === next.theme.mu
  );
});
