import { loginSchema } from '@smart-garden/validation';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AuthField,
  AuthFormError,
  AuthFormTopBar,
  AuthScreenShell,
  AuthSheetHeader,
  AuthSwitchRow,
  PasswordVisibilityToggle,
  SproutBadge,
} from '@/src/components/auth';
import { SubmitButton } from '@/src/components/auth/submit-button';
import { useAuth } from '@/src/features/auth/auth-context';
import { useTheme } from '@/src/theme/theme-context';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) {
      return;
    }
    setFormError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      router.replace('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не вдалося увійти');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenShell
      topBar={<AuthFormTopBar onBack={() => router.replace('/welcome')} />}
      hero={
        <View style={styles.hero}>
          <SproutBadge theme={theme} />
          <Text style={[styles.logo, { color: theme.ac2 }]}>Smart Garden</Text>
        </View>
      }
    >
      <AuthSheetHeader title="Вітаємо знову 👋" subtitle="Увійдіть тим самим акаунтом, що й на сайті" />

      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        leadingIcon="✉️"
        error={errors.email}
        focused={focusedField === 'email'}
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField((f) => (f === 'email' ? null : f))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        testID="login-email"
      />

      <AuthField
        label="Пароль"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        leadingIcon="🔒"
        error={errors.password}
        focused={focusedField === 'password'}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField((f) => (f === 'password' ? null : f))}
        secureTextEntry={!showPassword}
        autoComplete="password"
        textContentType="password"
        testID="login-password"
        trailing={
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        }
      />

      {formError ? <AuthFormError message={formError} /> : null}

      {/* TODO(forgot-password): екрана відновлення пароля в mobile ще немає — потрібен окремий флоу. */}
      <View style={styles.forgotWrap}>
        <Text style={[styles.forgot, { color: theme.ac2 }]}>Забули пароль?</Text>
      </View>

      <SubmitButton
        title="Увійти"
        onPress={() => void onSubmit()}
        loading={submitting}
        testID="login-submit"
      />

      <AuthSwitchRow
        prefix="Немає акаунту?"
        action="Зареєструватися"
        onPress={() => router.push('/register')}
      />
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  logo: { fontSize: 24, fontWeight: '800', marginTop: 10 },
  forgotWrap: { alignItems: 'flex-end', marginTop: 10 },
  forgot: { fontSize: 13, fontWeight: '700' },
});
