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
import { AlertCircle, AlertTriangle, Calendar, Check, CheckCircle2, Plus, Trash2, X } from 'lucide-react-native';
import { createProblemSchema } from '@smart-garden/validation';
import type { PlantDto, ProblemDto, ProblemSeverity, ProblemStatus } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { api, newIdempotencyKey, ApiClientError } from '@/src/lib/api';
import { formatDateUkrainian } from '../../lib/plant-helpers';

interface ProblemsTabProps {
  plant: PlantDto;
  theme: ThemeTokens;
}

const SEVERITY_CONFIG: Record<ProblemSeverity, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Низька', color: '#2563EB', bg: '#DBEAFE' },
  MEDIUM: { label: 'Середня', color: '#D97706', bg: '#FEF3C7' },
  HIGH: { label: 'Висока', color: '#EA580C', bg: '#FFEDD5' },
  CRITICAL: { label: 'Критична', color: '#DC2626', bg: '#FEE2E2' },
};

const STATUS_CONFIG: Record<ProblemStatus, { label: string; color: string }> = {
  DETECTED: { label: 'Виявлено', color: '#DC2626' },
  MONITORING: { label: 'Спостереження', color: '#D97706' },
  TREATING: { label: 'Лікування', color: '#2563EB' },
  RESOLVED: { label: 'Вирішено', color: '#16A34A' },
};

function ProblemsTabInner({ plant, theme }: ProblemsTabProps) {
  const plantId = plant.id;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<ProblemSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [detectedAt, setDetectedAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Query
  const {
    data: problemsList,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['problems', plantId],
    queryFn: () => api.listProblems(plantId),
    staleTime: 30_000,
  });

  // Create Problem Mutation
  const createMutation = useMutation({
    mutationFn: (payload: { title: string; severity: ProblemSeverity; description?: string | null; detectedAt: string }) =>
      api.createProblem(plantId, payload, newIdempotencyKey('problem')),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['problems', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      setServerError(err instanceof ApiClientError ? err.message : 'Не вдалося створити проблему');
    },
  });

  // Resolve Problem Mutation
  const resolveMutation = useMutation({
    mutationFn: (problemId: string) =>
      api.updateProblem(problemId, { status: 'RESOLVED', solution: 'Вирішено' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['problems', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      Alert.alert('Помилка', err instanceof ApiClientError ? err.message : 'Не вдалося оновити статус');
    },
  });

  // Delete Problem Mutation
  const deleteMutation = useMutation({
    mutationFn: (problemId: string) => api.deleteProblem(problemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['problems', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      Alert.alert('Помилка', err instanceof ApiClientError ? err.message : 'Не вдалося видалити проблему');
    },
  });

  // Fast Update Plant Status to HAS_PROBLEM
  const setPlantHasProblemMutation = useMutation({
    mutationFn: () =>
      api.updatePlant(plantId, { status: 'HAS_PROBLEM', version: plant.version }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      if (plant.zoneId) {
        await queryClient.invalidateQueries({ queryKey: ['bed-layout', plant.zoneId] });
      }
      Alert.alert('Статус оновлено', 'Статус рослини змінено на «Є проблема».');
    },
  });

  const resetForm = () => {
    setTitle('');
    setSeverity('MEDIUM');
    setDescription('');
    setDetectedAt(new Date());
    setFormErrors({});
    setServerError(null);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDetectedAt(selectedDate);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    setServerError(null);

    const payload = {
      title: title.trim(),
      severity,
      description: description.trim() ? description.trim() : null,
      detectedAt: detectedAt.toISOString(),
    };

    const validation = createProblemSchema.safeParse(payload);
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

  const confirmDelete = (problem: ProblemDto) => {
    Alert.alert(
      'Видалити запис про проблему?',
      `Ви впевнені, що хочете видалити «${problem.title}»?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => {
            void deleteMutation.mutateAsync(problem.id);
          },
        },
      ],
    );
  };

  const problems = problemsList?.data ?? [];
  const activeProblemsCount = problems.filter((p) => p.status !== 'RESOLVED').length;
  const showStatusSuggestion = activeProblemsCount > 0 && plant.status !== 'HAS_PROBLEM';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Active Problems Suggestion Banner */}
      {showStatusSuggestion ? (
        <View style={[styles.suggestionBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <AlertTriangle size={20} color="#D97706" style={{ marginTop: 2 }} />
          <View style={styles.suggestionContent}>
            <Text style={[styles.suggestionTitle, { color: '#92400E' }]}>
              Виявлено активні проблеми ({activeProblemsCount})
            </Text>
            <Text style={[styles.suggestionDesc, { color: '#B45309' }]}>
              Рекомендовано змінити загальний статус рослини на «Є проблема», щоб це відображалось на схемі та в списку.
            </Text>
            <Pressable
              disabled={setPlantHasProblemMutation.isPending}
              onPress={() => void setPlantHasProblemMutation.mutateAsync()}
              style={[styles.suggestActionBtn, { backgroundColor: '#D97706' }]}
            >
              {setPlantHasProblemMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.suggestActionText}>Встановити статус «Є проблема»</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Top action bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarTextWrap}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionTitle, { color: theme.tx }]}>
            Проблеми та шкідники
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionSubtitle, { color: theme.mu }]}>
            {activeProblemsCount > 0 ? `${activeProblemsCount} активних` : 'Всі вирішено'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Зафіксувати проблему"
          onPress={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.danger }]}
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
            <ActivityIndicator size="large" color={theme.danger} />
            <Text style={[styles.mutedText, { color: theme.mu, marginTop: 12 }]}>Завантаження проблем...</Text>
          </View>
        ) : problems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <CheckCircle2 size={40} color={theme.ac} />
            <Text style={[styles.emptyTitle, { color: theme.tx }]}>Проблем не виявлено</Text>
            <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
              Рослина розвивається здорово. Якщо помітите хвороби або шкідників — додайте запис сюди.
            </Text>
            <Pressable
              onPress={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              style={[styles.emptyActionBtn, { backgroundColor: theme.danger }]}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Зафіксувати проблему</Text>
            </Pressable>
          </View>
        ) : (
          problems.map((item) => {
            const sev = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.MEDIUM;
            const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DETECTED;
            const isResolved = item.status === 'RESOLVED';

            return (
              <View
                key={item.id}
                style={[
                  styles.problemCard,
                  {
                    backgroundColor: theme.pn,
                    borderColor: isResolved ? theme.bd : sev.color,
                    borderWidth: isResolved ? 1 : 1.5,
                  },
                ]}
              >
                <View style={styles.problemTopRow}>
                  <View style={styles.problemTitleWrap}>
                    <Text style={[styles.problemTitle, { color: theme.tx }]}>{item.title}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
                        <Text style={[styles.sevBadgeText, { color: sev.color }]}>{sev.label}</Text>
                      </View>
                      <Text style={[styles.statusText, { color: st.color }]}>• {st.label}</Text>
                      <Text style={[styles.dateText, { color: theme.mu }]}>
                        • {formatDateUkrainian(item.detectedAt)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    hitSlop={8}
                    onPress={() => confirmDelete(item)}
                    style={[styles.deleteBtn, { borderColor: theme.bd }]}
                  >
                    <Trash2 size={16} color={theme.danger} />
                  </Pressable>
                </View>

                {item.description ? (
                  <Text style={[styles.problemDesc, { color: theme.tx }]}>{item.description}</Text>
                ) : null}

                {/* Resolve action */}
                {!isResolved ? (
                  <Pressable
                    onPress={() => void resolveMutation.mutateAsync(item.id)}
                    disabled={resolveMutation.isPending}
                    style={[styles.resolveBtn, { backgroundColor: theme.ac3, borderColor: theme.ac }]}
                  >
                    <Check size={16} color={theme.ac} />
                    <Text style={[styles.resolveBtnText, { color: theme.ac }]}>Позначити як вирішено</Text>
                  </Pressable>
                ) : (
                  <View style={styles.resolvedInfoRow}>
                    <CheckCircle2 size={14} color="#16A34A" />
                    <Text style={styles.resolvedInfoText}>Проблему усунено</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Problem Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Зафіксувати проблему</Text>
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
                  Назва / симптом <Text style={{ color: theme.danger }}>*</Text>
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Наприклад: Пожовтіння листя, попелиця"
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

              {/* Severity Chips */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Серйозність проблеми</Text>
                <View style={styles.chipsWrap}>
                  {(Object.keys(SEVERITY_CONFIG) as ProblemSeverity[]).map((sKey) => {
                    const isSelected = severity === sKey;
                    const meta = SEVERITY_CONFIG[sKey];
                    return (
                      <Pressable
                        key={sKey}
                        onPress={() => setSeverity(sKey)}
                        style={[
                          styles.sevChip,
                          {
                            backgroundColor: isSelected ? meta.bg : theme.bg,
                            borderColor: isSelected ? meta.color : theme.bd,
                          },
                        ]}
                      >
                        <Text style={[styles.sevChipText, { color: isSelected ? meta.color : theme.tx }]}>
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Дата виявлення</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.dateRowBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                >
                  <Calendar size={18} color={theme.mu} />
                  <Text style={[styles.dateRowBtnText, { color: theme.tx }]}>
                    {formatDateUkrainian(detectedAt)}
                  </Text>
                </Pressable>
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.tx }]}>Опис симптомів та можливі причини</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Деталі ураження, локалізація..."
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
              style={[styles.submitBtn, { backgroundColor: theme.danger }]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <AlertCircle size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Зберегти проблему</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={detectedAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

export const ProblemsTab = memo(ProblemsTabInner);

const styles = StyleSheet.create({
  container: { flex: 1 },
  suggestionBanner: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '800' },
  suggestionDesc: { fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 10 },
  suggestActionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  suggestActionText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
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
  problemCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  problemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  problemTitleWrap: { flex: 1 },
  problemTitle: { fontSize: 16, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  sevBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  sevBadgeText: { fontSize: 11, fontWeight: '700' },
  statusText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 11, fontWeight: '500' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemDesc: { fontSize: 13, lineHeight: 18 },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  resolveBtnText: { fontSize: 13, fontWeight: '700' },
  resolvedInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolvedInfoText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
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
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sevChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sevChipText: { fontSize: 12, fontWeight: '700' },
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
