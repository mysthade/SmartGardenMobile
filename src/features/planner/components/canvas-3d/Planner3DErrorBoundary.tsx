import React, { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  onFallbackTo25D: () => void;
  isDark: boolean;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class Planner3DErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Помилка WebGL контексту',
    };
  }

  componentDidCatch(_error: Error) {
    // Automatically fallback to 2.5D if WebGL is unavailable or crashed
    this.props.onFallbackTo25D();
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      const isDark = this.props.isDark;
      return (
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
          ]}
        >
          <AlertTriangle size={48} color="#e74c3c" />
          <Text style={[styles.title, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
            3D режим недоступний
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Виникла помилка графічного контексту WebGL. Рекомендуємо використовувати легкий 2.5D режим.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: '#10b981' }]}
              onPress={this.props.onFallbackTo25D}
            >
              <Text style={styles.btnText}>Перейти в 2.5D</Text>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryBtn,
                { borderColor: isDark ? '#334155' : '#cbd5e1' },
              ]}
              onPress={this.handleRetry}
            >
              <RotateCcw size={16} color={isDark ? '#f8fafc' : '#0f172a'} />
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: isDark ? '#f8fafc' : '#0f172a' },
                ]}
              >
                Спробувати знову
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  primaryBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
