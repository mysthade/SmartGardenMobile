import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Lock,
  RotateCcw,
  RotateCw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react-native';
import type { PlanObjectLayer } from '@smart-garden/types';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface ObjectPropertiesSheetProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const COLOR_SWATCHES = [
  '#c0653a',
  '#d97706',
  '#0284c7',
  '#16a34a',
  '#84cc16',
  '#dc2626',
  '#8d6e63',
  '#64748b',
  '#9333ea',
  '#ec4899',
  '#eab308',
  '#71717a',
];

const LAYERS: { id: PlanObjectLayer; label: string }[] = [
  { id: 'BUILDINGS', label: 'Будівлі' },
  { id: 'UTILITIES', label: 'Комунікації' },
  { id: 'PLANTS', label: 'Рослини' },
  { id: 'PATHS', label: 'Доріжки/Огорожі' },
  { id: 'OTHER', label: 'Інше' },
];

export function ObjectPropertiesSheet({
  visible,
  onClose,
  isDark,
}: ObjectPropertiesSheetProps) {
  const insets = useSafeAreaInsets();
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const objects = useGardenPlannerStore((s) => s.objects);
  const grid = useGardenPlannerStore((s) => s.grid);

  const selectedObject = selectedIds.length === 1 ? objects[selectedIds[0]!] : null;

  const updateObjectFields = useGardenPlannerStore((s) => s.updateObjectFields);
  const commitObjectTransform = useGardenPlannerStore((s) => s.commitObjectTransform);
  const moveSelected = useGardenPlannerStore((s) => s.moveSelected);
  const duplicateSelected = useGardenPlannerStore((s) => s.duplicateSelected);
  const deleteSelected = useGardenPlannerStore((s) => s.deleteSelected);
  const toggleLockSelected = useGardenPlannerStore((s) => s.toggleLockSelected);
  const bringForwardSelected = useGardenPlannerStore((s) => s.bringForwardSelected);
  const sendBackwardSelected = useGardenPlannerStore((s) => s.sendBackwardSelected);

  if (!selectedObject) {
    return null;
  }

  const bg = isDark ? '#151f1a' : '#ffffff';
  const text = isDark ? '#eaf2ec' : '#14201a';
  const muted = isDark ? '#8ea497' : '#5f6f66';
  const border = isDark ? '#243228' : '#e2ece2';
  const cardBg = isDark ? '#1e2b24' : '#f6faf6';

  const step = grid.stepCm || 50;

  const handleDelete = () => {
    Alert.alert(
      'Видалити обʼєкт?',
      `Ви впевнені, що хочете видалити «${selectedObject.label}»?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => {
            deleteSelected();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.title, { color: text }]} numberOfLines={1}>
                {selectedObject.label}
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                {selectedObject.type} • {selectedObject.widthCm}×{selectedObject.heightCm} см
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: cardBg }]}
                onPress={toggleLockSelected}
              >
                {selectedObject.locked ? (
                  <Lock size={16} color="#ef4444" />
                ) : (
                  <Unlock size={16} color={muted} />
                )}
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: cardBg }]}
                onPress={onClose}
              >
                <X size={16} color={text} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 1. Назва обʼєкта */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>Назва обʼєкта</Text>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                value={selectedObject.label}
                onChangeText={(label) => updateObjectFields(selectedObject.id, { label })}
              />
            </View>

            {/* 2. Швидке точне переміщення (Nudge кнопки) */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>
                Позиціювання (крок {step} см)
              </Text>
              <View style={styles.nudgeContainer}>
                <Pressable
                  style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() => moveSelected(0, -step)}
                >
                  <ArrowUp size={18} color={text} />
                </Pressable>
                <View style={styles.nudgeRow}>
                  <Pressable
                    style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => moveSelected(-step, 0)}
                  >
                    <ArrowLeft size={18} color={text} />
                  </Pressable>
                  <View style={styles.nudgeCenterInfo}>
                    <Text style={[styles.nudgeCoordText, { color: text }]}>
                      X: {selectedObject.xCm}
                    </Text>
                    <Text style={[styles.nudgeCoordText, { color: text }]}>
                      Y: {selectedObject.yCm}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => moveSelected(step, 0)}
                  >
                    <ArrowRight size={18} color={text} />
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() => moveSelected(0, step)}
                >
                  <ArrowDown size={18} color={text} />
                </Pressable>
              </View>
            </View>

            {/* 3. Розміри та Поворот */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Ширина (см)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                  keyboardType="numeric"
                  value={String(selectedObject.widthCm)}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 10) {
                      commitObjectTransform(selectedObject.id, { widthCm: num });
                    }
                  }}
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Висота (см)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                  keyboardType="numeric"
                  value={String(selectedObject.heightCm)}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 10) {
                      commitObjectTransform(selectedObject.id, { heightCm: num });
                    }
                  }}
                />
              </View>
            </View>

            {/* Поворот */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>
                Поворот: {selectedObject.rotationDeg}°
              </Text>
              <View style={styles.rotationRow}>
                <Pressable
                  style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() =>
                    commitObjectTransform(selectedObject.id, {
                      rotationDeg: (selectedObject.rotationDeg - 15 + 360) % 360,
                    })
                  }
                >
                  <RotateCcw size={16} color={text} />
                  <Text style={[styles.btnText, { color: text }]}>-15°</Text>
                </Pressable>
                <Pressable
                  style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() =>
                    commitObjectTransform(selectedObject.id, { rotationDeg: 0 })
                  }
                >
                  <Text style={[styles.btnText, { color: text }]}>Скинути (0°)</Text>
                </Pressable>
                <Pressable
                  style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() =>
                    commitObjectTransform(selectedObject.id, {
                      rotationDeg: (selectedObject.rotationDeg + 15) % 360,
                    })
                  }
                >
                  <RotateCw size={16} color={text} />
                  <Text style={[styles.btnText, { color: text }]}>+15°</Text>
                </Pressable>
              </View>
            </View>

            {/* 4. Шар */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>Шар обʼєкта</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layersRow}>
                {LAYERS.map((l) => {
                  const active = selectedObject.layer === l.id;
                  return (
                    <Pressable
                      key={l.id}
                      style={[
                        styles.layerChip,
                        {
                          backgroundColor: active ? '#2f8f57' : cardBg,
                          borderColor: active ? '#2f8f57' : border,
                        },
                      ]}
                      onPress={() => updateObjectFields(selectedObject.id, { layer: l.id })}
                    >
                      <Text style={{ color: active ? '#ffffff' : text, fontSize: 12, fontWeight: active ? '700' : '500' }}>
                        {l.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5. Колір */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>Колір заливки</Text>
              <View style={styles.paletteRow}>
                {COLOR_SWATCHES.map((color) => {
                  const isCurrent = (selectedObject.color || '').toLowerCase() === color.toLowerCase();
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.swatch,
                        { backgroundColor: color },
                        isCurrent && styles.swatchActive,
                      ]}
                      onPress={() => updateObjectFields(selectedObject.id, { color })}
                    />
                  );
                })}
              </View>
            </View>

            {/* 6. Порядок шарів та Дублювання */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>Керування</Text>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={bringForwardSelected}
                >
                  <Text style={[styles.btnText, { color: text }]}>На передній план</Text>
                </Pressable>
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={sendBackwardSelected}
                >
                  <Text style={[styles.btnText, { color: text }]}>На задній план</Text>
                </Pressable>
              </View>
              <View style={[styles.actionsRow, { marginTop: 8 }]}>
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={duplicateSelected}
                >
                  <Copy size={16} color={text} />
                  <Text style={[styles.btnText, { color: text }]}>Дублювати</Text>
                </Pressable>
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                  onPress={handleDelete}
                >
                  <Trash2 size={16} color="#dc2626" />
                  <Text style={[styles.btnText, { color: '#dc2626' }]}>Видалити</Text>
                </Pressable>
              </View>
            </View>

            {/* 7. Прив'язані рослини/зони */}
            {selectedObject.zoneId ? (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Привʼязана зона</Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.controlBtn, { backgroundColor: '#eaf6ee', borderColor: '#a3c99e' }]}
                    onPress={() => {
                      onClose();
                      router.push(`/zones/${selectedObject.zoneId}` as never);
                    }}
                  >
                    <Text style={{ color: '#2f8f57', fontWeight: '700' }}>Відкрити зону</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => {
                      onClose();
                      router.push(`/zones/${selectedObject.zoneId}/editor` as never);
                    }}
                  >
                    <Text style={[styles.btnText, { color: text }]}>Редактор грядки</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {selectedObject.plantId ? (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Привʼязана рослина</Text>
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: '#eaf6ee', borderColor: '#a3c99e' }]}
                  onPress={() => {
                    onClose();
                    router.push(`/plants/${selectedObject.plantId}` as never);
                  }}
                >
                  <Text style={{ color: '#2f8f57', fontWeight: '700' }}>Відкрити картку рослини</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
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
    maxHeight: '85%',
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
  headerTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 18,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  nudgeContainer: {
    alignItems: 'center',
    gap: 6,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nudgeBtn: {
    width: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeCenterInfo: {
    width: 80,
    alignItems: 'center',
  },
  nudgeCoordText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rotationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rotateBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  layersRow: {
    gap: 8,
  },
  layerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
