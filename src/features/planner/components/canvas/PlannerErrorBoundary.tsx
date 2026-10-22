import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  isDark?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class PlannerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Непередбачена помилка полотна планувальника',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Planner Canvas Crash caught by boundary:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isDark = this.props.isDark;
      const bg = isDark ? '#0f172a' : '#f8fafc';
      const text = isDark ? '#f8fafc' : '#0f172a';
      const sub = isDark ? '#94a3b8' : '#64748b';

      return (
        <View style={[styles.container, { backgroundColor: bg }]}>
          <AlertTriangle size={48} color="#ef4444" />
          <Text style={[styles.title, { color: text }]}>Збій рендерингу полотна</Text>
          <Text style={[styles.subtitle, { color: sub }]}>
            Локальні дані та зміни збережено в чернетці. Спробуйте перезавантажити полотно.
          </Text>
          {this.state.errorMessage ? (
            <Text style={styles.errorSnippet} numberOfLines={3}>
              {this.state.errorMessage}
            </Text>
          ) : null}
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <RefreshCw size={18} color="#ffffff" />
            <Text style={styles.buttonText}>Перезавантажити полотно</Text>
          </Pressable>
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
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorSnippet: {
    fontSize: 12,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2F7A4F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
