import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';

interface ConflictModalProps {
  visible: boolean;
  onKeepMine: () => void;
  onTakeServer: () => void;
  theme: ThemeTokens;
}

export function ConflictModal({
  visible,
  onKeepMine,
  onTakeServer,
  theme,
}: ConflictModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.pn,
              borderColor: theme.bd,
            },
          ]}
        >
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={24} color="#e67e22" />
            </View>
            <Text style={[styles.title, { color: theme.tx }]}>Виявлено зміни на сервері</Text>
          </View>

          <Text style={[styles.message, { color: theme.mu }]}>
            План було змінено в іншому сеансі (наприклад, на веб-сайті), але у вас є незбережені локальні правки. Що ви хочете зробити?
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.bd,
                  borderWidth: 1,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onKeepMine}
            >
              <Text style={[styles.btnText, { color: theme.tx }]}>Залишити мої</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: theme.ac,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={onTakeServer}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>Взяти з сервера</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e67e2220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
