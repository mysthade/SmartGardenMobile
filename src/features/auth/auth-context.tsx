import type { UserPublicDto } from '@smart-garden/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/src/lib/api';
import { refreshTokenStore, tokenStore } from '@/src/lib/token-store';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: UserPublicDto | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  setUser: (user: UserPublicDto | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserPublicDto | null>(null);

  const clearClientState = useCallback(() => {
    tokenStore.clear();
    void refreshTokenStore.clear();
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  /** Restore session from the stored refresh token (mobile JSON transport). */
  const restoreSession = useCallback(async () => {
    const refreshToken = await refreshTokenStore.get();
    if (!refreshToken) {
      setStatus('anonymous');
      return;
    }
    try {
      const result = await api.refresh({ clientType: 'mobile', refreshToken });
      tokenStore.set(result.accessToken);
      setUser(result.user);
      setStatus('authenticated');
    } catch {
      clearClientState();
    }
  }, [clearClientState]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    return api.bindAuthHandlers({
      onAccessToken: (token) => {
        tokenStore.set(token);
      },
      onAuthFailure: () => {
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
    () => ({ status, user, login, register, logout, setUser }),
    [status, user, login, register, logout],
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
