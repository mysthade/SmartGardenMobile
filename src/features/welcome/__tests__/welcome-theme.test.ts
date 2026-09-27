import { darkTheme, lightTheme } from '@/src/theme/tokens';
import { primaryShadow, sheetShadow } from '@/src/features/welcome/welcome-styles';

describe('welcome theme tokens (з референсу)', () => {
  it('світла тема — точні значення', () => {
    expect(lightTheme).toMatchObject({
      name: 'light',
      bg: '#f6faf6',
      pn: '#ffffff',
      tx: '#14201a',
      mu: '#5f6f66',
      bd: '#e2ece2',
      ac: '#2f8f57',
      ac2: '#1f6e42',
      ac3: '#eaf6ee',
    });
  });

  it('темна тема — точні значення', () => {
    expect(darkTheme).toMatchObject({
      name: 'dark',
      bg: '#0e1512',
      pn: '#151f1a',
      tx: '#eaf2ec',
      mu: '#8ea497',
      bd: '#243228',
      ac: '#3fae6d',
      ac2: '#2f8f57',
      ac3: '#17251c',
    });
  });
});

describe('welcome shadows (нюанси темної теми)', () => {
  it('тінь primary у темній темі слабша, ніж у світлій', () => {
    const light = primaryShadow(lightTheme);
    const dark = primaryShadow(darkTheme);
    expect(dark.shadowOpacity).toBeLessThan(light.shadowOpacity);
    expect(dark.shadowRadius).toBeLessThan(light.shadowRadius);
  });

  it('тінь картки в темній темі — чорна (не акцентне світіння)', () => {
    expect(sheetShadow(darkTheme).shadowColor).toBe('#000');
  });

  it('тінь primary використовує акцентний колір обох тем', () => {
    expect(primaryShadow(lightTheme).shadowColor).toBe(lightTheme.ac);
    expect(primaryShadow(darkTheme).shadowColor).toBe(darkTheme.ac);
  });
});
