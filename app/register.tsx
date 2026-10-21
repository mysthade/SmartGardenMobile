import { registerSchema } from '@smart-garden/validation';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInput, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import {
  AuthField,
  AuthFormError,
  AuthScreenLayout,
  AuthSheetHeader,
  AuthSwitchRow,
  PasswordStrengthMeter,
  PasswordVisibilityToggle,
  SubmitButton,
} from '@/src/components/auth';
import { useAuth } from '@/src/features/auth/auth-context';
import { useTheme } from '@/src/theme/theme-context';
import { formatApiError } from '@/src/lib/api-errors';

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const { theme } = useTheme();
  const isDark = theme.name === 'dark';

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | 'confirmPassword' | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasConfirm = confirmPassword.length > 0;
  const isConfirmMatch = hasConfirm && confirmPassword === password;
  const isConfirmMismatch = hasConfirm && confirmPassword !== password;

  const confirmError = isConfirmMismatch
    ? 'Паролі не збігаються'
    : errors.confirmPassword;
  const confirmSuccessMessage = isConfirmMatch
    ? '✓ Паролі збігаються'
    : undefined;

  const handleNameChange = (text: string) => {
    setName(text);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const onSubmit = async () => {
    if (submitting) {
      return;
    }
    setFormError(null);
    setNotice(null);

    const fieldErrors: FieldErrors = {};

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'email' || key === 'password') {
          fieldErrors[key] = issue.message;
        }
      }
    }

    if (!confirmPassword) {
      fieldErrors.confirmPassword = 'Підтвердіть пароль';
    } else if (confirmPassword !== password) {
      fieldErrors.confirmPassword = 'Паролі не збігаються';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const message = await register(name.trim(), email.trim().toLowerCase(), password);
      setNotice(message);
    } catch (error) {
      setFormError(formatApiError(error, 'Не вдалося зареєструватися'));
    } finally {
      setSubmitting(false);
    }
  };

  if (notice) {
    return (
      <AuthScreenLayout onBack={() => router.replace('/login')} testID="register-notice-screen">
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeIcon}>📧</Text>
          <AuthSheetHeader title="Перевірте пошту" subtitle={notice} />
          <View style={styles.noticeButtonWrap}>
            <SubmitButton
              title="До входу"
              onPress={() => router.replace('/login')}
              testID="register-notice-submit"
            />
          </View>
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout onBack={() => router.replace('/welcome')} testID="register-screen">
      <AuthSheetHeader
        title="Створімо акаунт 🌱"
        subtitle="Ті самі дані з'являться і на сайті"
      />

      <AuthField
        label="Ім'я"
        value={name}
        onChangeText={handleNameChange}
        placeholder="Олена"
        leadingIcon="👤"
        error={errors.name}
        focused={focusedField === 'name'}
        onFocus={() => setFocusedField('name')}
        onBlur={() => setFocusedField((f) => (f === 'name' ? null : f))}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        testID="register-name"
      />

      <AuthField
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={handleEmailChange}
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
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        testID="register-email"
      />

      <AuthField
        ref={passwordRef}
        label="Пароль"
        value={password}
        onChangeText={handlePasswordChange}
        placeholder="••••••••"
        leadingIcon="🔒"
        error={errors.password}
        focused={focusedField === 'password'}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField((f) => (f === 'password' ? null : f))}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        testID="register-password"
        trailing={
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        }
      />

      <PasswordStrengthMeter
        password={password}
        hasError={Boolean(errors.password)}
        errorMessage={errors.password}
        testID="register-password-strength"
      />

      <AuthField
        ref={confirmPasswordRef}
        label="Повторіть пароль"
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        placeholder="••••••••"
        leadingIcon="🔒"
        error={confirmError}
        success={isConfirmMatch}
        successMessage={confirmSuccessMessage}
        focused={focusedField === 'confirmPassword'}
        onFocus={() => setFocusedField('confirmPassword')}
        onBlur={() => setFocusedField((f) => (f === 'confirmPassword' ? null : f))}
        secureTextEntry={!showConfirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
        testID="register-confirm-password"
        trailing={
          <View style={styles.trailingGroup}>
            {isConfirmMatch ? (
              <View
                style={[styles.matchBadge, { backgroundColor: theme.ac3 }]}
                testID="register-confirm-match-badge"
                accessibilityLabel="Паролі збігаються"
              >
                <Check size={14} color={theme.ac} strokeWidth={3} />
              </View>
            ) : isConfirmMismatch ? (
              <View
                style={[
                  styles.matchBadge,
                  { backgroundColor: isDark ? '#2e1919' : '#fdeeed' },
                ]}
                testID="register-confirm-mismatch-badge"
                accessibilityLabel="Паролі не збігаються"
              >
                <X size={14} color={theme.danger} strokeWidth={3} />
              </View>
            ) : null}
            <PasswordVisibilityToggle
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((v) => !v)}
            />
          </View>
        }
      />

      {formError ? <AuthFormError message={formError} /> : null}

      <SubmitButton
        title="Зареєструватися"
        onPress={() => void onSubmit()}
        loading={submitting}
        testID="register-submit"
      />

      <AuthSwitchRow
        prefix="Вже є акаунт?"
        action="Увійти"
        onPress={() => router.push('/login')}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  noticeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  noticeIcon: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  noticeButtonWrap: {
    width: '100%',
    marginTop: 24,
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});

