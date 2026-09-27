import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackground, PrimaryButton } from '@/src/components/auth/auth-chrome';
import { BackButton, ThemeToggleButton } from '@/src/components/auth/icon-buttons';
import { useTheme } from '@/src/theme/theme-context';
import type { ThemeTokens } from '@/src/theme/tokens';
import { sheetShadow } from '@/src/components/auth/shadows';
import { GardenHero } from './garden-hero';
import { welcomeStyles as s } from './welcome-styles';

const FEATURES: Array<{ icon: string; label: string }> = [
  { icon: '🗺️', label: '3D-планувальник' },
  { icon: '🌦️', label: 'Прогноз погоди' },
  { icon: '🥕', label: '94 культури' },
];

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const heroWidth = Math.min(windowWidth * 0.82, 340);
  const heroHeight = (heroWidth * 190) / 300;
  const heroScale = windowHeight < 700 ? 0.82 : 1;

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: insets.top + 12, minHeight: windowHeight },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={s.topZone}>
          <View style={styles.topRow}>
            <View style={styles.spacer} />
            <ThemeToggleButton />
          </View>

          <Text style={[s.logo, { color: theme.ac2 }]}>🌱 Smart Garden</Text>

          <View style={{ transform: [{ scale: heroScale }] }}>
            <GardenHero theme={theme} width={heroWidth} height={heroHeight} />
          </View>

          <View style={s.chips}>
            <HintChip theme={theme} text="📅 Задачі на сьогодні" />
            <HintChip theme={theme} text="📸 Фото-щоденник" />
          </View>
        </View>

        <View
          style={[
            s.sheet,
            {
              backgroundColor: theme.pn,
              borderColor: theme.bd,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              ...sheetShadow(theme),
            },
          ]}
        >
          <Text style={[s.title, { color: theme.tx }]}>
            Ваш сад — {'\n'}
            <Text style={{ color: theme.ac2 }}>під контролем</Text>
          </Text>
          <Text style={[s.subtitle, { color: theme.mu }]}>
            Плануйте грядки, ведіть щоденник і збирайте врожай — все в одному місці.
          </Text>

          <View style={s.features}>
            {FEATURES.map((f) => (
              <View key={f.label} style={[s.feature, { backgroundColor: theme.ac3 }]}>
                <Text style={s.featureIcon}>{f.icon}</Text>
                <Text style={[s.featureLabel, { color: theme.tx }]}>{f.label}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton onPress={() => router.push('/register')}>
            <Text style={s.primaryText}>Створити акаунт</Text>
          </PrimaryButton>
          <GhostLoginButton />
        </View>
      </ScrollView>
    </AuthBackground>
  );
}

/** Ghost "Увійти" лишаємо локально: Welcome — єдине місце з парою primary+ghost. */
function GhostLoginButton() {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/login')}
      accessibilityRole="button"
      style={[s.ghost, { borderColor: theme.bd }]}
    >
      <Text style={[s.ghostText, { color: theme.ac2 }]}>Увійти</Text>
    </Pressable>
  );
}

function HintChip({ theme, text }: { theme: ThemeTokens; text: string }) {
  const dark = theme.name === 'dark';
  return (
    <View
      style={[
        s.chip,
        {
          backgroundColor: theme.pn,
          borderColor: dark ? theme.bd : 'transparent',
          borderWidth: dark ? StyleSheet.hairlineWidth : 0,
          ...(dark ? {} : s.chipShadow),
        },
      ]}
    >
      <Text style={[s.chipText, { color: theme.tx }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  spacer: { flex: 1 },
});

export { BackButton };

