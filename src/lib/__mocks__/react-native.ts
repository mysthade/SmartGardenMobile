/** Мінімальний мок react-native для чистих unit-тестів (без рендерингу). */
export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const,
  hairlineWidth: 1,
};
