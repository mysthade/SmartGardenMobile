import { registerSchema } from '@smart-garden/validation';
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

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setFormError(null);
    setNotice(null);
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'email' || key === 'password') {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const message = await register(parsed.data.name, parsed.data.email, parsed.data.password);
      setNotice(message);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не вдалося зареєструватися');
    } finally {
      setSubmitting(false);
    }
  };

  if (notice) {
    return (
      <View style={styles.screen}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.logo}>📧</Text>
          <Text style={styles.title}>Перевірте пошту</Text>
          <Text style={styles.subtitle}>{notice}</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>До входу</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.logo}>🌱 Smart Garden</Text>
        <Text style={styles.title}>Новий акаунт</Text>
        <Text style={styles.subtitle}>Ті самі дані зʼявляться і на сайті</Text>

        <Text style={styles.label}>Імʼя</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          placeholder="Олена"
          placeholderTextColor="#9AA79B"
        />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

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
          autoComplete="new-password"
          placeholder="Щонайменше 8 символів"
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
            <Text style={styles.buttonText}>Зареєструватися</Text>
          )}
        </Pressable>

        <Link href="/login" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={styles.link}>Вже є акаунт? Увійти</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCF8' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  centered: { alignItems: 'center' },
  logo: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#2F7A4F' },
  title: { fontSize: 24, fontWeight: '600', marginTop: 24, color: '#1C2A1F' },
  subtitle: { fontSize: 14, color: '#6B7A6E', marginTop: 4, marginBottom: 24, textAlign: 'center' },
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
