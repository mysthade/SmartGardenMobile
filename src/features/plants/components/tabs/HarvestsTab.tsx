import { memo, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Check, Plus, Trash2, Wheat, X } from 'lucide-react-native';
import { createHarvestSchema } from '@smart-garden/validation';
import type { HarvestDto, HarvestQuality, HarvestUnit } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { api, newIdempotencyKey, ApiClientError } from '@/src/lib/api';
import { formatDateUkrainian } from '../../lib/plant-helpers';

interface HarvestsTabProps {
  plantId: string;
  theme: ThemeTokens;
}

const UNIT_LABELS: Record<HarvestUnit, string> = {
  GRAM: 'г',
  KILOGRAM: 'кг',
  PIECE: 'шт',
  LITER: 'л',
};

const QUALITY_LABELS: Record<HarvestQuality, { label: string; color: string; bg: string }> = {
  EXCELLENT: { label: 'Відмінна', color: '#15803D', bg: '#DCFCE7' },
  GOOD: { label: 'Добра', color: '#2563EB', bg: '#DBEAFE' },
  AVERAGE: { label: 'Середня', color: '#D97706', bg: '#FEF3C7' },
  POOR: { label: 'Низька', color: '#DC2626', bg: '#FEE2E2' },
};

function HarvestsTabInner({ plantId, theme }: HarvestsTabProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<HarvestUnit>('KILOGRAM');
  const [quality, setQuality] = useState<HarvestQuality>('GOOD');
  const [harvestedAt, setHarvestedAt] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Query
  const {
    data: harvestsList,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['harvests', plantId],
    queryFn: () => api.listHarvests(plantId),
    staleTime: 30_000,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: { quantity: string; unit: HarvestUnit; quality: HarvestQuality; harvestedAt: string; notes?: string | null }) =>
      api.createHarvest(plantId, payload, newIdempotencyKey('harvest')),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['harvests', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      setServerError(err instanceof ApiClientError ? err.message : 'Не вдалося додати запис урожаю');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHarvest(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['harvests', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      Alert.alert('Помилка', err instanceof ApiClientError ? err.message : 'Не вдалося видалити запис');
    },
  });

  const resetForm = () => {
    setQuantity('');
    setUnit('KILOGRAM');
    setQuality('GOOD');
    setHarvestedAt(new Date());
    setNotes('');
    setFormErrors({});
    setServerError(null);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setHarvestedAt(selectedDate);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    setServerError(null);

    const payload = {
      quantity: quantity.trim(),
      unit,
      quality,
      harvestedAt: harvestedAt.toISOString(),
      notes: notes.trim() ? notes.trim() : null,
    };

    const validation = createHarvestSchema.safeParse(payload);
    if (!validation.success) {
      const errs: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? 'quantity');
        errs[field] = issue.message;
      }
      setFormErrors(errs);
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const confirmDelete = (harvest: HarvestDto) => {
    Alert.alert(
      'Видалити урожай?',
      `Ви впевнені, що хочете видалити запис на ${harvest.quantity} ${UNIT_LABELS[harvest.unit]}?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => {
            void deleteMutation.mutateAsync(harvest.id);
          },
        },
      ],
    );
  };

  const harvests = harvestsList?.data ?? [];

  // Summary calculation for the season
  const seasonSummary = useMemo(() => {
    let totalKg = 0;
    let totalPieces = 0;
    let totalLiters = 0;

    for (const h of harvests) {
      const val = parseFloat(h.quantity) || 0;
      if (h.unit === 'KILOGRAM') totalKg += val;
      else if (h.unit === 'GRAM') totalKg += val / 1000;
      else if (h.unit === 'PIECE') totalPieces += val;
      else if (h.unit === 'LITER') totalLiters += val;
    }

    const parts: string[] = [];
    if (totalKg > 0) parts.push(`${totalKg.toFixed(1)} кг`);
    if (totalPieces > 0) parts.push(`${totalPieces} шт`);
    if (totalLiters > 0) parts.push(`${totalLiters.toFixed(1)} л`);

    return parts.length > 0 ? parts.join(' • ') : '0 кг';
  }, [harvests]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Season Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.summaryLeft}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Wheat size={22} color="#D97706" />
          </View>
          <View>
            <Text style={[styles.summaryLabel, { color: theme.mu }]}>Підсумок за сезон:</Text>
            <Text style={[styles.summaryValue, { color: theme.tx }]}>{seasonSummary}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          style={[styles.addBtn, { backgroundColor: '#D97706' }]}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Додати</Text>
        </Pressable>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} colors={[theme.ac]} />
        }
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={[styles.mutedText, { color: theme.mu, marginTop: 12 }]}>Завантаження урожаїв...</Text>
          </View>
        ) : harvests.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <Wheat size={40} color={theme.mu} />
            <Text style={[styles.emptyTitle, { color: theme.tx }]}>Урожай ще не зібрано</Text>
            <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
              Зафіксуйте перший зібраний урожай, вказавши вагу, кількість та оцінку якості.
            </Text>
            <Pressable
              onPress={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              style={[styles.emptyActionBtn, { backgroundColor: '#D97706' }]}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Зафіксувати урожай</Text>
            </Pressable>
          </View>
        ) : (
          harvests.map((item) => {
            const qMeta = QUALITY_LABELS[item.quality] ?? QUALITY_LABELS.GOOD;
            return (
              <View
                key={item.id}
                style={[styles.harvestCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
                <View style={styles.harvestTopRow}>
                  <View>
                    <Text style={[styles.harvestQuantity, { color: theme.tx }]}>
                      {item.quantity} {UNIT_LABELS[item.unit]}
                    </Text>
                    <Text style={[styles.harvestDate, { color: theme.mu }]}>
                      {formatDateUkrainian(item.harvestedAt)}
                    </Text>
                  </View>

                  <View style={styles.harvestRight}>
                    <View style={[styles.qualityBadge, { backgroundColor: qMeta.bg }]}>
                      <Text style={[styles.qualityBadgeText, { color: qMeta.color }]}>{qMeta.label}</Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => confirmDelete(item)}
                      style={[styles.deleteBtn, { borderColor: theme.bd }]}
                    >
                      <Trash2 size={16} color={theme.danger} />
                    </Pressable>
                  </View>
                </View>

                {item.notes ? (
                  <Text style={[styles.harvestNotes, { color: theme.tx }]}>{item.notes}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Harvest Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Зафіксувати урожай</Text>
              <Pressable hitSlop={10} onPress={() => setIsModalOpen(false)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            {serverError ? (
              <View style={[styles.modalError, { backgroundColor: '#FDE8E8', borderColor: theme.danger }]}>
                <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>{serverError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Quantity and Unit */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>
                  Кількість <Text style={{ color: theme.danger }}>*</Text>
                </Text>
                <View style={styles.qtyUnitRow}>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="0.5"
                    placeholderTextColor={theme.mu}
                    style={[
                      styles.input,
                      styles.qtyInput,
                      { backgroundColor: theme.bg, borderColor: formErrors.quantity ? theme.danger : theme.bd, color: theme.tx },
                    ]}
                  />
                  {/* Units Chips */}
                  <View style={styles.unitChips}>
                    {(Object.keys(UNIT_LABELS) as HarvestUnit[]).map((uKey) => {
                      const isSelected = unit === uKey;
                      return (
                        <Pressable
                          key={uKey}
                          onPress={() => setUnit(uKey)}
                          style={[
                            styles.unitChip,
                            {
                              backgroundColor: isSelected ? '#D97706' : theme.bg,
                              borderColor: isSelected ? '#D97706' : theme.bd,
                            },
                          ]}
                        >
                          <Text style={[styles.unitChipText, { color: isSelected ? '#ffffff' : theme.tx }]}>
                            {UNIT_LABELS[uKey]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {formErrors.quantity ? (
                  <Text style={[styles.fieldError, { color: theme.danger }]}>{formErrors.quantity}</Text>
                ) : null}
              </View>

              {/* Quality Chips */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Якість урожаю</Text>
                <View style={styles.chipsWrap}>
                  {(Object.keys(QUALITY_LABELS) as HarvestQuality[]).map((qKey) => {
                    const isSelected = quality === qKey;
                    const meta = QUALITY_LABELS[qKey];
                    return (
                      <Pressable
                        key={qKey}
                        onPress={() => setQuality(qKey)}
                        style={[
                          styles.qualityChip,
                          {
                            backgroundColor: isSelected ? meta.bg : theme.bg,
                            borderColor: isSelected ? meta.color : theme.bd,
                          },
                        ]}
                      >
                        <Text style={[styles.qualityChipText, { color: isSelected ? meta.color : theme.tx }]}>
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Дата збору</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.dateRowBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                >
                  <Calendar size={18} color={theme.mu} />
                  <Text style={[styles.dateRowBtnText, { color: theme.tx }]}>
                    {formatDateUkrainian(harvestedAt)}
                  </Text>
                </Pressable>
              </View>

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Примітки</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Смак, кондиція, сорт..."
                  placeholderTextColor={theme.mu}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    styles.textarea,
                    { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx },
                  ]}
                />
              </View>
            </ScrollView>

            <Pressable
              disabled={createMutation.isPending}
              onPress={handleSubmit}
              style={[styles.submitBtn, { backgroundColor: '#D97706' }]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Зберегти урожай</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={harvestedAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

export const HarvestsTab = memo(HarvestsTabInner);

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 32 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  mutedText: { fontSize: 14, fontWeight: '500' },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  harvestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  harvestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  harvestQuantity: { fontSize: 17, fontWeight: '800' },
  harvestDate: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  harvestRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qualityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qualityBadgeText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestNotes: { fontSize: 13, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalError: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textarea: { minHeight: 70, paddingTop: 10 },
  fieldError: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  qtyUnitRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qtyInput: { flex: 1, fontSize: 16, fontWeight: '700' },
  unitChips: { flexDirection: 'row', gap: 4 },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 38,
    alignItems: 'center',
  },
  unitChipText: { fontSize: 13, fontWeight: '700' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qualityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  qualityChipText: { fontSize: 12, fontWeight: '700' },
  dateRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateRowBtnText: { fontSize: 14, fontWeight: '600' },
  submitBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
