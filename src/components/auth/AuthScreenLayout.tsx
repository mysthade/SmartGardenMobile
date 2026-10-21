import type { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/src/theme/theme-context';
import { AuthBackground, AuthSheet, AuthTopBar } from './auth-chrome';
import { AuthFormTopBar } from './auth-rows';
import { SproutBadge } from './sprout-badge';

export interface AuthScreenLayoutProps {
  children?: ReactNode;
  onBack?: () => void;
  onSettings?: () => void;
  hero?: ReactNode;
  topBar?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  testID?: string;
}

/**
 * Спільний уніфікований каркас для екранів аутентифікації (Login, Register тощо):
 * - Градієнтний фон ac3→bg з декоративними плямами
 * - Верхній ряд із безпечними відступами (BackButton ліворуч, Settings + ThemeToggle праворуч)
 * - Адаптивний хедер із SproutBadge + назва (зменшується на компактних екранах та в ландшафті)
 * - Біла картка (AuthSheet) з округленими кутами та центруванням на планшетах (≥ 600 dp)
 * - ScrollView з keyboardShouldPersistTaps="handled" та KeyboardAvoidingView
 * - Приховування клавіатури при тапі поза полями
 */
export function AuthScreenLayout({
  children,
  onBack,
  onSettings,
  hero,
  topBar,
  contentContainerStyle,
  scrollViewRef,
  testID,
}: AuthScreenLayoutProps) {
  const { theme } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Адаптивність: низькі екрани або ландшафтний режим
  const isLandscape = windowWidth > windowHeight;
  const isCompact = windowHeight < 680 || isLandscape;

  const handleBack = onBack ?? (() => router.replace('/welcome'));

  const defaultTopBar = (
    <AuthFormTopBar onBack={handleBack} onSettings={onSettings} />
  );

  const defaultHero = (
    <View style={styles.heroInner}>
      <SproutBadge theme={theme} size={isCompact ? 52 : 76} />
      <Text
        style={[styles.logo, { color: theme.ac2 }, isCompact && styles.logoCompact]}
        maxFontSizeMultiplier={1.3}
      >
        Smart Garden
      </Text>
    </View>
  );

  return (
    <AuthBackground>
      <AuthTopBar>{topBar ?? defaultTopBar}</AuthTopBar>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            testID={testID}
          >
            <View style={[styles.heroWrapper, isCompact && styles.heroWrapperCompact]}>
              {hero ?? defaultHero}
            </View>
            <AuthSheet>{children}</AuthSheet>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroWrapper: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroWrapperCompact: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  heroInner: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  logoCompact: {
    fontSize: 20,
    marginTop: 6,
  },
});
