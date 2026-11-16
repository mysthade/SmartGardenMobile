import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface NetworkContextValue {
  /** Чи підключений пристрій до мережі (Wi-Fi / Cellular). */
  isConnected: boolean;
  /** Чи доступний реальний інтернет (null поки не визначено). */
  isInternetReachable: boolean | null;
  /** true, якщо пристрій офлайн або інтернет недоступний. */
  isOffline: boolean;
  /** true під час ручної перевірки з'єднання. */
  isChecking: boolean;
  /** Чи дозволив користувач тимчасовий перегляд кешованих даних в офлайні. */
  allowOfflineBrowsing: boolean;
  setAllowOfflineBrowsing: (allow: boolean) => void;
  /** Ручна перевірка підключення; повертає true, якщо мережа доступна. */
  retryConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function computeIsOffline(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [allowOfflineBrowsing, setAllowOfflineBrowsing] = useState<boolean>(false);

  const wasOfflineRef = useRef<boolean>(false);

  const applyNetState = useCallback(
    (state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? null;
      const offline = computeIsOffline({ isConnected: connected, isInternetReachable: reachable });

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      onlineManager.setOnline(!offline);

      if (wasOfflineRef.current && !offline) {
        setAllowOfflineBrowsing(false);
        void queryClient.refetchQueries({ type: 'active' });
      }
      wasOfflineRef.current = offline;
      return !offline;
    },
    [queryClient],
  );

  useEffect(() => {
    let mounted = true;

    void NetInfo.fetch()
      .then((state) => {
        if (mounted) {
          applyNetState(state);
        }
      })
      .catch(() => {
        // ignore initial fetch error
      });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (mounted) {
        applyNetState(state);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applyNetState]);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const state = typeof NetInfo.refresh === 'function' ? await NetInfo.refresh() : await NetInfo.fetch();
      const online = applyNetState(state);
      if (online) {
        void queryClient.refetchQueries({ type: 'active' });
      }
      return online;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [applyNetState, queryClient]);

  const isOffline = computeIsOffline({ isConnected, isInternetReachable });

  const value = useMemo<NetworkContextValue>(
    () => ({
      isConnected,
      isInternetReachable,
      isOffline,
      isChecking,
      allowOfflineBrowsing,
      setAllowOfflineBrowsing,
      retryConnection,
    }),
    [isConnected, isInternetReachable, isOffline, isChecking, allowOfflineBrowsing, retryConnection],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return ctx;
}

