import { loginSchema } from '@smart-garden/validation';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/src/features/auth/auth-context';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.logo}>🌱 Smart Garden</Text>
        <Text style={styles.title}>Вітаємо знову</Text>
        <Text style={styles.subtitle}>Увійдіть тим самим акаунтом, що й на сайті</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#9AA79B"
        />
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

        <Text style={styles.label}>Пароль</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor="#9AA79B"
        />
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={() => void onSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Увійти</Text>
          )}
        </Pressable>

        <Link href="/register" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={styles.link}>Немає акаунту? Зареєструватися</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCF8' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#2F7A4F' },
  title: { fontSize: 24, fontWeight: '600', marginTop: 24, color: '#1C2A1F' },
  subtitle: { fontSize: 14, color: '#6B7A6E', marginTop: 4, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '500', color: '#3D4B40', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#D5DED5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C2A1F',
    backgroundColor: '#fff',
  },
  error: { color: '#C0392B', fontSize: 13, marginTop: 6 },
  button: {
    backgroundColor: '#2F7A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkWrap: { marginTop: 18, alignItems: 'center' },
  link: { color: '#2F7A4F', fontSize: 14, fontWeight: '500' },
});
