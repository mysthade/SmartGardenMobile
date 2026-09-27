import { createApiClient } from '@smart-garden/api-client';
import Constants from 'expo-constants';
import { refreshTokenStore, tokenStore } from './token-store';

/**
 * API base URL resolution:
 * - Set EXPO_PUBLIC_API_URL for a physical phone (e.g. http://192.168.1.x:3001 —
 *   localhost on the phone points to the phone itself).
 * - Default to localhost:3001 for web preview on the same PC (this machine).
 */
function resolveApiBaseUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'http://localhost:3001';
  return configured.replace(/\/$/, '');
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
