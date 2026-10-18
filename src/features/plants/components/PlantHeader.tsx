import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import type { PlantDto } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { getStatusMeta } from '../lib/plant-helpers';

interface PlantHeaderProps {
  plant?: PlantDto | null;
  theme: ThemeTokens;
  onBack: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

function PlantHeaderInner({
  plant,
  theme,
  onBack,
  onDelete,
  isDeleting,
}: PlantHeaderProps) {
  const statusMeta = plant ? getStatusMeta(plant.status) : null;

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.pn, borderBottomColor: theme.bd }]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={12}
          onPress={onBack}
          style={[styles.backBtn, { borderColor: theme.bd }]}
        >
          <ArrowLeft size={20} color={theme.tx} />
        </Pressable>

        <View style={styles.titleWrapper}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
            style={[styles.titleText, { color: theme.tx }]}
          >
            {plant?.name ?? 'Рослина'}
          </Text>
          {plant?.variety ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.3}
              style={[styles.subtitleText, { color: theme.mu }]}
            >
              Сорт: {plant.variety}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightActions}>
          {statusMeta ? (
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.badgeBg }]}>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={[styles.statusText, { color: statusMeta.badgeColor }]}
              >
                {statusMeta.label}
              </Text>
            </View>
          ) : null}

          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Видалити рослину"
              hitSlop={10}
              onPress={onDelete}
              disabled={isDeleting}
              style={[styles.deleteBtn, { borderColor: theme.bd }]}
            >
              <Trash2 size={18} color={theme.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const PlantHeader = memo(PlantHeaderInner);

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
