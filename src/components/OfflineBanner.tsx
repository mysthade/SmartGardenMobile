import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useNetwork } from '@/src/features/network/network-context';
import { useTheme } from '@/src/theme/theme-context';

/**
 * Компактний верхній банер, що показується, коли користувач переглядає збережені дані в офлайн-режимі.
 */
export function OfflineBanner() {
  const { isOffline, isChecking, retryConnection, setAllowOfflineBrowsing } = useNetwork();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 6,
          backgroundColor: theme.name === 'dark' ? '#3b1d1d' : '#fdeeed',
          borderBottomColor: theme.danger,
        },
      ]}
    >
      <View style={styles.left}>
        <WifiOff size={14} color={theme.danger} />
        <Text style={[styles.text, { color: theme.tx }]} numberOfLines={1}>
          Офлайн-режим • дані з кешу
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => void retryConnection()}
          disabled={isChecking}
          hitSlop={8}
          style={[styles.btn, { borderColor: theme.danger }]}
        >
          <Text style={[styles.btnText, { color: theme.danger }]}>
            {isChecking ? 'Перевірка…' : 'Оновити'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAllowOfflineBrowsing(false)}
          hitSlop={8}
          style={styles.closeBtn}
        >
          <Text style={[styles.closeText, { color: theme.mu }]}>Екран</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  closeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

