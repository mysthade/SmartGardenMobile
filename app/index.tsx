import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/features/auth/auth-context';
import { useTheme } from '@/src/theme/theme-context';

/**
 * Auth gate:
 * loading → spinner, anonymous → /welcome, authenticated → /dashboard.
 */
export default function Index() {
  const { status } = useAuth();
  const { theme } = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.ac} />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/dashboard' : '/welcome'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
