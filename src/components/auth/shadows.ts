import type { ThemeTokens } from '@/src/theme/tokens';

/** Тінь картки вгору: м'якша в темній темі (чорна, не акцентне світіння). */
export function sheetShadow(theme: ThemeTokens) {
  if (theme.name === 'dark') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    } as const;
  }
  return {
    shadowColor: '#1c3a28',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  } as const;
}

/**
 * Тінь primary-кнопки: на темному фоні акцентна тінь виглядає як світіння,
 * тому зменшуємо opacity і радіус.
 */
export function primaryShadow(theme: ThemeTokens) {
  if (theme.name === 'dark') {
    return {
      shadowColor: theme.ac,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    } as const;
  }
  return {
    shadowColor: theme.ac,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  } as const;
}
