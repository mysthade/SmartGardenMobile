import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCw, Sprout, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';

export interface OfflineScreenProps {
  /** Чи триває зараз повторна перевірка з'єднання. */
  isChecking?: boolean;
  /** Колбек для кнопки "Спробувати знову". */
  onRetry: () => void;
  /** Чи дозволити перехід до збережених офлайн-даних (наприклад, для авторизованих користувачів). */
  canContinueOffline?: boolean;
  /** Колбек для кнопки "Переглянути збережені дані". */
  onContinueOffline?: () => void;
  testID?: string;
}

/**
 * Повноекранна сторінка стану "Немає інтернету".
 * Відображається автоматично, коли пристрій втрачає з'єднання, та зникає після відновлення мережі.
 */
export function OfflineScreen({
  isChecking = false,
  onRetry,
  canContinueOffline = false,
  onContinueOffline,
  testID = 'offline-screen',
}: OfflineScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === 'dark';

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: theme.bg,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.brandRow}>
          <Sprout size={20} color={theme.ac} />
          <Text style={[styles.brandText, { color: theme.ac2 }]} maxFontSizeMultiplier={1.3}>
            Smart Garden
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.pn,
              borderColor: theme.bd,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? '#2e1919' : '#fdeeed',
                borderColor: isDark ? '#542626' : '#f8d2cf',
              },
            ]}
          >
            <WifiOff size={40} color={theme.danger} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            Немає підключення до інтернету
          </Text>

          <Text style={[styles.description, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            Перевірте Wi-Fi або мобільну мережу. Щойно зʼєднання відновиться, Smart Garden
            автоматично синхронізує ваші дані.
          </Text>

          <View style={[styles.statusPill, { backgroundColor: theme.ac3 }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.danger }]} />
            <Text style={[styles.statusText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
              Очікування мережі…
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Спробувати підключитися знову"
            disabled={isChecking}
            onPress={onRetry}
            style={[
              styles.retryBtn,
              {
                backgroundColor: theme.ac,
                opacity: isChecking ? 0.85 : 1,
              },
            ]}
            testID="offline-retry-button"
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <RotateCw size={18} color="#ffffff" />
                <Text style={styles.retryBtnText} maxFontSizeMultiplier={1.3}>
                  Спробувати знову
                </Text>
              </>
            )}
          </Pressable>

          {canContinueOffline && onContinueOffline ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Переглянути збережені дані офлайн"
              onPress={onContinueOffline}
              style={[
                styles.offlineBtn,
                {
                  borderColor: theme.bd,
                  backgroundColor: theme.bg,
                },
              ]}
              testID="offline-continue-button"
            >
              <Text style={[styles.offlineBtnText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                Переглянути збережені дані
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 22,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  retryBtn: {
    width: '100%',
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  offlineBtn: {
    width: '100%',
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  offlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
