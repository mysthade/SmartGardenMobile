import * as SecureStore from 'expo-secure-store';

/**
 * Access token lives in memory only (fast reads during render).
 * Refresh token persists in Android Keystore / iOS Keychain via SecureStore.
 */
let accessToken: string | null = null;

const REFRESH_TOKEN_KEY = 'sg_refresh_token';

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
  },
};

export const refreshTokenStore = {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};
