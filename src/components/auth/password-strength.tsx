import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { ThemeTokens } from '@/src/theme/tokens';

export type PasswordStrengthScore = 0 | 1 | 2 | 3;

export interface PasswordStrengthResult {
  score: PasswordStrengthScore;
  label: string;
}

/**
 * Оцінка надійності пароля:
 * - 0: порожній
 * - 1: Слабкий (< 8 символів або лише один тип)
 * - 2: Середній (8+ символів, комбінація літер і цифр)
 * - 3: Надійний (10+ символів, великі+малі літери, цифри/спецсимволи)
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: '' };
  }

  const length = password.length;
  const hasLower = /[a-zа-яіїєґ]/.test(password);
  const hasUpper = /[A-ZА-ЯІЇЄҐ]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zа-яіїєґ0-9]/i.test(password);

  const criteriaCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (length < 8 || criteriaCount <= 1) {
    return { score: 1, label: 'Слабкий' };
  }

  if (length >= 10 && criteriaCount >= 3) {
    return { score: 3, label: 'Надійний' };
  }

  return { score: 2, label: 'Середній' };
}

export function getStrengthColor(score: PasswordStrengthScore, theme: ThemeTokens): string {
  switch (score) {
    case 1:
      return theme.danger;
    case 2:
      return '#e67e22'; // помаранчевий
    case 3:
      return theme.ac; // акцентний зелений
    default:
      return theme.bd;
  }
}

export interface PasswordStrengthMeterProps {
  password: string;
  hasError?: boolean;
  errorMessage?: string;
  hint?: string;
  testID?: string;
}

export function PasswordStrengthMeter({
  password,
  hasError = false,
  errorMessage,
  hint = 'Щонайменше 8 символів',
  testID = 'password-strength',
}: PasswordStrengthMeterProps) {
  const { theme } = useTheme();
  const strength = getPasswordStrength(password);
  const activeColor = getStrengthColor(strength.score, theme);

  const displayMessage = hasError ? (errorMessage || hint) : hint;
  const messageColor = hasError ? theme.danger : theme.mu;

  return (
    <View style={styles.container} testID={testID}>
      {strength.score > 0 ? (
        <View style={styles.meterRow} testID={`${testID}-meter`}>
          <View style={styles.barsContainer}>
            <View
              style={[
                styles.bar,
                { backgroundColor: strength.score >= 1 ? activeColor : theme.bd },
              ]}
              testID={`${testID}-bar-1`}
            />
            <View
              style={[
                styles.bar,
                { backgroundColor: strength.score >= 2 ? activeColor : theme.bd },
              ]}
              testID={`${testID}-bar-2`}
            />
            <View
              style={[
                styles.bar,
                { backgroundColor: strength.score >= 3 ? activeColor : theme.bd },
              ]}
              testID={`${testID}-bar-3`}
            />
          </View>
          <Text
            style={[styles.strengthLabel, { color: activeColor }]}
            maxFontSizeMultiplier={1.3}
            testID={`${testID}-label`}
          >
            {strength.label}
          </Text>
        </View>
      ) : null}

      <Text
        style={[styles.hintText, { color: messageColor }]}
        maxFontSizeMultiplier={1.3}
        testID={`${testID}-hint`}
      >
        {displayMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
