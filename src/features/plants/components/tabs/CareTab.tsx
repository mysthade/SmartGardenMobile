import { memo, useState } from 'react';
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
import { Calendar, Check, Droplets, Plus, Scissors, Sparkles, Trash2, X } from 'lucide-react-native';
import { createCareActivitySchema } from '@smart-garden/validation';
import type { CareActivityDto, CareActivityType } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { api, newIdempotencyKey, ApiClientError } from '@/src/lib/api';
import { formatDateUkrainian } from '../../lib/plant-helpers';

interface CareTabProps {
  plantId: string;
  theme: ThemeTokens;
}

const CARE_TYPE_LABELS: Record<CareActivityType, { label: string; color: string; bg: string }> = {
  WATERING: { label: 'Полив', color: '#0284C7', bg: '#E0F2FE' },
  FERTILIZING: { label: 'Підживлення', color: '#16A34A', bg: '#DCFCE7' },
  PRUNING: { label: 'Обрізка', color: '#D97706', bg: '#FEF3C7' },
  TRANSPLANTING: { label: 'Пересадка', color: '#7C3AED', bg: '#EDE9FE' },
  PEST_TREATMENT: { label: 'Обробка', color: '#DC2626', bg: '#FEE2E2' },
  TYING: { label: 'Підвʼязка', color: '#4B5563', bg: '#F3F4F6' },
  SOIL_TREATMENT: { label: 'Ґрунт', color: '#92400E', bg: '#FEF3C7' },
  OTHER: { label: 'Інше', color: '#4B5563', bg: '#F3F4F6' },
};

function CareTabInner({ plantId, theme }: CareTabProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [type, setType] = useState<CareActivityType>('WATERING');
  const [performedAt, setPerformedAt] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [productName, setProductName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Query
  const {
    data: careList,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['care', plantId],
    queryFn: () => api.listCareActivities(plantId),
    staleTime: 30_000,
  });

  // Create Care Activity Mutation
  const createMutation = useMutation({
    mutationFn: (payload: { type: CareActivityType; performedAt: string; notes?: string | null; productName?: string | null }) =>
      api.createCareActivity(plantId, payload, newIdempotencyKey('care')),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['care', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      setServerError(err instanceof ApiClientError ? err.message : 'Не вдалося зберегти активність');
    },
  });

  // Quick Action Handler (e.g. 1-tap "Полити" or "Підживити")
  const handleQuickAction = async (quickType: CareActivityType, label: string) => {
    try {
      await createMutation.mutateAsync({
        type: quickType,
        performedAt: new Date().toISOString(),
        notes: `Швидка дія: ${label}`,
      });
      Alert.alert('Успішно', `Дію «${label}» зафіксовано.`);
    } catch {
      Alert.alert('Помилка', 'Не вдалося зафіксувати дію.');
    }
  };

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (activityId: string) => api.deleteCareActivity(activityId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['care', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      Alert.alert('Помилка', err instanceof ApiClientError ? err.message : 'Не вдалося видалити активність');
    },
  });

  const resetForm = () => {
    setType('WATERING');
    setPerformedAt(new Date());
    setNotes('');
    setProductName('');
    setServerError(null);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setPerformedAt(selectedDate);
  };

  const handleSubmit = async () => {
    setServerError(null);

    const payload = {
      type,
      performedAt: performedAt.toISOString(),
      notes: notes.trim() ? notes.trim() : null,
      productName: productName.trim() ? productName.trim() : null,
    };

    const validation = createCareActivitySchema.safeParse(payload);
    if (!validation.success) {
      setServerError(validation.error.issues[0]?.message ?? 'Помилка валідації');
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const confirmDelete = (activity: CareActivityDto) => {
    const meta = CARE_TYPE_LABELS[activity.type] ?? CARE_TYPE_LABELS.OTHER;
    Alert.alert(
      'Видалити запис догляду?',
      `Ви впевнені, що хочете видалити дію «${meta.label}» від ${formatDateUkrainian(activity.performedAt)}?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => {
            void deleteMutation.mutateAsync(activity.id);
          },
        },
      ],
    );
  };

  const activities = careList?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Quick Care Actions Header */}
      <View style={[styles.quickCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <Text style={[styles.quickCardTitle, { color: theme.tx }]}>Швидкий догляд</Text>
        <View style={styles.quickButtonsRow}>
          <Pressable
            disabled={createMutation.isPending}
            onPress={() => void handleQuickAction('WATERING', 'Полив')}
            style={[styles.quickBtn, { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]}
          >
            <Droplets size={18} color="#0284C7" />
            <Text style={[styles.quickBtnText, { color: '#0284C7' }]}>Полити</Text>
          </Pressable>

          <Pressable
            disabled={createMutation.isPending}
            onPress={() => void handleQuickAction('FERTILIZING', 'Підживлення')}
            style={[styles.quickBtn, { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}
          >
            <Sparkles size={18} color="#16A34A" />
            <Text style={[styles.quickBtnText, { color: '#16A34A' }]}>Підживити</Text>
          </Pressable>

          <Pressable
            disabled={createMutation.isPending}
            onPress={() => void handleQuickAction('PRUNING', 'Обрізка')}
            style={[styles.quickBtn, { backgroundColor: '#FEF3C7', borderColor: '#D97706' }]}
          >
            <Scissors size={18} color="#D97706" />
            <Text style={[styles.quickBtnText, { color: '#D97706' }]}>Обрізати</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            style={[styles.quickBtn, { backgroundColor: theme.ac, borderColor: theme.ac }]}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={[styles.quickBtnText, { color: '#ffffff' }]}>Інше</Text>
          </Pressable>
        </View>
      </View>

      {/* History List */}
      <View style={styles.listHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.tx }]}>Історія догляду</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.mu }]}>
          {activities.length} {activities.length === 1 ? 'запис' : 'записів'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} colors={[theme.ac]} />
        }
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.ac} />
            <Text style={[styles.mutedText, { color: theme.mu, marginTop: 12 }]}>Завантаження догляду...</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <Droplets size={40} color={theme.mu} />
            <Text style={[styles.emptyTitle, { color: theme.tx }]}>Догляд ще не зафіксовано</Text>
            <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
              Використовуйте швидкі кнопки «Полити» чи «Підживити» для збереження історії.
            </Text>
          </View>
        ) : (
          activities.map((item) => {
            const meta = CARE_TYPE_LABELS[item.type] ?? CARE_TYPE_LABELS.OTHER;
            return (
              <View
                key={item.id}
                style={[styles.activityCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}
              >
                <View style={styles.activityTopRow}>
                  <View style={styles.activityLeft}>
                    <View style={[styles.activityBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.activityBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={[styles.activityDate, { color: theme.mu }]}>
                      {formatDateUkrainian(item.performedAt, true)}
                    </Text>
                  </View>

                  <Pressable
                    hitSlop={8}
                    onPress={() => confirmDelete(item)}
                    style={[styles.deleteBtn, { borderColor: theme.bd }]}
                  >
                    <Trash2 size={16} color={theme.danger} />
                  </Pressable>
                </View>

                {item.productName ? (
                  <Text style={[styles.productText, { color: theme.tx }]}>
                    Препарат / добриво: <Text style={{ fontWeight: '700' }}>{item.productName}</Text>
                  </Text>
                ) : null}

                {item.notes ? (
                  <Text style={[styles.activityNotes, { color: theme.tx }]}>{item.notes}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Custom Care Activity Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Додати дію з догляду</Text>
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
              {/* Type Chips */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Тип процедури</Text>
                <View style={styles.chipsWrap}>
                  {(Object.keys(CARE_TYPE_LABELS) as CareActivityType[]).map((cKey) => {
                    const isSelected = type === cKey;
                    const meta = CARE_TYPE_LABELS[cKey];
                    return (
                      <Pressable
                        key={cKey}
                        onPress={() => setType(cKey)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: isSelected ? meta.bg : theme.bg,
                            borderColor: isSelected ? meta.color : theme.bd,
                          },
                        ]}
                      >
                        <Text style={[styles.typeChipText, { color: isSelected ? meta.color : theme.tx }]}>
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Дата виконання</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.dateRowBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                >
                  <Calendar size={18} color={theme.mu} />
                  <Text style={[styles.dateRowBtnText, { color: theme.tx }]}>
                    {formatDateUkrainian(performedAt, true)}
                  </Text>
                </Pressable>
              </View>

              {/* Product Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Препарат / добриво (опціонально)</Text>
                <TextInput
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Наприклад: Біогумус, Фітоспорин"
                  placeholderTextColor={theme.mu}
                  style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx }]}
                />
              </View>

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Примітки / обʼєм</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Наприклад: 2 літри під корінь"
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
              style={[styles.submitBtn, { backgroundColor: theme.ac }]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Зберегти дію</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={performedAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

export const CareTab = memo(CareTabInner);

const styles = StyleSheet.create({
  container: { flex: 1 },
  quickCard: {
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  quickCardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  quickButtonsRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  quickBtnText: { fontSize: 11, fontWeight: '700' },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, fontWeight: '500' },
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
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  activityTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activityBadgeText: { fontSize: 11, fontWeight: '700' },
  activityDate: { fontSize: 11, fontWeight: '500' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productText: { fontSize: 13 },
  activityNotes: { fontSize: 13, lineHeight: 18 },
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
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontWeight: '700' },
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
