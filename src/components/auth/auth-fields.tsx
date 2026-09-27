import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '@/src/theme/theme-context';
import { AuthBackground, AuthSheet, AuthTopBar } from './auth-chrome';
import { SproutBadge } from './sprout-badge';

export interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  leadingIcon: string;
  error?: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password' | 'new-password' | 'name';
  secureTextEntry?: boolean;
  textContentType?: 'emailAddress' | 'password' | 'newPassword' | 'name';
  trailing?: ReactNode;
  testID?: string;
}

/**
 * Поле форми auth-екранів: лейбл (--mu) + "коробка" з іконкою зліва,
 * рамка --bd 1.5, фон --bg, підсвітка --ac у фокусі, червона рамка при помилці.
 */
export function AuthField(props: AuthFieldProps) {
  const { theme } = useTheme();
  const {
    label,
    leadingIcon,
    error,
    focused,
    trailing,
    testID,
    ...inputProps
  } = props;
  const borderColor = error ? theme.danger : focused ? theme.ac : theme.bd;
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: theme.mu }]}>{label}</Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: theme.bg,
            borderColor,
            ...(focused && !error ? { borderWidth: 2 } : {}),
          },
        ]}
      >
        <Text style={styles.leadingIcon}>{leadingIcon}</Text>
        <TextInput
          style={[styles.input, { color: theme.tx }]}
          placeholderTextColor={theme.mu}
          testID={testID}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** Тонка кнопка-око для пароля 👁️/🙈. */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Приховати пароль' : 'Показати пароль'}
      hitSlop={10}
      style={styles.eye}
    >
      <Text style={styles.eyeText}>{visible ? '🙈' : '👁️'}</Text>
    </Pressable>
  );
}

/** Заголовок картки: h1 (--tx) + підзаголовок (--mu). */
export function AuthSheetHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={[styles.title, { color: theme.tx }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.mu }]}>{subtitle}</Text>
    </View>
  );
}

/** Текст помилки форми (серверної) кольором danger. */
export function AuthFormError({ message }: { message: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.formError, { color: theme.danger }]}>{message}</Text>;
}

export interface AuthScreenShellProps {
  hero: ReactNode;
  children: ReactNode;
  topBar?: ReactNode;
}

/**
 * Спільний каркас auth-екрана: фон + топбар-наповнювач + ScrollView + картка.
 * Клавіатуру обробляє KeyboardAvoidingView (iOS padding, Android — нічого).
 */
export function AuthScreenShell({ hero, children, topBar }: AuthScreenShellProps) {
  return (
    <AuthBackground>
      {topBar ? <AuthTopBar>{topBar}</AuthTopBar> : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>{hero}</View>
          <AuthSheet>{children}</AuthSheet>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

export { SproutBadge };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  fieldWrap: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  leadingIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  eye: { padding: 6, marginLeft: 6 },
  eyeText: { fontSize: 18 },
  error: { fontSize: 13, marginTop: 6 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  formError: { fontSize: 13, marginTop: 10 },
});
