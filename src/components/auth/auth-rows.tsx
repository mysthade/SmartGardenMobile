import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/theme/theme-context';
import { BackButton, SettingsButton, ThemeToggleButton } from './icon-buttons';

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
      <Text style={[switchStyles.prefix, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
        {prefix}{' '}
        <Text style={[switchStyles.action, { color: theme.ac2 }]} maxFontSizeMultiplier={1.3}>
          {action}
        </Text>
      </Text>
    </Pressable>
  );
}

const switchStyles = StyleSheet.create({
  wrap: { marginTop: 18, alignItems: 'center' },
  prefix: { fontSize: 14 },
  action: { fontWeight: '700' },
});

/**
 * Верхній ряд auth-форми:
 * Назад ліворуч, горизонтальний контейнер (шестерня + тема) праворуч з відступом 10 dp.
 * Не накладаються одна на одну й на хедер.
 */
export function AuthFormTopBar({
  onBack,
  onSettings,
}: {
  onBack: () => void;
  onSettings?: () => void;
}) {
  return (
    <View style={topBarStyles.row}>
      <BackButton onPress={onBack} />
      <View style={topBarStyles.spacer} />
      <View style={topBarStyles.rightActions}>
        <SettingsButton onPress={onSettings} />
        <ThemeToggleButton />
      </View>
    </View>
  );
}

const topBarStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  spacer: { flex: 1 },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // 8-12 dp відступ між кнопками
  },
});

export { router };

