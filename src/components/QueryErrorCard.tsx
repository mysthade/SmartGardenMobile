import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RotateCw, WifiOff } from 'lucide-react-native';
import { formatApiError, isNetworkError } from '@/src/lib/api-errors';
import { useTheme } from '@/src/theme/theme-context';

interface QueryErrorCardProps {
  error: unknown;
  title?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
}

/**
 * Компактна картка помилки завантаження для списків та екранів,
 * щоб не показувати оманливий порожній стан при збої мережі або сервера.
 */
export function QueryErrorCard({
  error,
  title,
  fallbackMessage = 'Не вдалося завантажити дані',
  onRetry,
}: QueryErrorCardProps) {
  const { theme } = useTheme();
  const network = isNetworkError(error);
  const message = formatApiError(error, fallbackMessage);

  return (
    <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.name === 'dark' ? '#2e1919' : '#fdeeed' }]}>
        {network ? (
          <WifiOff size={24} color={theme.danger} />
        ) : (
          <AlertTriangle size={24} color={theme.danger} />
        )}
      </View>
      <Text style={[styles.title, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
        {title ?? (network ? 'Немає зʼєднання з сервером' : 'Помилка завантаження')}
      </Text>
      <Text style={[styles.message, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Повторити завантаження"
          onPress={onRetry}
          style={[styles.retryBtn, { backgroundColor: theme.ac }]}
        >
          <RotateCw size={15} color="#ffffff" />
          <Text style={styles.retryText} maxFontSizeMultiplier={1.3}>
            Повторити
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

