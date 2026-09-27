/**
 * Дизайн-токени Smart Garden (єдине джерело для світлої/темної теми).
 * Значення — з референсу welcome-flow-v2.
 */
export type ThemeName = 'light' | 'dark';

export interface ThemeTokens {
  name: ThemeName;
  bg: string;
  pn: string;
  tx: string;
  mu: string;
  bd: string;
  ac: string;
  ac2: string;
  ac3: string;
  /** Колір помилок/небезпечних дій: світла #d64545, темна #e5695f. */
  danger: string;
}

export const lightTheme: ThemeTokens = {
  name: 'light',
  bg: '#f6faf6',
  pn: '#ffffff',
  tx: '#14201a',
  mu: '#5f6f66',
  bd: '#e2ece2',
  ac: '#2f8f57',
  ac2: '#1f6e42',
  ac3: '#eaf6ee',
  danger: '#d64545',
};

export const darkTheme: ThemeTokens = {
  name: 'dark',
  bg: '#0e1512',
  pn: '#151f1a',
  tx: '#eaf2ec',
  mu: '#8ea497',
  bd: '#243228',
  ac: '#3fae6d',
  ac2: '#2f8f57',
  ac3: '#17251c',
  danger: '#e5695f',
};

export const themes: Record<ThemeName, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};
