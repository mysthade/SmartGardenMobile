import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineScreen } from '@/src/components/OfflineScreen';
import { AuthProvider, useAuth } from '@/src/features/auth/auth-context';
import { NetworkProvider, useNetwork } from '@/src/features/network/network-context';
import { ThemeProvider } from '@/src/theme/theme-context';

function OfflineGate({ children }: { children: ReactNode }) {
  const { isOffline, isChecking, allowOfflineBrowsing, setAllowOfflineBrowsing, retryConnection } =
    useNetwork();
  const { status, retryRestoreSession } = useAuth();

  if (isOffline && !allowOfflineBrowsing) {
    return (
      <OfflineScreen
        isChecking={isChecking}
        onRetry={() => {
          void retryConnection().then((online) => {
            if (online) {
              void retryRestoreSession();
            }
          });
        }}
        canContinueOffline={status === 'authenticated'}
        onContinueOffline={() => setAllowOfflineBrowsing(true)}
      />
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <NetworkProvider>
              <AuthProvider>
                <OfflineGate>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="welcome" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="offline" />
                    <Stack.Screen name="(app)" />
                  </Stack>
                </OfflineGate>
                {/* Статус-бар керують окремі екрани (Welcome/Login) через контекст теми */}
                <StatusBar style="auto" />
              </AuthProvider>
            </NetworkProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
