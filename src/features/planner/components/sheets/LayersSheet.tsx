import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, Unlock, X } from 'lucide-react-native';
import type { PlanObjectLayer } from '@smart-garden/types';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface LayersSheetProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const LAYERS_LIST: { id: PlanObjectLayer; label: string; color: string }[] = [
  { id: 'BUILDINGS', label: 'Будівлі та споруди', color: '#c0653a' },
  { id: 'UTILITIES', label: 'Комунікації та вода', color: '#0284c7' },
  { id: 'PLANTS', label: 'Рослини та грядки', color: '#16a34a' },
  { id: 'PATHS', label: 'Доріжки та огорожі', color: '#78716c' },
  { id: 'OTHER', label: 'Інші елементи', color: '#71717a' },
];

export function LayersSheet({ visible, onClose, isDark }: LayersSheetProps) {
  const insets = useSafeAreaInsets();
  const layersVisibility = useGardenPlannerStore((s) => s.layersVisibility);
  const layersLocked = useGardenPlannerStore((s) => s.layersLocked);
  const toggleLayerVisibility = useGardenPlannerStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useGardenPlannerStore((s) => s.toggleLayerLock);

  const bg = isDark ? '#151f1a' : '#ffffff';
  const text = isDark ? '#eaf2ec' : '#14201a';
  const muted = isDark ? '#8ea497' : '#5f6f66';
  const border = isDark ? '#243228' : '#e2ece2';
  const cardBg = isDark ? '#1e2b24' : '#f6faf6';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          <View style={[styles.header, { borderBottomColor: border }]}>
            <Text style={[styles.title, { color: text }]}>Керування шарами</Text>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: cardBg }]}
              onPress={onClose}
              hitSlop={8}
            >
              <X size={18} color={text} />
            </Pressable>
          </View>

          <View style={styles.list}>
            {LAYERS_LIST.map((layer) => {
              const isVisible = layersVisibility[layer.id];
              const isLocked = layersLocked[layer.id];

              return (
                <View
                  key={layer.id}
                  style={[
                    styles.layerRow,
                    { backgroundColor: cardBg, borderColor: border },
                  ]}
                >
                  <View style={[styles.colorDot, { backgroundColor: layer.color }]} />
                  <Text style={[styles.layerName, { color: text }]}>{layer.label}</Text>

                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.iconBtn, { backgroundColor: bg }]}
                      onPress={() => toggleLayerVisibility(layer.id)}
                      accessibilityLabel={isVisible ? 'Приховати шар' : 'Показати шар'}
                    >
                      {isVisible ? (
                        <Eye size={18} color="#2f8f57" />
                      ) : (
                        <EyeOff size={18} color={muted} />
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.iconBtn, { backgroundColor: bg }]}
                      onPress={() => toggleLayerLock(layer.id)}
                      accessibilityLabel={isLocked ? 'Розблокувати шар' : 'Заблокувати шар'}
                    >
                      {isLocked ? (
                        <Lock size={18} color="#ef4444" />
                      ) : (
                        <Unlock size={18} color={muted} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  layerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
