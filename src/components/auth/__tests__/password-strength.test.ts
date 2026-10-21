import {
  getPasswordStrength,
  getStrengthColor,
} from '../password-strength';
import { darkTheme, lightTheme } from '@/src/theme/tokens';

describe('PasswordStrength - обчислення надійності пароля', () => {
  it('для порожнього пароля повертає score 0', () => {
    const res = getPasswordStrength('');
    expect(res.score).toBe(0);
    expect(res.label).toBe('');
  });

  it('пароль менше 8 символів класифікується як "Слабкий"', () => {
    expect(getPasswordStrength('12345').score).toBe(1);
    expect(getPasswordStrength('12345').label).toBe('Слабкий');
    expect(getPasswordStrength('abcdefg').score).toBe(1);
    expect(getPasswordStrength('abcdefg').label).toBe('Слабкий');
  });

  it('пароль від 8 символів лише з малих літер класифікується як "Слабкий"', () => {
    const res = getPasswordStrength('abcdefghij');
    expect(res.score).toBe(1);
    expect(res.label).toBe('Слабкий');
  });

  it('пароль від 8 символів з літерами та цифрами класифікується як "Середній"', () => {
    const res = getPasswordStrength('garden2026');
    expect(res.score).toBe(2);
    expect(res.label).toBe('Середній');
  });

  it('пароль від 10 символів з великими/малими літерами, цифрами та спецсимволами класифікується як "Надійний"', () => {
    const res = getPasswordStrength('SmartGarden#2026!');
    expect(res.score).toBe(3);
    expect(res.label).toBe('Надійний');
  });

  it('getStrengthColor повертає правильні кольори для тем', () => {
    expect(getStrengthColor(1, lightTheme)).toBe(lightTheme.danger);
    expect(getStrengthColor(2, lightTheme)).toBe('#e67e22');
    expect(getStrengthColor(3, lightTheme)).toBe(lightTheme.ac);

    expect(getStrengthColor(1, darkTheme)).toBe(darkTheme.danger);
    expect(getStrengthColor(3, darkTheme)).toBe(darkTheme.ac);
    expect(getStrengthColor(0, lightTheme)).toBe(lightTheme.bd);
  });
});
