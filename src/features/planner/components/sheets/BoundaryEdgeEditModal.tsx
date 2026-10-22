import React, { useEffect, useState } from 'react';
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
  Check,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  calculateEdgeProperties,
  getEffectiveBoundary,
  hasPolygonSelfIntersections,
  moveEdgeEndpoint,
} from '@smart-garden/validation';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface BoundaryEdgeEditModalProps {
  visible: boolean;
  edgeIndex: number | null;
  onClose: () => void;
  isDark: boolean;
}

export const BoundaryEdgeEditModal = React.memo(function BoundaryEdgeEditModal({
  visible,
  edgeIndex,
  onClose,
  isDark,
}: BoundaryEdgeEditModalProps) {
  const insets = useSafeAreaInsets();
  const plan = useGardenPlannerStore((s) => s.plan);
  const moveBoundaryVertex = useGardenPlannerStore((s) => s.moveBoundaryVertex);
  const deleteBoundaryVertex = useGardenPlannerStore((s) => s.deleteBoundaryVertex);

  const boundary = getEffectiveBoundary(plan);
  const n = boundary.length;

  const validIndex = edgeIndex !== null && edgeIndex >= 0 && edgeIndex < n ? edgeIndex : 0;
  const p1 = boundary[validIndex] ?? { xCm: 0, yCm: 0 };
  const p2Index = (validIndex + 1) % n;
  const p2 = boundary[p2Index] ?? { xCm: 1000, yCm: 0 };

  const currentProps = calculateEdgeProperties(p1, p2);

  const [lengthM, setLengthM] = useState<string>((currentProps.lengthCm / 100).toFixed(2));
  const [angleDeg, setAngleDeg] = useState<string>(currentProps.angleDeg.toString());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && edgeIndex !== null) {
      const b = getEffectiveBoundary(plan);
      const pt1 = b[edgeIndex] ?? { xCm: 0, yCm: 0 };
      const pt2 = b[(edgeIndex + 1) % b.length] ?? { xCm: 1000, yCm: 0 };
      const props = calculateEdgeProperties(pt1, pt2);
      setLengthM((props.lengthCm / 100).toFixed(2));
      setAngleDeg(props.angleDeg.toString());
      setErrorMessage(null);
    }
  }, [visible, edgeIndex, plan]);

  const bg = isDark ? '#0f172a' : '#ffffff';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const border = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  const handleApply = () => {
    const lenNum = parseFloat(lengthM.replace(',', '.'));
    const angNum = parseFloat(angleDeg.replace(',', '.'));

    if (isNaN(lenNum) || lenNum <= 0.2 || lenNum > 1000) {
      setErrorMessage('Введіть коректну довжину ребра (від 0.20 до 1000 метрів)');
      return;
    }
    if (isNaN(angNum)) {
      setErrorMessage('Введіть коректний кут у градусах');
      return;
    }

    const newLengthCm = Math.round(lenNum * 100);
    const newEndpoint = moveEdgeEndpoint(p1, newLengthCm, angNum);

    // Test for self-intersections
    const candidateBoundary = boundary.map((p, idx) => (idx === p2Index ? newEndpoint : p));
    if (hasPolygonSelfIntersections(candidateBoundary)) {
      setErrorMessage('Увага: така довжина або кут призводить до самоперетину контуру ділянки!');
      return;
    }

    moveBoundaryVertex(p2Index, newEndpoint, true);
    onClose();
  };

  const handleSetOrthoAngle = (deg: number) => {
    setAngleDeg(deg.toString());
    setErrorMessage(null);
  };

  const handleDeleteVertex = () => {
    if (n <= 3) {
      Alert.alert('Помилка', 'Контур ділянки повинен мати щонайменше 3 вершини');
      return;
    }
    deleteBoundaryVertex(p2Index);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View>
              <Text style={[styles.title, { color: text }]}>
                Ребро #{validIndex + 1} (вершини {validIndex + 1} → {p2Index + 1})
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Точне налаштування довжини та кута нахилу сторони
              </Text>
            </View>
            <Pressable style={[styles.closeBtn, { backgroundColor: cardBg }]} onPress={onClose}>
              <X size={18} color={text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Length field */}
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: muted }]}>Точна довжина сторони (метри)</Text>
              <View style={[styles.inputBox, { backgroundColor: cardBg, borderColor: border }]}>
                <TextInput
                  style={[styles.input, { color: text }]}
                  keyboardType="numeric"
                  value={lengthM}
                  onChangeText={(val) => {
                    setLengthM(val);
                    setErrorMessage(null);
                  }}
                  placeholder="24.50"
                  placeholderTextColor={muted}
                />
                <Text style={[styles.inputUnit, { color: muted }]}>м</Text>
              </View>
            </View>

            {/* Angle field */}
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: muted }]}>Кут нахилу сторони (градуси)</Text>
              <View style={[styles.inputBox, { backgroundColor: cardBg, borderColor: border }]}>
                <TextInput
                  style={[styles.input, { color: text }]}
                  keyboardType="numeric"
                  value={angleDeg}
                  onChangeText={(val) => {
                    setAngleDeg(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0"
                  placeholderTextColor={muted}
                />
                <Text style={[styles.inputUnit, { color: muted }]}>°</Text>
              </View>
            </View>

            {/* Quick Orthogonal Buttons */}
            <Text style={[styles.sublabel, { color: muted }]}>Ортогональні кути (90°)</Text>
            <View style={styles.orthoRow}>
              {[0, 90, 180, 270].map((deg) => (
                <Pressable
                  key={`ortho-${deg}`}
                  style={[
                    styles.orthoBtn,
                    {
                      backgroundColor: cardBg,
                      borderColor: angleDeg === deg.toString() ? '#0ea5e9' : border,
                    },
                  ]}
                  onPress={() => handleSetOrthoAngle(deg)}
                >
                  <Text
                    style={[
                      styles.orthoText,
                      { color: angleDeg === deg.toString() ? '#0ea5e9' : text, fontWeight: '600' },
                    ]}
                  >
                    {deg}°
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Error banner */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertTriangle size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Actions */}
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.applyBtnText}>Застосувати розміри</Text>
            </Pressable>

            {n > 3 && (
              <Pressable
                style={[styles.deleteBtn, { borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)' }]}
                onPress={handleDeleteVertex}
              >
                <Trash2 size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.deleteBtnText}>Видалити вершину #{p2Index + 1}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

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
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  orthoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  orthoBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  orthoText: {
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    flex: 1,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    height: 48,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
