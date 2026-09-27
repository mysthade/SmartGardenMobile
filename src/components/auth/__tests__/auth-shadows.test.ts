import { darkTheme, lightTheme } from '@/src/theme/tokens';
import { primaryShadow, sheetShadow } from '../shadows';

describe('auth shadows dynamic token generator', () => {
  it('sheetShadow генерує правильні тіні для світлої теми', () => {
    const shadow = sheetShadow(lightTheme);
    expect(shadow).toEqual({
      shadowColor: '#1c3a28',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
    });
  });

  it('sheetShadow генерує чорну м’якшу тінь для темної теми', () => {
    const shadow = sheetShadow(darkTheme);
    expect(shadow).toEqual({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    });
  });

  it('primaryShadow у темній темі має стримане світіння', () => {
    const shadowLight = primaryShadow(lightTheme);
    const shadowDark = primaryShadow(darkTheme);

    expect(shadowLight.shadowColor).toBe(lightTheme.ac);
    expect(shadowLight.shadowOpacity).toBe(0.35);
    expect(shadowLight.shadowRadius).toBe(14);

    expect(shadowDark.shadowColor).toBe(darkTheme.ac);
    expect(shadowDark.shadowOpacity).toBe(0.25);
    expect(shadowDark.shadowRadius).toBe(10);
  });
});
