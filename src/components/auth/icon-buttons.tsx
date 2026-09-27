import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/theme/theme-context';

/** Кругла кнопка 44pt: фон --pn, рамка --bd, легка тінь. */
export function IconCircleButton({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { theme } = useTheme();
  const dark = theme.name === 'dark';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
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
    <IconCircleButton onPress={onPress} accessibilityLabel="Назад">
      <Text style={[styles.arrow, { color: theme.tx }]}>←</Text>
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
    >
      <Text style={styles.icon}>{dark ? '☀️' : '🌙'}</Text>
    </IconCircleButton>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  arrow: { fontSize: 22, fontWeight: '700', lineHeight: 24 },
  icon: { fontSize: 20 },
});
