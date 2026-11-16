import { useNetwork } from '@/src/features/network/network-context';
import { api } from '@/src/lib/api';
import { isNetworkError } from '@/src/lib/api-errors';
import { refreshTokenStore, tokenStore } from '@/src/lib/token-store';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, createContext, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UserPublicDto } from '@smart-garden/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: UserPublicDto | null;
  pendingOfflineRestore: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  setUser: (user: UserPublicDto | null) => void;
  retryRestoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isOffline } = useNetwork();
  const isOfflineRef = useRef(isOffline);
  isOfflineRef.current = isOffline;

  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserPublicDto | null>(null);
  const [pendingOfflineRestore, setPendingOfflineRestore] = useState(false);

  const clearClientState = useCallback(() => {
    tokenStore.clear();
    void refreshTokenStore.clear();
    setUser(null);
    setPendingOfflineRestore(false);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  /** Restore session from the stored refresh token (mobile JSON transport). */
  const restoreSession = useCallback(async () => {
    const refreshToken = await refreshTokenStore.get();
    if (!refreshToken) {
      setPendingOfflineRestore(false);
      setStatus('anonymous');
      return;
    }
    if (isOfflineRef.current) {
      setPendingOfflineRestore(true);
      setStatus('anonymous');
      return;
    }
    try {
      const result = await api.refresh({ clientType: 'mobile', refreshToken });
      tokenStore.set(result.accessToken);
      setUser(result.user);
      setPendingOfflineRestore(false);
      setStatus('authenticated');
    } catch (error) {
      if (isOfflineRef.current || isNetworkError(error)) {
        // Не видаляємо refreshToken при відсутності інтернету — відновимо сесію, коли мережа повернеться
        setPendingOfflineRestore(true);
        setStatus('anonymous');
      } else {
        clearClientState();
      }
    }
  }, [clearClientState]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Автоматично відновлюємо сесію, щойно з'явиться інтернет
  useEffect(() => {
    if (!isOffline && pendingOfflineRestore) {
      void restoreSession();
    }
  }, [isOffline, pendingOfflineRestore, restoreSession]);

  useEffect(() => {
    return api.bindAuthHandlers({
      onAccessToken: (token) => {
        tokenStore.set(token);
      },
      onAuthFailure: () => {
        if (isOfflineRef.current) {
          setPendingOfflineRestore(true);
          return;
        }
        clearClientState();
      },
    });
  }, [clearClientState]);

  const login = useCallback(
    async (email: string, password: string) => {
      queryClient.clear();
      const result = await api.login({ email, password, clientType: 'mobile' });
      tokenStore.set(result.tokens.accessToken);
      if (result.tokens.refreshToken) {
        await refreshTokenStore.set(result.tokens.refreshToken);
      }
      setUser(result.user);
      setPendingOfflineRestore(false);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api.register({ name, email, password });
    return result.message;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore network errors on logout
    }
    clearClientState();
  }, [clearClientState]);

  const value = useMemo(
    () => ({
      status,
      user,
      pendingOfflineRestore,
      login,
      register,
      logout,
      setUser,
      retryRestoreSession: restoreSession,
    }),
    [status, user, pendingOfflineRestore, login, register, logout, restoreSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
