import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Square, X } from 'lucide-react-native';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface RectanglePlotWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onApplied: () => void;
  isDark: boolean;
}

const PRESETS = [
  { label: '3 сотки (15 × 20 м)', wM: 15, hM: 20 },
  { label: '6 соток (20 × 30 м)', wM: 20, hM: 30 },
  { label: '10 соток (25 × 40 м)', wM: 25, hM: 40 },
  { label: '15 соток (30 × 50 м)', wM: 30, hM: 50 },
  { label: '20 соток (40 × 50 м)', wM: 40, hM: 50 },
];

export const RectanglePlotWizardModal = React.memo(function RectanglePlotWizardModal({
  visible,
  onClose,
  onApplied,
  isDark,
}: RectanglePlotWizardModalProps) {
  const insets = useSafeAreaInsets();
  const planWidthCm = useGardenPlannerStore((s) => s.plan.widthCm);
  const planHeightCm = useGardenPlannerStore((s) => s.plan.heightCm);
  const updatePlanDimensions = useGardenPlannerStore((s) => s.updatePlanDimensions);
  const resetBoundaryToRectangle = useGardenPlannerStore((s) => s.resetBoundaryToRectangle);

  const [widthM, setWidthM] = useState<string>((planWidthCm / 100).toFixed(1));
  const [heightM, setHeightM] = useState<string>((planHeightCm / 100).toFixed(1));
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? '#0f172a' : '#ffffff';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const border = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  const handleApplyPreset = (w: number, h: number) => {
    setWidthM(w.toString());
    setHeightM(h.toString());
    setError(null);
  };

  const handleApply = () => {
    const wNum = parseFloat(widthM.replace(',', '.'));
    const hNum = parseFloat(heightM.replace(',', '.'));

    if (isNaN(wNum) || wNum < 2 || wNum > 500) {
      setError('Ширина має бути в діапазоні від 2 до 500 метрів');
      return;
    }
    if (isNaN(hNum) || hNum < 2 || hNum > 500) {
      setError('Довжина має бути в діапазоні від 2 до 500 метрів');
      return;
    }

    const wCm = Math.round(wNum * 100);
    const hCm = Math.round(hNum * 100);

    updatePlanDimensions(wCm, hCm);
    resetBoundaryToRectangle();
    onApplied();
    onClose();
  };

  const currentAreaM2 = (parseFloat(widthM.replace(',', '.')) || 0) * (parseFloat(heightM.replace(',', '.')) || 0);
  const currentSotki = (currentAreaM2 / 100).toFixed(2);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View>
              <Text style={[styles.title, { color: text }]}>Прямокутна ділянка (Ш × Д)</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Майстер створення ділянки за точними розмірами
              </Text>
            </View>
            <Pressable style={[styles.closeBtn, { backgroundColor: cardBg }]} onPress={onClose}>
              <X size={18} color={text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <Text style={[styles.sectionTitle, { color: muted }]}>Популярні площі ділянок</Text>
            <View style={styles.presetsGrid}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p.label}
                  style={[styles.presetCard, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() => handleApplyPreset(p.wM, p.hM)}
                >
                  <Square size={16} color="#0ea5e9" style={{ marginRight: 6 }} />
                  <Text style={[styles.presetText, { color: text }]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Inputs */}
            <Text style={[styles.sectionTitle, { color: muted, marginTop: 16 }]}>Власні точні розміри (метри)</Text>

            <View style={styles.inputsRow}>
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: muted }]}>Ширина (X)</Text>
                <View style={[styles.inputContainer, { backgroundColor: cardBg, borderColor: border }]}>
                  <TextInput
                    style={[styles.input, { color: text }]}
                    keyboardType="numeric"
                    value={widthM}
                    onChangeText={(val) => {
                      setWidthM(val);
                      setError(null);
                    }}
                    placeholder="20.0"
                    placeholderTextColor={muted}
                  />
                  <Text style={[styles.inputUnit, { color: muted }]}>м</Text>
                </View>
              </View>

              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: muted }]}>Довжина (Y)</Text>
                <View style={[styles.inputContainer, { backgroundColor: cardBg, borderColor: border }]}>
                  <TextInput
                    style={[styles.input, { color: text }]}
                    keyboardType="numeric"
                    value={heightM}
                    onChangeText={(val) => {
                      setHeightM(val);
                      setError(null);
                    }}
                    placeholder="30.0"
                    placeholderTextColor={muted}
                  />
                  <Text style={[styles.inputUnit, { color: muted }]}>м</Text>
                </View>
              </View>
            </View>

            {/* Live calculation info */}
            <View style={[styles.infoBanner, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.infoText, { color: text }]}>
                Розрахункова площа: <Text style={{ fontWeight: '700', color: '#10b981' }}>{currentAreaM2.toFixed(1)} м²</Text> ({currentSotki} соток)
              </Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Action buttons */}
            <Pressable style={styles.submitBtn} onPress={handleApply}>
              <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>Встановити розміри ділянки</Text>
            </Pressable>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsGrid: {
    gap: 8,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  inputWrap: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
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
    fontWeight: '500',
    marginLeft: 4,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  infoText: {
    fontSize: 13,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    height: 48,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
