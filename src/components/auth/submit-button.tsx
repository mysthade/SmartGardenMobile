import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/theme/theme-context';
import { PrimaryButton } from './auth-chrome';

interface SubmitButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  testID?: string;
}

/**
 * Кнопка сабміту форми: primary-стиль + спінер у стані завантаження.
 * Pressable без disabled: керуємо станом через флаг loading всередині onPress.
 */
export function SubmitButton({ title, onPress, loading, testID }: SubmitButtonProps) {
  return (
    <PrimaryButton onPress={onPress}>
      {loading ? (
        <ActivityIndicator color="#fff" testID={testID ? `${testID}-loading` : undefined} />
      ) : (
        <Text style={submitStyles.text} testID={testID}>
          {title}
        </Text>
      )}
    </PrimaryButton>
  );
}

export function useSubmitDisabled(): { color: string } {
  const { theme } = useTheme();
  return { color: theme.ac };
}

const submitStyles = StyleSheet.create({
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

/** Обгортка Pressable для приглушення у стані завантаження. */
export function SubmitPressable({
  loading,
  children,
  onPress,
  testID,
}: {
  loading?: boolean;
  children: React.ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!loading) {
          onPress();
        }
      }}
      accessibilityRole="button"
      testID={testID}
      style={[pressableStyles.base, loading && pressableStyles.disabled]}
    >
      {children}
    </Pressable>
  );
}

const pressableStyles = StyleSheet.create({
  base: { borderRadius: 14 },
  disabled: { opacity: 0.7 },
});
