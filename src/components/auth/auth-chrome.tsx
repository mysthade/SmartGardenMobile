import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/theme-context';
import type { ThemeTokens } from '@/src/theme/tokens';
import { primaryShadow, sheetShadow } from './shadows';

export const MIN_TAP_HEIGHT = 44;

/**
 * Спільний каркас auth-екранів: фоновий градієнт ac3→bg + декоративні плями.
 * Кольори — виключно з theme-контексту, без хардкоду.
 */
export function AuthBackground({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const dark = theme.name === 'dark';
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.ac3, theme.bg]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Декоративні плями (не перехоплюють тапи) */}
      <View pointerEvents="none" style={[styles.blob, blobStyle(theme, 220, -90, -70)]} />
      <View pointerEvents="none" style={[styles.blob, blobStyle(theme, 180, -60, undefined, -60)]} />
      {children}
    </View>
  );
}

function blobStyle(theme: ThemeTokens, size: number, top: number, left?: number, right?: number) {
  const dark = theme.name === 'dark';
  return {
    backgroundColor: theme.ac,
    opacity: dark ? 0.16 : size > 200 ? 0.12 : 0.1,
    width: size,
    height: size,
    borderRadius: size / 2,
    top,
    ...(left !== undefined ? { left } : { right: right ?? 0 }),
  } as const;
}

/** Верхній ряд екрана: місце під кнопки. Відступи — від safe-area. */
export function AuthTopBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>{children}</View>;
}

/**
 * Нижня картка (sheet): заокруглені лише верхні кути 28px, фон --pn,
 * тінь угору (слабша в темній темі). Обгортає ScrollView-контент.
 */
export function AuthSheet({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.pn,
          borderColor: theme.bd,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
          ...sheetShadow(theme),
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Первинна кнопка: заповнена --ac, білий текст, тінь власного кольору. */
export function PrimaryButton({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <PressableButton
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.primary, { backgroundColor: theme.ac, ...primaryShadow(theme) }]}
    >
      {children}
    </PressableButton>
  );
}

import { Pressable, type PressableProps } from 'react-native';

function PressableButton({
  children,
  ...rest
}: PressableProps & { children: ReactNode }) {
  return <Pressable {...rest}>{children}</Pressable>;
}

/** Ghost-кнопка: прозорий фон, рамка --bd. */
export function GhostButton({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.ghost, { borderColor: theme.bd }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  sheet: {
    flex: 1,
    marginTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  primary: {
    minHeight: MIN_TAP_HEIGHT,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 14,
  },
  ghost: {
    minHeight: MIN_TAP_HEIGHT,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
  },
});
