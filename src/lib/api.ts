import { createApiClient, ApiClientError } from '@smart-garden/api-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { refreshTokenStore, tokenStore } from './token-store';

export { ApiClientError };

/**
 * API base URL resolution:
 * - Set EXPO_PUBLIC_API_URL for a custom URL / production.
 * - On mobile (Expo Go / dev client), auto-detect the dev machine IP from hostUri.
 * - On Android emulator fallback, use 10.0.2.2 (which points to the host machine).
 * - Default to localhost:3001 for web.
 */
function resolveApiBaseUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined);
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('169.254.')) {
      return `http://${host}:3001`;
    }
    return 'http://10.0.2.2:3001';
  }

  if (Platform.OS === 'ios') {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3001`;
    }
    return 'http://localhost:3001';
  }

  return 'http://localhost:3001';
}

export const api = createApiClient({
  baseUrl: resolveApiBaseUrl(),
  // Mobile transport: refresh token in JSON body, no cookies/CSRF.
  clientType: 'mobile',
  getAccessToken: () => tokenStore.get(),
  getRefreshToken: () => refreshTokenStore.get(),
  onAccessToken: (token) => tokenStore.set(token),
  onRefreshToken: (token) => {
    void refreshTokenStore.set(token);
  },
  onAuthFailure: () => {
    tokenStore.clear();
    void refreshTokenStore.clear();
  },
});

export function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
