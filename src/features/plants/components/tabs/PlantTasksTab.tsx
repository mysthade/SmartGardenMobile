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
import {
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import type { TaskDto } from '@smart-garden/types';
import { QueryErrorCard } from '@/src/components/QueryErrorCard';
import { api, newIdempotencyKey } from '@/src/lib/api';
import { formatApiError } from '@/src/lib/api-errors';
import type { ThemeTokens } from '@/src/theme/tokens';
import { formatDateUkrainian } from '../../lib/plant-helpers';

interface PlantTasksTabProps {
  plantId: string;
  theme: ThemeTokens;
}

function PlantTasksTabInner({ plantId, theme }: PlantTasksTabProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: tasksList,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['tasks', 'plant', plantId],
    queryFn: () => api.listTasks({ plantId, limit: 50 }),
    staleTime: 30_000,
  });

  const invalidateTasks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks', 'plant', plantId] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description?: string | null; dueAt?: string | null }) =>
      api.createTask(
        {
          plantId,
          title: payload.title,
          description: payload.description ?? null,
          dueAt: payload.dueAt ?? null,
        },
        newIdempotencyKey('plant-task'),
      ),
    onSuccess: async () => {
      await invalidateTasks();
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(formatApiError(err, 'Не вдалося створити завдання'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (task: TaskDto) => {
      const isDone = Boolean(task.completedAt) || task.status === 'DONE';
      return api.updateTask(task.id, { status: isDone ? 'TODO' : 'DONE' });
    },
    onSuccess: async () => {
      await invalidateTasks();
    },
    onError: (err) => {
      Alert.alert('Помилка', formatApiError(err, 'Не вдалося оновити завдання'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: async () => {
      await invalidateTasks();
    },
    onError: (err) => {
      Alert.alert('Помилка', formatApiError(err, 'Не вдалося видалити завдання'));
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueAt(null);
    setFormError(null);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDueAt(selectedDate);
  };

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setFormError('Введіть назву завдання');
      return;
    }
    setFormError(null);
    await createMutation.mutateAsync({
      title: trimmed,
      description: description.trim() ? description.trim() : null,
      dueAt: dueAt ? dueAt.toISOString() : null,
    });
  };

  const confirmDelete = (task: TaskDto) => {
    Alert.alert('Видалити завдання?', `Видалити «${task.title}»?`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => void deleteMutation.mutateAsync(task.id),
      },
    ]);
  };

  const tasks = tasksList?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarTextWrap}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionTitle, { color: theme.tx }]}>
            Завдання для рослини
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionSubtitle, { color: theme.mu }]}>
            {tasks.length === 1 ? '1 завдання' : `${tasks.length} завдань`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Нове завдання"
          onPress={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.ac }]}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Додати</Text>
        </Pressable>
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
            <Text style={[styles.mutedText, { color: theme.mu, marginTop: 12 }]}>
              Завантаження завдань...
            </Text>
          </View>
        ) : isError ? (
          <QueryErrorCard
            error={error}
            fallbackMessage="Не вдалося завантажити завдання"
            onRetry={() => void refetch()}
          />
        ) : tasks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <ClipboardList size={40} color={theme.mu} />
            <Text style={[styles.emptyTitle, { color: theme.tx }]}>Завдань ще немає</Text>
            <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
              Заплануйте полив, підживлення або обрізку для цієї рослини.
            </Text>
            <Pressable
              onPress={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              style={[styles.emptyActionBtn, { backgroundColor: theme.ac }]}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Створити завдання</Text>
            </Pressable>
          </View>
        ) : (
          tasks.map((task) => {
            const isDone = Boolean(task.completedAt) || task.status === 'DONE';
            return (
              <Pressable
                key={task.id}
                onPress={() => void toggleMutation.mutateAsync(task)}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: theme.pn,
                    borderColor: theme.bd,
                    opacity: isDone ? 0.68 : 1,
                  },
                ]}
              >
                <View style={styles.taskLeft}>
                  <View style={styles.checkboxWrap}>
                    {isDone ? (
                      <CheckCircle2 size={22} color={theme.ac} />
                    ) : (
                      <Circle size={22} color={theme.mu} />
                    )}
                  </View>
                  <View style={styles.taskBody}>
                    <Text
                      style={[
                        styles.taskTitle,
                        {
                          color: theme.tx,
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text style={[styles.taskDesc, { color: theme.mu }]} numberOfLines={2}>
                        {task.description}
                      </Text>
                    ) : null}
                    {task.dueAt ? (
                      <View style={styles.dateRow}>
                        <Calendar size={12} color={theme.mu} />
                        <Text style={[styles.dateText, { color: theme.mu }]}>
                          {formatDateUkrainian(task.dueAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Pressable
                  hitSlop={8}
                  onPress={() => confirmDelete(task)}
                  style={[styles.deleteBtn, { borderColor: theme.bd }]}
                >
                  <Trash2 size={16} color={theme.danger} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Нове завдання</Text>
              <Pressable hitSlop={10} onPress={() => setIsModalOpen(false)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            {formError ? (
              <View style={[styles.modalError, { backgroundColor: '#FDE8E8', borderColor: theme.danger }]}>
                <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>
                Назва <Text style={{ color: theme.danger }}>*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Наприклад: Полити теплою водою"
                placeholderTextColor={theme.mu}
                style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>Термін виконання (опціонально)</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.input, styles.dateRowBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
              >
                <Calendar size={18} color={theme.mu} />
                <Text style={[styles.dateRowBtnText, { color: dueAt ? theme.tx : theme.mu }]}>
                  {dueAt ? formatDateUkrainian(dueAt) : 'Оберіть дату'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>Деталі</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Додаткові примітки..."
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

            <Pressable
              disabled={createMutation.isPending}
              onPress={() => void handleSubmit()}
              style={[styles.submitBtn, { backgroundColor: theme.ac }]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Створити завдання</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={dueAt ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

export const PlantTasksTab = memo(PlantTasksTabInner);

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
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  taskLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  checkboxWrap: { paddingTop: 2 },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '700' },
  taskDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  dateText: { fontSize: 12 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  textarea: { minHeight: 74, paddingTop: 10 },
  dateRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateRowBtnText: { fontSize: 14, fontWeight: '600' },
  submitBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});

