import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, ChevronDown, Save } from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import type { SaveStatus } from '../../types';

interface PlannerTopBarProps {
  planTitle: string;
  saveStatus: SaveStatus;
  isDirty: boolean;
  onBack: () => void;
  onOpenPlanSelector: () => void;
  onSave: () => void;
  theme: ThemeTokens;
}

export const PlannerTopBar = React.memo(function PlannerTopBar({
  planTitle,
  saveStatus,
  isDirty,
  onBack,
  onOpenPlanSelector,
  onSave,
  theme,
}: PlannerTopBarProps) {
  // Status indicator styling
  let statusColor = '#27ae60';
  let statusText = 'Збережено';
  if (saveStatus === 'saving') {
    statusColor = '#3498db';
    statusText = 'Збереження...';
  } else if (saveStatus === 'error') {
    statusColor = '#e74c3c';
    statusText = 'Помилка';
  } else if (isDirty) {
    statusColor = '#f39c12';
    statusText = 'Не збережено';
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.pn,
          borderBottomColor: theme.bd,
        },
      ]}
    >
      {/* Back button */}
      <Pressable
        accessibilityLabel="Назад"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: theme.bg,
            borderColor: theme.bd,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        onPress={onBack}
      >
        <ArrowLeft size={20} color={theme.tx} />
      </Pressable>

      {/* Plan Selector Trigger */}
      <Pressable
        accessibilityLabel={`Вибрати план, поточний: ${planTitle}`}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.planSelectorBtn,
          {
            backgroundColor: theme.bg,
            borderColor: theme.bd,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={onOpenPlanSelector}
      >
        <View style={styles.planTitleRow}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
            style={[styles.planTitleText, { color: theme.tx }]}
          >
            {planTitle || 'Без назви'}
          </Text>
          <ChevronDown size={16} color={theme.mu} style={styles.chevron} />
        </View>

        {/* Compact status row */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.statusText, { color: theme.mu }]}
          >
            {statusText}
          </Text>
        </View>
      </Pressable>

      {/* Save Button */}
      <Pressable
        accessibilityLabel="Зберегти план"
        accessibilityRole="button"
        disabled={saveStatus === 'saving'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: isDirty ? theme.ac : theme.bg,
            borderColor: isDirty ? theme.ac : theme.bd,
            opacity: pressed || saveStatus === 'saving' ? 0.7 : 1,
          },
        ]}
        onPress={onSave}
      >
        {saveStatus === 'saving' ? (
          <ActivityIndicator size="small" color={isDirty ? '#fff' : theme.ac} />
        ) : (
          <Save size={18} color={isDirty ? '#fff' : theme.tx} />
        )}
        <Text
          maxFontSizeMultiplier={1.2}
          style={[
            styles.saveBtnText,
            { color: isDirty ? '#fff' : theme.tx },
          ]}
        >
          Зберегти
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 3,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSelectorBtn: {
    flex: 1,
    height: 44,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTitleText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  saveBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
