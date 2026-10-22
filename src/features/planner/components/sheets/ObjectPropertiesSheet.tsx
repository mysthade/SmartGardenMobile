import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  AlertTriangle,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Grid,
  Lock,
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

const NUDGE_STEPS: Array<{ label: string; cm: number }> = [
  { label: '1 см', cm: 1 },
  { label: '5 см', cm: 5 },
  { label: '10 см', cm: 10 },
  { label: '50 см', cm: 50 },
  { label: '1 м', cm: 100 },
];

export function ObjectPropertiesSheet({
  visible,
  onClose,
  isDark,
}: ObjectPropertiesSheetProps) {
  const insets = useSafeAreaInsets();
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const objects = useGardenPlannerStore((s) => s.objects);
  const plan = useGardenPlannerStore((s) => s.plan);

  const selectedObject = selectedIds.length === 1 ? objects[selectedIds[0]!] : null;
  const isMultiSelect = selectedIds.length > 1;
  const checkRules = useGardenPlannerStore((s) => s.settings.checkRules);

  // Actions
  const updateObjectFields = useGardenPlannerStore((s) => s.updateObjectFields);
  const commitObjectTransform = useGardenPlannerStore((s) => s.commitObjectTransform);
  const moveSelected = useGardenPlannerStore((s) => s.moveSelected);
  const duplicateSelected = useGardenPlannerStore((s) => s.duplicateSelected);
  const createArray = useGardenPlannerStore((s) => s.createArray);
  const alignSelected = useGardenPlannerStore((s) => s.alignSelected);
  const distributeSelected = useGardenPlannerStore((s) => s.distributeSelected);
  const deleteSelected = useGardenPlannerStore((s) => s.deleteSelected);
  const toggleLockSelected = useGardenPlannerStore((s) => s.toggleLockSelected);
  const bringForwardSelected = useGardenPlannerStore((s) => s.bringForwardSelected);
  const sendBackwardSelected = useGardenPlannerStore((s) => s.sendBackwardSelected);

  // Local state
  const [nudgeStepCm, setNudgeStepCm] = useState<number>(10);
  const [coordRef, setCoordRef] = useState<'corner' | 'center'>('corner');
  const [arrayCount, setArrayCount] = useState<string>('3');
  const [arrayStepM, setArrayStepM] = useState<string>('1.0');
  const [isArrayOpen, setIsArrayOpen] = useState(false);

  // Repeating long press timer ref
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRepeating = useCallback((action: () => void) => {
    action();
    repeatTimerRef.current = setInterval(() => {
      action();
    }, 120);
  }, []);

  const stopRepeating = useCallback(() => {
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRepeating();
    };
  }, [stopRepeating]);

  if (!selectedObject && !isMultiSelect) {
    return null;
  }

  const bg = isDark ? '#151f1a' : '#ffffff';
  const text = isDark ? '#eaf2ec' : '#14201a';
  const muted = isDark ? '#8ea497' : '#5f6f66';
  const border = isDark ? '#243228' : '#e2ece2';
  const cardBg = isDark ? '#1e2b24' : '#f6faf6';

  const handleDelete = () => {
    const msg = isMultiSelect
      ? `Видалити ${selectedIds.length} вибраних обʼєктів?`
      : `Ви впевнені, що хочете видалити «${selectedObject?.label}»?`;
    Alert.alert('Видалити обʼєкт?', msg, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          deleteSelected();
          onClose();
        },
      },
    ]);
  };

  // Safe float parser (handles comma or dot)
  const parseMetersToCm = (val: string): number | null => {
    const clean = val.replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : Math.round(num * 100);
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
                {isMultiSelect ? `Вибрано обʼєктів: ${selectedIds.length}` : selectedObject?.label}
              </Text>
              {!isMultiSelect && selectedObject && (
                <Text style={[styles.subtitle, { color: muted }]}>
                  {selectedObject.type} • {(selectedObject.widthCm / 100).toFixed(2)}×{(selectedObject.heightCm / 100).toFixed(2)} м
                </Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {!isMultiSelect && selectedObject && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: cardBg }]}
                  onPress={toggleLockSelected}
                  accessibilityLabel={selectedObject.locked ? 'Розблокувати' : 'Заблокувати'}
                >
                  {selectedObject.locked ? (
                    <Lock size={16} color="#ef4444" />
                  ) : (
                    <Unlock size={16} color={muted} />
                  )}
                </Pressable>
              )}
              <Pressable
                style={[styles.actionBtn, { backgroundColor: cardBg }]}
                onPress={onClose}
                accessibilityLabel="Закрити панель"
              >
                <X size={16} color={text} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Multi-Selection Alignment Toolbar */}
            {isMultiSelect && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Вирівнювання вибраних обʼєктів</Text>
                <View style={styles.alignRow}>
                  <Pressable
                    style={[styles.alignBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => alignSelected('left')}
                  >
                    <AlignLeft size={18} color={text} />
                  </Pressable>
                  <Pressable
                    style={[styles.alignBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => alignSelected('center-x')}
                  >
                    <AlignCenterHorizontal size={18} color={text} />
                  </Pressable>
                  <Pressable
                    style={[styles.alignBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => alignSelected('right')}
                  >
                    <AlignRight size={18} color={text} />
                  </Pressable>
                  <Pressable
                    style={[styles.alignBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => alignSelected('top')}
                  >
                    <AlignStartVertical size={18} color={text} />
                  </Pressable>
                  <Pressable
                    style={[styles.alignBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => alignSelected('center-y')}
                  >
                    <AlignCenterVertical size={18} color={text} />
                  </Pressable>
                  <Pressable
                    style={[styles.alignBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => alignSelected('bottom')}
                  >
                    <AlignEndVertical size={18} color={text} />
                  </Pressable>
                </View>

                <View style={[styles.actionsRow, { marginTop: 10 }]}>
                  <Pressable
                    style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => distributeSelected('horizontal')}
                  >
                    <Text style={[styles.btnText, { color: text }]}>Рівномірно по гориз.</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => distributeSelected('vertical')}
                  >
                    <Text style={[styles.btnText, { color: text }]}>Рівномірно по вертик.</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Soft Warnings Banner */}
            {!isMultiSelect && selectedObject && checkRules && (() => {
              const isOutOfBounds =
                selectedObject.xCm < 0 ||
                selectedObject.yCm < 0 ||
                selectedObject.xCm + selectedObject.widthCm > plan.widthCm ||
                selectedObject.yCm + selectedObject.heightCm > plan.heightCm;

              const minBoundaryOffsetCm = Math.min(
                selectedObject.xCm,
                selectedObject.yCm,
                plan.widthCm - (selectedObject.xCm + selectedObject.widthCm),
                plan.heightCm - (selectedObject.yCm + selectedObject.heightCm),
              );

              const isTooClose = minBoundaryOffsetCm < 100;
              const hasWarning = selectedObject.hasCollision || isOutOfBounds || isTooClose;

              if (!hasWarning) return null;

              return (
                <View style={styles.warningContainer}>
                  <View style={styles.warningHeader}>
                    <AlertTriangle size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                    <Text style={styles.warningTitle}>Попередження планування</Text>
                  </View>
                  {selectedObject.hasCollision && (
                    <Text style={styles.warningItem}>• Обʼєкт перетинається з іншими обʼєктами на плані.</Text>
                  )}
                  {isOutOfBounds && (
                    <Text style={styles.warningItem}>• Частина обʼєкта виходить за межі ділянки.</Text>
                  )}
                  {isTooClose && (
                    <Text style={styles.warningItem}>
                      • Відступ від межі ділянки: {(minBoundaryOffsetCm / 100).toFixed(2)} м (&lt; 1.00 м рекомендовано).
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* 1. Назва обʼєкта */}
            {!isMultiSelect && selectedObject && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Назва обʼєкта</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                  value={selectedObject.label}
                  onChangeText={(label) => updateObjectFields(selectedObject.id, { label })}
                />
              </View>
            )}

            {/* 2. Точне позиціювання (Nudge стрілки з вибором кроку) */}
            <View style={styles.fieldSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.fieldLabel, { color: muted }]}>
                  Точне переміщення (довге натискання повторює)
                </Text>
              </View>

              {/* Вибір кроку зміщення */}
              <View style={styles.stepChipsRow}>
                {NUDGE_STEPS.map((s) => {
                  const active = nudgeStepCm === s.cm;
                  return (
                    <Pressable
                      key={`step-${s.cm}`}
                      style={[
                        styles.stepChip,
                        {
                          backgroundColor: active ? '#10b981' : cardBg,
                          borderColor: active ? '#10b981' : border,
                        },
                      ]}
                      onPress={() => setNudgeStepCm(s.cm)}
                    >
                      <Text
                        style={[
                          styles.stepChipText,
                          { color: active ? '#ffffff' : text },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Nudge стрілки */}
              <View style={styles.nudgeContainer}>
                <Pressable
                  style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPressIn={() => startRepeating(() => moveSelected(0, -nudgeStepCm))}
                  onPressOut={stopRepeating}
                  accessibilityLabel="Зсунути вгору"
                >
                  <ArrowUp size={20} color={text} />
                </Pressable>
                <View style={styles.nudgeRow}>
                  <Pressable
                    style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPressIn={() => startRepeating(() => moveSelected(-nudgeStepCm, 0))}
                    onPressOut={stopRepeating}
                    accessibilityLabel="Зсунути вліво"
                  >
                    <ArrowLeft size={20} color={text} />
                  </Pressable>
                  <View style={styles.nudgeCenterInfo}>
                    {!isMultiSelect && selectedObject && (
                      <>
                        <Text style={[styles.nudgeCoordText, { color: text }]}>
                          X: {(selectedObject.xCm / 100).toFixed(2)} м
                        </Text>
                        <Text style={[styles.nudgeCoordText, { color: text }]}>
                          Y: {(selectedObject.yCm / 100).toFixed(2)} м
                        </Text>
                      </>
                    )}
                  </View>
                  <Pressable
                    style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPressIn={() => startRepeating(() => moveSelected(nudgeStepCm, 0))}
                    onPressOut={stopRepeating}
                    accessibilityLabel="Зсунути вправо"
                  >
                    <ArrowRight size={20} color={text} />
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.nudgeBtn, { backgroundColor: cardBg, borderColor: border }]}
                  onPressIn={() => startRepeating(() => moveSelected(0, nudgeStepCm))}
                  onPressOut={stopRepeating}
                  accessibilityLabel="Зсунути вниз"
                >
                  <ArrowDown size={20} color={text} />
                </Pressable>
              </View>
            </View>

            {/* 3. Числові поля координат та відступів від меж ділянки */}
            {!isMultiSelect && selectedObject && (
              <View style={styles.fieldSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>Числові координати (метри)</Text>
                  <View style={styles.refToggleRow}>
                    <Pressable
                      style={[
                        styles.refToggleBtn,
                        coordRef === 'corner' && { backgroundColor: '#10b981' },
                      ]}
                      onPress={() => setCoordRef('corner')}
                    >
                      <Text style={{ fontSize: 10, color: coordRef === 'corner' ? '#ffffff' : muted, fontWeight: '700' }}>
                        Кут
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.refToggleBtn,
                        coordRef === 'center' && { backgroundColor: '#10b981' },
                      ]}
                      onPress={() => setCoordRef('center')}
                    >
                      <Text style={{ fontSize: 10, color: coordRef === 'center' ? '#ffffff' : muted, fontWeight: '700' }}>
                        Центр
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>
                      {coordRef === 'corner' ? 'X (лівий край)' : 'X (центр)'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(
                        (coordRef === 'corner' ? selectedObject.xCm : selectedObject.xCm + selectedObject.widthCm / 2) / 100
                      ).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null) {
                          const targetX = coordRef === 'corner' ? cm : cm - Math.round(selectedObject.widthCm / 2);
                          commitObjectTransform(selectedObject.id, { xCm: targetX });
                        }
                      }}
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>
                      {coordRef === 'corner' ? 'Y (верхній край)' : 'Y (центр)'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(
                        (coordRef === 'corner' ? selectedObject.yCm : selectedObject.yCm + selectedObject.heightCm / 2) / 100
                      ).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null) {
                          const targetY = coordRef === 'corner' ? cm : cm - Math.round(selectedObject.heightCm / 2);
                          commitObjectTransform(selectedObject.id, { yCm: targetY });
                        }
                      }}
                    />
                  </View>
                </View>

                {/* Відступи від 4 меж ділянки */}
                <Text style={[styles.fieldLabel, { color: muted, marginTop: 12 }]}>
                  Відступи від меж ділянки (метри)
                </Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>Від лівої межі</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(selectedObject.xCm / 100).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null && cm >= 0) {
                          commitObjectTransform(selectedObject.id, { xCm: cm });
                        }
                      }}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>Від верхньої межі</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(selectedObject.yCm / 100).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null && cm >= 0) {
                          commitObjectTransform(selectedObject.id, { yCm: cm });
                        }
                      }}
                    />
                  </View>
                </View>

                <View style={[styles.row, { marginTop: 6 }]}>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>Від правої межі</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(Math.max(0, plan.widthCm - (selectedObject.xCm + selectedObject.widthCm)) / 100).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null && cm >= 0) {
                          const newX = plan.widthCm - cm - selectedObject.widthCm;
                          commitObjectTransform(selectedObject.id, { xCm: Math.round(newX) });
                        }
                      }}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>Від нижньої межі</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(Math.max(0, plan.heightCm - (selectedObject.yCm + selectedObject.heightCm)) / 100).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null && cm >= 0) {
                          const newY = plan.heightCm - cm - selectedObject.heightCm;
                          commitObjectTransform(selectedObject.id, { yCm: Math.round(newY) });
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 4. Розміри обʼєкта (метри) */}
            {!isMultiSelect && selectedObject && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Розміри обʼєкта (метри)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>Ширина</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(selectedObject.widthCm / 100).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null && cm >= 10) {
                          commitObjectTransform(selectedObject.id, { widthCm: cm });
                        }
                      }}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={[styles.fieldSubLabel, { color: muted }]}>Довжина (висота)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                      keyboardType="numeric"
                      defaultValue={(selectedObject.heightCm / 100).toFixed(2)}
                      onEndEditing={(e) => {
                        const cm = parseMetersToCm(e.nativeEvent.text);
                        if (cm !== null && cm >= 10) {
                          commitObjectTransform(selectedObject.id, { heightCm: cm });
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 5. Поворот: ±1°, 15°, 45°, 90° */}
            {!isMultiSelect && selectedObject && (
              <View style={styles.fieldSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>
                    Поворот: {selectedObject.rotationDeg}°
                  </Text>
                  <View style={styles.rotMicroRow}>
                    <Pressable
                      style={[styles.rotMicroBtn, { backgroundColor: cardBg, borderColor: border }]}
                      onPress={() => commitObjectTransform(selectedObject.id, { rotationDeg: (selectedObject.rotationDeg - 1 + 360) % 360 })}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: text }}>-1°</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.rotMicroBtn, { backgroundColor: cardBg, borderColor: border }]}
                      onPress={() => commitObjectTransform(selectedObject.id, { rotationDeg: (selectedObject.rotationDeg + 1) % 360 })}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: text }}>+1°</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.rotationRow}>
                  <Pressable
                    style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => commitObjectTransform(selectedObject.id, { rotationDeg: 0 })}
                  >
                    <Text style={[styles.btnText, { color: text }]}>0°</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => commitObjectTransform(selectedObject.id, { rotationDeg: 45 })}
                  >
                    <Text style={[styles.btnText, { color: text }]}>45°</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => commitObjectTransform(selectedObject.id, { rotationDeg: 90 })}
                  >
                    <Text style={[styles.btnText, { color: text }]}>90°</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rotateBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => commitObjectTransform(selectedObject.id, { rotationDeg: (selectedObject.rotationDeg + 15) % 360 })}
                  >
                    <RotateCw size={14} color={text} />
                    <Text style={[styles.btnText, { color: text }]}>+15°</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* 6. Масив та Дублювання зі зміщенням */}
            {!isMultiSelect && selectedObject && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Тиражування (масив / ряд)</Text>
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: cardBg, borderColor: border, marginBottom: 8 }]}
                  onPress={() => setIsArrayOpen(!isArrayOpen)}
                >
                  <Grid size={16} color={text} />
                  <Text style={[styles.btnText, { color: text }]}>
                    {isArrayOpen ? 'Приховати параметри масиву' : 'Створити ряд (масив копій)'}
                  </Text>
                </Pressable>

                {isArrayOpen && (
                  <View style={[styles.arrayCard, { backgroundColor: cardBg, borderColor: border }]}>
                    <View style={styles.row}>
                      <View style={styles.col}>
                        <Text style={[styles.fieldSubLabel, { color: muted }]}>Кількість копій</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: bg, color: text, borderColor: border }]}
                          keyboardType="numeric"
                          value={arrayCount}
                          onChangeText={setArrayCount}
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={[styles.fieldSubLabel, { color: muted }]}>Крок (метри)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: bg, color: text, borderColor: border }]}
                          keyboardType="numeric"
                          value={arrayStepM}
                          onChangeText={setArrayStepM}
                        />
                      </View>
                    </View>
                    <View style={[styles.actionsRow, { marginTop: 10 }]}>
                      <Pressable
                        style={[styles.controlBtn, { backgroundColor: '#10b981', borderColor: '#10b981' }]}
                        onPress={() => {
                          const cnt = parseInt(arrayCount, 10);
                          const stepCm = parseMetersToCm(arrayStepM) || 100;
                          if (cnt > 0) {
                            createArray(cnt, stepCm, 0);
                            setIsArrayOpen(false);
                          }
                        }}
                      >
                        <Text style={[styles.btnText, { color: '#ffffff', fontWeight: 'bold' }]}>
                          В горизонтальний ряд
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.controlBtn, { backgroundColor: '#10b981', borderColor: '#10b981' }]}
                        onPress={() => {
                          const cnt = parseInt(arrayCount, 10);
                          const stepCm = parseMetersToCm(arrayStepM) || 100;
                          if (cnt > 0) {
                            createArray(cnt, 0, stepCm);
                            setIsArrayOpen(false);
                          }
                        }}
                      >
                        <Text style={[styles.btnText, { color: '#ffffff', fontWeight: 'bold' }]}>
                          У вертикальний ряд
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 7. Шар */}
            {!isMultiSelect && selectedObject && (
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
                            backgroundColor: active ? '#10b981' : cardBg,
                            borderColor: active ? '#10b981' : border,
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
            )}

            {/* 8. Колір */}
            {!isMultiSelect && selectedObject && (
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
            )}

            {/* 9. Порядок шарів та Видалення */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: muted }]}>Дії</Text>
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '84%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
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
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  fieldSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  fieldSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  stepChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  stepChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nudgeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nudgeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeCenterInfo: {
    width: 100,
    alignItems: 'center',
  },
  nudgeCoordText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  refToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rotationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rotateBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rotMicroRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rotMicroBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  alignRow: {
    flexDirection: 'row',
    gap: 8,
  },
  alignBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrayCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  layersRow: {
    gap: 8,
  },
  layerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
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
    shadowRadius: 4,
    elevation: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningTitle: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
  },
  warningItem: {
    color: '#d97706',
    fontSize: 12,
    lineHeight: 18,
  },
});
