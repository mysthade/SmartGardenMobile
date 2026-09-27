import * as SecureStore from 'expo-secure-store';

/**
 * Зберігання вибору теми (light/dark/system).
 * Той самий механізм, що й для токенів: Keystore/Keychain на нативі,
 * тихий no-op fallback на вебі.
 */
const THEME_MODE_KEY = 'sg_theme_mode';

export async function getThemeMode(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(THEME_MODE_KEY);
  } catch {
    return null;
  }
}

export async function setThemeMode(value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_MODE_KEY, value);
  } catch {
    // Web preview: SecureStore is native-only.
  }
}
