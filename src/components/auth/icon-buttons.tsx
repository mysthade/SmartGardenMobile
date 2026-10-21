import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';

export const ICON_BUTTON_SIZE = 40;

/** Кругла кнопка 40×40 dp: фон --pn, рамка --bd, легка тінь. Зона тапу ≥ 44 dp через hitSlop=8. */
export function IconCircleButton({
  children,
  onPress,
  accessibilityLabel,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  const { theme } = useTheme();
  const dark = theme.name === 'dark';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.circle,
        {
          backgroundColor: theme.pn,
          borderColor: theme.bd,
          ...(dark ? styles.circleShadowDark : styles.circleShadowLight),
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Кнопка "Назад" — стрілка ← кольором основного тексту. */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <IconCircleButton onPress={onPress} accessibilityLabel="Назад" testID="topbar-back">
      <Text style={[styles.arrow, { color: theme.tx }]}>←</Text>
    </IconCircleButton>
  );
}

/** Кнопка "Налаштування" (шестерня) — 40×40 dp. */
export function SettingsButton({
  onPress,
  accessibilityLabel = 'Налаштування',
}: {
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  return (
    <IconCircleButton
      onPress={onPress ?? (() => {})}
      accessibilityLabel={accessibilityLabel}
      testID="topbar-settings"
    >
      <Settings size={18} color={theme.tx} />
    </IconCircleButton>
  );
}

/** Перемикач теми 🌙/☀️ — той самий патерн, що на Welcome. */
export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme.name === 'dark';
  return (
    <IconCircleButton
      onPress={toggleTheme}
      accessibilityLabel={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      testID="topbar-theme"
    >
      <Text style={styles.icon}>{dark ? '☀️' : '🌙'}</Text>
    </IconCircleButton>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: ICON_BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  circleShadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  arrow: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
  icon: { fontSize: 18 },
});

