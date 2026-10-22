import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Crosshair, HelpCircle, Move, Rotate3d, ZoomIn } from 'lucide-react-native';

interface GesturesHintOverlayProps {
  isDark: boolean;
}

export const GesturesHintOverlay = React.memo(function GesturesHintOverlay({
  isDark,
}: GesturesHintOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating '?' Help Button */}
      <Pressable
        style={[
          styles.helpBtn,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
          },
        ]}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Підказка жестів керування 3D камерою"
      >
        <HelpCircle size={20} color={isDark ? '#94a3b8' : '#64748b'} />
      </Pressable>

      {/* Gestures Hint Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          >
            <Text style={[styles.title, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              Жести керування 3D
            </Text>

            <View style={styles.item}>
              <Rotate3d size={20} color="#10b981" />
              <View style={styles.textWrap}>
                <Text style={[styles.heading, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                  Один палець
                </Text>
                <Text style={[styles.sub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Обертання камери навколо ділянки та нахил
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Move size={20} color="#3b82f6" />
              <View style={styles.textWrap}>
                <Text style={[styles.heading, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                  Два пальці (перетягування)
                </Text>
                <Text style={[styles.sub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Зсув положення камери (пан)
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <ZoomIn size={20} color="#a855f7" />
              <View style={styles.textWrap}>
                <Text style={[styles.heading, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                  Щипок двома пальцями
                </Text>
                <Text style={[styles.sub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Масштабування (zoom in / zoom out)
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Crosshair size={20} color="#06b6d4" />
              <View style={styles.textWrap}>
                <Text style={[styles.heading, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                  Тап по обʼєкту
                </Text>
                <Text style={[styles.sub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Фокусує камеру на обʼєкті для детального огляду з усіх сторін
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <View style={styles.doubleTapBadge}>
                <Text style={styles.doubleTapText}>2×</Text>
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.heading, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                  Подвійний тап
                </Text>
                <Text style={[styles.sub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Скидання камери на вигляд згори (Північ угорі)
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.closeBtn}
              onPress={() => setIsOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Зрозуміло, закрити підказку"
            >
              <Text style={styles.closeBtnText}>Зрозуміло</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  helpBtn: {
    position: 'absolute',
    top: 66,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  doubleTapBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleTapText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
