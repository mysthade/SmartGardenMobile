import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ChevronDown,
  Moon,
  Save,
  Settings2,
  Sun,
} from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import type { SaveStatus } from '../../types';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface PlannerTopBarProps {
  planTitle: string;
  saveStatus: SaveStatus;
  isDirty: boolean;
  onBack: () => void;
  onOpenPlanSelector: () => void;
  onSave: () => void;
  onOpenSettings?: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  theme: ThemeTokens;
}

export const PlannerTopBar = React.memo(function PlannerTopBar({
  planTitle,
  saveStatus,
  isDirty,
  onBack,
  onOpenPlanSelector,
  onSave,
  onOpenSettings,
  onToggleTheme,
  isDark = false,
  theme,
}: PlannerTopBarProps) {
  const viewMode = useGardenPlannerStore((s) => s.viewMode);
  const setViewMode = useGardenPlannerStore((s) => s.setViewMode);

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
      {/* Row 1: Back, Plan Selector (expands), Theme, Settings, Save */}
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
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
                maxFontSizeMultiplier={1.2}
                style={[styles.planTitleText, { color: theme.tx }]}
              >
                {planTitle || 'Без назви'}
              </Text>
              <ChevronDown size={14} color={theme.mu} style={styles.chevron} />
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
                style={[styles.statusText, { color: theme.mu }]}
              >
                {statusText}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Action icons + Save button */}
        <View style={styles.rightSection}>
          {onToggleTheme && (
            <Pressable
              accessibilityLabel={`Перемкнути тему, зараз ${isDark ? 'темна' : 'світла'}`}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.bd,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onToggleTheme}
            >
              {isDark ? (
                <Sun size={18} color="#f59e0b" />
              ) : (
                <Moon size={18} color={theme.tx} />
              )}
            </Pressable>
          )}

          {onOpenSettings && (
            <Pressable
              accessibilityLabel="Налаштування планувальника"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.bd,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onOpenSettings}
            >
              <Settings2 size={18} color={theme.tx} />
            </Pressable>
          )}

          <Pressable
            accessibilityLabel="Зберегти план"
            accessibilityRole="button"
            disabled={saveStatus === 'saving'}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: isDirty ? theme.ac : theme.bg,
                borderColor: isDirty ? theme.ac : theme.bd,
                opacity: pressed || saveStatus === 'saving' ? 0.75 : 1,
              },
            ]}
            onPress={onSave}
          >
            {saveStatus === 'saving' ? (
              <ActivityIndicator
                size="small"
                color={isDirty ? '#fff' : theme.ac}
              />
            ) : (
              <Save size={16} color={isDirty ? '#fff' : theme.tx} />
            )}
            <Text
              numberOfLines={1}
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
      </View>

      {/* Row 2: Centered 2D / 2.5D / 3D Switcher Row */}
      <View style={styles.modeRow}>
        <ViewModeSwitcher
          viewMode={viewMode}
          onSelectMode={setViewMode}
          theme={theme}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 2,
    gap: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  modeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSelectorBtn: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTitleText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  saveBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
