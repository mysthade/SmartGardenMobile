import { router } from 'expo-router';
import { OfflineScreen } from '@/src/components/OfflineScreen';
import { useAuth } from '@/src/features/auth/auth-context';
import { useNetwork } from '@/src/features/network/network-context';

export default function OfflineRoute() {
  const { isChecking, retryConnection, setAllowOfflineBrowsing } = useNetwork();
  const { status, retryRestoreSession } = useAuth();

  const handleRetry = async () => {
    const online = await retryConnection();
    if (online) {
      await retryRestoreSession();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  return (
    <OfflineScreen
      isChecking={isChecking}
      onRetry={() => void handleRetry()}
      canContinueOffline={status === 'authenticated'}
      onContinueOffline={() => {
        setAllowOfflineBrowsing(true);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/dashboard');
        }
      }}
    />
  );
}

