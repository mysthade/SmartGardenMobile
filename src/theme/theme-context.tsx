import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { getThemeMode, setThemeMode } from './theme-storage';
import { darkTheme, lightTheme, type ThemeName, type ThemeTokens } from './tokens';

export type ThemeMode = ThemeName | 'system';

interface ThemeContextValue {
  /** Активна розв'язана тема (ніколи не 'system'). */
  theme: ThemeTokens;
  /** Режим: явний вибір або слідування системі. */
  mode: ThemeMode;
  /** Вибрати світлу/темну/системну тему; вибір зберігається. */
  setMode: (mode: ThemeMode) => void;
  /** Швидке перемикання light ↔ dark (зберігається як явний вибір). */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const VALID_MODES: readonly string[] = ['light', 'dark', 'system'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Відновлюємо збережений режим один раз при старті.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await getThemeMode();
      if (!cancelled && stored !== null && (VALID_MODES as string[]).includes(stored)) {
        setModeState(stored as ThemeMode);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setThemeMode(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const current: ThemeName =
        prev === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prev;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      void setThemeMode(next);
      return next;
    });
  }, [systemScheme]);

  const resolved: ThemeName =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      setMode,
      toggleTheme,
    }),
    [theme, mode, setMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
