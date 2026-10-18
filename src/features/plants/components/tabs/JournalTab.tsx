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
import { BookOpen, Calendar, Check, Plus, Trash2, X } from 'lucide-react-native';
import { createJournalEntrySchema } from '@smart-garden/validation';
import type { JournalEntryDto, JournalEntryType } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { api, newIdempotencyKey, ApiClientError } from '@/src/lib/api';
import { formatDateUkrainian } from '../../lib/plant-helpers';

interface JournalTabProps {
  plantId: string;
  theme: ThemeTokens;
}

const JOURNAL_TYPE_LABELS: Record<JournalEntryType, string> = {
  OBSERVATION: 'Спостереження',
  GROWTH: 'Ріст',
  FLOWERING: 'Цвітіння',
  FRUITING: 'Плодоношення',
  NOTE: 'Нотатка',
  OTHER: 'Інше',
};

function JournalTabInner({ plantId, theme }: JournalTabProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<JournalEntryType>('OBSERVATION');
  const [description, setDescription] = useState('');
  const [observedAt, setObservedAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Query
  const {
    data: journalList,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['journal', plantId],
    queryFn: () => api.listJournal(plantId),
    staleTime: 30_000,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: { title: string; type: JournalEntryType; description?: string | null; observedAt: string }) =>
      api.createJournal(plantId, payload, newIdempotencyKey('journal')),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['journal', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      setServerError(err instanceof ApiClientError ? err.message : 'Не вдалося створити запис');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteJournal(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['journal', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      Alert.alert('Помилка', err instanceof ApiClientError ? err.message : 'Не вдалося видалити запис');
    },
  });

  const resetForm = () => {
    setTitle('');
    setType('OBSERVATION');
    setDescription('');
    setObservedAt(new Date());
    setFormErrors({});
    setServerError(null);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setObservedAt(selectedDate);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    setServerError(null);

    const payload = {
      title: title.trim(),
      type,
      description: description.trim() ? description.trim() : null,
      observedAt: observedAt.toISOString(),
    };

    const validation = createJournalEntrySchema.safeParse(payload);
    if (!validation.success) {
      const errs: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? 'title');
        errs[field] = issue.message;
      }
      setFormErrors(errs);
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const confirmDelete = (entry: JournalEntryDto) => {
    Alert.alert(
      'Видалити запис?',
      `Ви впевнені, що хочете видалити «${entry.title}»?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => {
            void deleteMutation.mutateAsync(entry.id);
          },
        },
      ],
    );
  };

  const entries = journalList?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top action bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarTextWrap}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionTitle, { color: theme.tx }]}>
            Щоденник спостережень
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionSubtitle, { color: theme.mu }]}>
            {entries.length === 1 ? '1 запис' : `${entries.length} записів`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Новий запис"
          onPress={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.ac }]}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Новий запис</Text>
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
            <ActivityIndicator size="large" color={theme.ac} />
            <Text style={[styles.mutedText, { color: theme.mu, marginTop: 12 }]}>Завантаження нотаток...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <BookOpen size={40} color={theme.mu} />
            <Text style={[styles.emptyTitle, { color: theme.tx }]}>Щоденник порожній</Text>
            <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
              Зафіксуйте перші паростки, початок цвітіння чи важливі спостереження.
            </Text>
            <Pressable
              onPress={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              style={[styles.emptyActionBtn, { backgroundColor: theme.ac }]}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Додати перший запис</Text>
            </Pressable>
          </View>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleWrap}>
                  <Text style={[styles.entryTitle, { color: theme.tx }]}>{entry.title}</Text>
                  <View style={styles.entryMetaRow}>
                    <View style={[styles.typeBadge, { backgroundColor: theme.ac3 }]}>
                      <Text style={[styles.typeBadgeText, { color: theme.ac }]}>
                        {JOURNAL_TYPE_LABELS[entry.type] ?? entry.type}
                      </Text>
                    </View>
                    <Text style={[styles.entryDate, { color: theme.mu }]}>
                      {formatDateUkrainian(entry.observedAt, true)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => confirmDelete(entry)}
                  style={[styles.deleteEntryBtn, { borderColor: theme.bd }]}
                  accessibilityLabel={`Видалити запис ${entry.title}`}
                >
                  <Trash2 size={16} color={theme.danger} />
                </Pressable>
              </View>

              {entry.description ? (
                <Text style={[styles.entryDesc, { color: theme.tx }]}>{entry.description}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Новий запис у щоденник</Text>
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
              {/* Title */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>
                  Заголовок <Text style={{ color: theme.danger }}>*</Text>
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Наприклад: Зʼявилися перші справжні листочки"
                  placeholderTextColor={theme.mu}
                  style={[
                    styles.input,
                    { backgroundColor: theme.bg, borderColor: formErrors.title ? theme.danger : theme.bd, color: theme.tx },
                  ]}
                />
                {formErrors.title ? (
                  <Text style={[styles.fieldError, { color: theme.danger }]}>{formErrors.title}</Text>
                ) : null}
              </View>

              {/* Type Chips */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Тип спостереження</Text>
                <View style={styles.chipsWrap}>
                  {(Object.keys(JOURNAL_TYPE_LABELS) as JournalEntryType[]).map((tKey) => {
                    const isSelected = type === tKey;
                    return (
                      <Pressable
                        key={tKey}
                        onPress={() => setType(tKey)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: isSelected ? theme.ac : theme.bg,
                            borderColor: isSelected ? theme.ac : theme.bd,
                          },
                        ]}
                      >
                        <Text style={[styles.typeChipText, { color: isSelected ? '#ffffff' : theme.tx }]}>
                          {JOURNAL_TYPE_LABELS[tKey]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Дата та час</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.dateRowBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                >
                  <Calendar size={18} color={theme.mu} />
                  <Text style={[styles.dateRowBtnText, { color: theme.tx }]}>
                    {formatDateUkrainian(observedAt, true)}
                  </Text>
                </Pressable>
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Опис / подробиці</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Додаткові деталі спостереження..."
                  placeholderTextColor={theme.mu}
                  multiline
                  numberOfLines={4}
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
                  <Text style={styles.submitBtnText}>Зберегти запис</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={observedAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

export const JournalTab = memo(JournalTabInner);

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarTextWrap: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 32 },
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
  entryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryTitleWrap: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: '700' },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  entryDate: { fontSize: 11, fontWeight: '500' },
  deleteEntryBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDesc: { fontSize: 13, lineHeight: 18 },
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
  textarea: { minHeight: 80, paddingTop: 10 },
  fieldError: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontWeight: '600' },
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
