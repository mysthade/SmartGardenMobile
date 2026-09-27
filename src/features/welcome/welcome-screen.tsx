import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/theme-context';
import type { ThemeTokens } from '@/src/theme/tokens';
import { GardenHero } from './garden-hero';
import { primaryShadow, sheetShadow, welcomeStyles as s } from './welcome-styles';

const FEATURES: Array<{ icon: string; label: string }> = [
  { icon: '🗺️', label: '3D-планувальник' },
  { icon: '🌦️', label: 'Прогноз погоди' },
  { icon: '🥕', label: '94 культури' },
];

export default function WelcomeScreen() {
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const dark = theme.name === 'dark';

  const heroWidth = Math.min(windowWidth * 0.82, 340);
  const heroHeight = (heroWidth * 190) / 300;
  const heroScale = windowHeight < 700 ? 0.82 : 1;

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.ac3, theme.bg]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Декоративні плями (не перехоплюють тапи) */}
      <View pointerEvents="none" style={[s.blob, blobStyle(theme, 220, -90, -70)]} />
      <View pointerEvents="none" style={[s.blob, blobStyle(theme, 180, -60, undefined, -60)]} />

      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: insets.top + 12, minHeight: windowHeight },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={s.topZone}>
          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
            style={[s.themeToggle, { borderColor: theme.bd, backgroundColor: theme.pn }]}
            hitSlop={8}
          >
            <Text style={s.themeToggleText}>{dark ? '☀️' : '🌙'}</Text>
          </Pressable>

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

          <Pressable
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            style={[s.primary, { backgroundColor: theme.ac, ...primaryShadow(theme) }]}
          >
            <Text style={s.primaryText}>Створити акаунт</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            style={[s.ghost, { borderColor: theme.bd }]}
          >
            <Text style={[s.ghostText, { color: theme.ac2 }]}>Увійти</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
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

