import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/features/auth/auth-context';

/** Auth gate: loading → spinner, anonymous → /login, authenticated → /dashboard. */
export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2F7A4F" />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/dashboard' : '/login'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFCF8' },
});
