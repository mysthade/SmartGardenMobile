import type { ThemeTokens } from '@/src/theme/tokens';
import { StyleSheet } from 'react-native';

/** Тінь картки вгору: м'якша в темній темі. */
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

export const MIN_TAP_HEIGHT = 44;

export const welcomeStyles = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute' },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  topZone: { alignItems: 'center', paddingHorizontal: 24 },
  themeToggle: {
    alignSelf: 'flex-end',
    width: MIN_TAP_HEIGHT,
    height: MIN_TAP_HEIGHT,
    borderRadius: MIN_TAP_HEIGHT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  themeToggleText: { fontSize: 20 },
  logo: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  chips: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  sheet: {
    marginTop: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  features: { flexDirection: 'row', gap: 10, marginTop: 18 },
  feature: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 6 },
  featureIcon: { fontSize: 22 },
  featureLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  primary: {
    minHeight: MIN_TAP_HEIGHT,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 14,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghost: {
    minHeight: MIN_TAP_HEIGHT,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
  },
  ghostText: { fontSize: 16, fontWeight: '700' },
});
