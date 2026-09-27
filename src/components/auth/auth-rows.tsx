import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/theme/theme-context';
import { BackButton, ThemeToggleButton } from './icon-buttons';

/** Рядок "Немає акаунту? Зареєструватися" — клікабельна друга частина. */
export function AuthSwitchRow({
  prefix,
  action,
  onPress,
}: {
  prefix: string;
  action: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={switchStyles.wrap} hitSlop={8}>
      <Text style={[switchStyles.prefix, { color: theme.mu }]}>
        {prefix} <Text style={[switchStyles.action, { color: theme.ac2 }]}>{action}</Text>
      </Text>
    </Pressable>
  );
}

const switchStyles = StyleSheet.create({
  wrap: { marginTop: 18, alignItems: 'center' },
  prefix: { fontSize: 14 },
  action: { fontWeight: '700' },
});

/** Верхній ряд auth-форми: Назад ліворуч, перемикач теми праворуч. */
export function AuthFormTopBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={topBarStyles.row}>
      <BackButton onPress={onBack} />
      <View style={topBarStyles.spacer} />
      <ThemeToggleButton />
    </View>
  );
}

const topBarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  spacer: { flex: 1 },
});

export { router };
