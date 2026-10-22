import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Plus,
  Sprout,
  Trash2,
  Wheat,
} from 'lucide-react-native';
import type { PlantDto, ZoneDto } from '@smart-garden/types';
import { ZoneMiniMap } from '@/src/features/zone-editor/components/ZoneMiniMap';
import { ZONE_TYPE_LABEL } from '../lib/gardens-helpers';
import { PlantRow } from './PlantRow';

type Theme = {
  name: string;
  pn: string;
  bd: string;
  ac: string;
  tx: string;
  mu: string;
};

type ZoneCardProps = {
  zone: ZoneDto;
  plants: PlantDto[];
  expanded: boolean;
  highlightedPlantId: string | null;
  theme: Theme;
  onToggleExpand: () => void;
  onLongPress: () => void;
  onAddPlant: () => void;
  onOpenEditor: () => void;
  onDeleteZone: () => void;
  onToggleHighlightPlant: (plantId: string) => void;
  onCarePlant: (plant: { id: string; name: string }) => void;
  onHarvestPlant: (plant: { id: string; name: string }) => void;
  onDeletePlant: (plantId: string, plantName: string) => void;
  onQuickHarvestZone?: () => void;
};

function ZoneCardInner({
  zone,
  plants,
  expanded,
  highlightedPlantId,
  theme,
  onToggleExpand,
  onLongPress,
  onAddPlant,
  onOpenEditor,
  onDeleteZone,
  onToggleHighlightPlant,
  onCarePlant,
  onHarvestPlant,
  onDeletePlant,
  onQuickHarvestZone,
}: ZoneCardProps) {
  const [contentWidth, setContentWidth] = useState(0);
  const hasHarvestable = plants.some((p) => p.status === 'HARVESTING' || p.status === 'FRUITING');

  return (
    <View style={[styles.zoneBlock, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
      {/* Zone Header Bar */}
      <View style={styles.zoneHeaderBar}>
        <Pressable
          style={styles.zoneHeaderLeft}
          onPress={onToggleExpand}
          onLongPress={onLongPress}
        >
          <View style={styles.zoneIconWrap}>
            <Sprout size={18} color={theme.ac} />
          </View>
          <View style={styles.zoneInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.zoneName, { color: theme.tx }]}>{zone.name}</Text>
              {hasHarvestable ? (
                <View style={styles.harvestableBadge}>
                  <Text style={styles.harvestableText}>Можна збирати</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.zoneMeta, { color: theme.mu }]}>
              {`Тип: ${ZONE_TYPE_LABEL[zone.type] ?? zone.type ?? 'Грядка'}`}
              {zone.area ? ` • ${zone.area} м²` : ''}
              {` • Рослин: ${plants.length}`}
            </Text>
          </View>
        </Pressable>

        {/* Actions on Zone */}
        <View style={styles.zoneActions}>
          {onQuickHarvestZone && plants.length > 0 ? (
            <Pressable
              style={[styles.harvestInZoneBtn, { backgroundColor: '#D35400' }]}
              onPress={onQuickHarvestZone}
              accessibilityRole="button"
              accessibilityLabel={`Зібрати урожай у зоні ${zone.name}`}
            >
              <Wheat size={14} color="#fff" />
              <Text style={styles.harvestInZoneText}>Зібрати</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.plantInZoneBtn, { backgroundColor: theme.ac }]}
            onPress={onAddPlant}
          >
            <Plus size={14} color="#fff" />
            <Text style={styles.plantInZoneText}>Рослина</Text>
          </Pressable>

          <Pressable
            hitSlop={8}
            style={styles.actionIconBtn}
            accessibilityLabel="Відкрити редактор зони"
            onPress={onOpenEditor}
          >
            <Maximize2 size={16} color={theme.ac} />
          </Pressable>

          <Pressable
            hitSlop={8}
            style={styles.deleteZoneBtn}
            onPress={onDeleteZone}
          >
            <Trash2 size={16} color="#C0392B" />
          </Pressable>

          <Pressable
            hitSlop={8}
            style={styles.toggleChevronBtn}
            onPress={onToggleExpand}
          >
            {expanded ? (
              <ChevronUp size={20} color={theme.mu} />
            ) : (
              <ChevronDown size={20} color={theme.mu} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Plants in this Zone */}
      {expanded ? (
        <View
          style={[styles.plantsContainer, { borderTopColor: theme.bd }]}
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width - 24)}
        >
          {contentWidth > 0 ? (
            <ZoneMiniMap
              zoneId={zone.id}
              availableWidth={contentWidth}
              highlightedId={highlightedPlantId}
              onPress={onOpenEditor}
              theme={theme}
            />
          ) : null}

          {plants.length === 0 ? (
            <View style={styles.noPlantsWrap}>
              <Text style={[styles.noPlantsText, { color: theme.mu }]}>
                У цій зоні ще немає висаджених рослин
              </Text>
              <Pressable
                style={[styles.smallAddPlantBtn, { borderColor: theme.ac }]}
                onPress={onAddPlant}
              >
                <Plus size={14} color={theme.ac} />
                <Text style={[styles.smallAddPlantText, { color: theme.ac }]}>
                  Посадити першу рослину
                </Text>
              </Pressable>
            </View>
          ) : (
            plants.map((plant) => (
              <PlantRow
                key={plant.id}
                plant={plant}
                isHighlighted={highlightedPlantId === plant.id}
                theme={theme}
                onToggleHighlight={() => onToggleHighlightPlant(plant.id)}
                onCare={() => onCarePlant({ id: plant.id, name: plant.name })}
                onHarvest={() => onHarvestPlant({ id: plant.id, name: plant.name })}
                onDelete={() => onDeletePlant(plant.id, plant.name)}
              />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zoneBlock: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  zoneHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  zoneHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: '700' },
  zoneMeta: { fontSize: 12, marginTop: 2 },
  harvestableBadge: {
    backgroundColor: '#fdebd0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  harvestableText: {
    color: '#D35400',
    fontSize: 10,
    fontWeight: '800',
  },
  zoneActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  harvestInZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  harvestInZoneText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  plantInZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  plantInZoneText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionIconBtn: { padding: 6, borderRadius: 8 },
  deleteZoneBtn: { padding: 4 },
  toggleChevronBtn: { padding: 4, borderRadius: 8 },
  plantsContainer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 10,
  },
  noPlantsWrap: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  noPlantsText: { fontSize: 13 },
  smallAddPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallAddPlantText: { fontSize: 12, fontWeight: '700' },
});

export const ZoneCard = memo(ZoneCardInner);
