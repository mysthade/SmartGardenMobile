import { memo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Minus, Plus, X } from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import { STOCK_USAGE_REASONS } from '../lib/harvest-usage-store';
import { getStepperStep, getUnitShortLabel } from '../lib/harvest-defaults';
import type { CropStockBalance, StockUsageReason } from '../types';

interface StockUsageModalProps {
  stockItem: CropStockBalance | null;
  theme: ThemeTokens;
  onClose: () => void;
  onRecordUsage: (data: {
    plantId: string;
    cropName: string;
    zoneId?: string;
    quantity: number;
    unit: CropStockBalance['unit'];
    reason: StockUsageReason;
    notes?: string;
  }) => Promise<void>;
}

function StockUsageModalInner({
  stockItem,
  theme,
  onClose,
  onRecordUsage,
}: StockUsageModalProps) {
  const [reason, setReason] = useState<StockUsageReason>('EATEN');
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  if (!stockItem) return null;

  const step = getStepperStep(stockItem.unit);

  const handleAdjustQty = (delta: number) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    setQty((prev) => {
      const next = Math.max(step, Math.round((prev + delta * step) * 10) / 10);
      return Math.min(next, stockItem.remaining > 0 ? stockItem.remaining : 9999);
    });
  };

  const handleSave = async () => {
    if (qty <= 0) return;
    setSaving(true);
    try {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }
      await onRecordUsage({
        plantId: stockItem.plantIds[0] ?? 'general',
        cropName: stockItem.plantName,
        zoneId: stockItem.zoneIds[0],
        quantity: qty,
        unit: stockItem.unit,
        reason,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={Boolean(stockItem)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.tx }]}>
                Списання запасу: {stockItem.plantName}
              </Text>
              <Text style={[styles.subtitle, { color: theme.mu }]}>
                Залишок на складі: {stockItem.remaining} {getUnitShortLabel(stockItem.unit)}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
            >
              <X size={18} color={theme.mu} />
            </Pressable>
          </View>

          {/* Reason Chips */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.mu }]}>Причина списання</Text>
            <View style={styles.reasonsRow}>
              {STOCK_USAGE_REASONS.map((r) => {
                const isSelected = reason === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => {
                      setReason(r.value);
                      try {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        // ignore
                      }
                    }}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: isSelected ? r.color : theme.bg,
                        borderColor: isSelected ? r.color : theme.bd,
                      },
                    ]}
                  >
                    <Text style={styles.reasonIcon}>{r.icon}</Text>
                    <Text
                      style={[
                        styles.reasonLabel,
                        { color: isSelected ? '#ffffff' : theme.tx },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Stepper */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.mu }]}>Кількість для списання</Text>
            <View style={[styles.stepperCard, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                onPress={() => handleAdjustQty(-1)}
                hitSlop={8}
              >
                <Minus size={20} color={theme.tx} />
              </Pressable>

              <View style={styles.stepperValueWrap}>
                <TextInput
                  value={String(qty)}
                  onChangeText={(t) => {
                    const parsed = parseFloat(t.replace(',', '.'));
                    setQty(isNaN(parsed) ? 0 : parsed);
                  }}
                  keyboardType="numeric"
                  style={[styles.stepperInput, { color: theme.tx }]}
                  selectTextOnFocus
                />
                <Text style={[styles.stepperUnit, { color: theme.mu }]}>
                  {getUnitShortLabel(stockItem.unit)}
                </Text>
              </View>

              <Pressable
                style={[styles.stepperBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                onPress={() => handleAdjustQty(1)}
                hitSlop={8}
              >
                <Plus size={20} color={theme.tx} />
              </Pressable>
            </View>
          </View>

          {/* Optional Note */}
          <View style={styles.section}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Коментар (кому, куди, рецепт консервації)..."
              placeholderTextColor={theme.mu}
              style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx }]}
            />
          </View>

          {/* Local badge note */}
          <Text style={[styles.localOnlyNotice, { color: theme.mu }]}>
            ℹ️ Списання зберігається локально на цьому пристрої.
          </Text>

          {/* Submit */}
          <Pressable
            disabled={qty <= 0 || saving}
            style={[styles.saveBtn, { backgroundColor: theme.ac, opacity: qty <= 0 || saving ? 0.6 : 1 }]}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Check size={18} color="#ffffff" />
                <Text style={styles.saveBtnText}>Підтвердити списання</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const StockUsageModal = memo(StockUsageModalInner);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  reasonIcon: {
    fontSize: 14,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stepperInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 80,
  },
  stepperUnit: {
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  localOnlyNotice: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 50,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
