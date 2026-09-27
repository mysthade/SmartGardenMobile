import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Droplets,
  Calendar,
  Sparkles,
  Scissors,
  Wheat,
} from 'lucide-react-native';

type FilterType = 'all' | 'pending' | 'completed';

export default function TasksScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('pending');

  const tasksQuery = useQuery({
    queryKey: ['tasks', 'list'],
    queryFn: () => api.listTasks({ limit: 50 }),
    staleTime: 30_000,
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.updateTask(taskId, { completedAt: new Date().toISOString() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const allTasks = tasksQuery.data?.data ?? [];
  const filteredTasks = allTasks.filter((task) => {
    if (filter === 'pending') return !task.completedAt;
    if (filter === 'completed') return Boolean(task.completedAt);
    return true;
  });

  const getTaskIcon = (type?: string) => {
    const t = type?.toLowerCase() ?? '';
    if (t.includes('полив') || t.includes('water')) {
      return <Droplets size={18} color="#2980B9" />;
    }
    if (t.includes('обріз') || t.includes('prun')) {
      return <Scissors size={18} color="#8E44AD" />;
    }
    if (t.includes('збір') || t.includes('harvest')) {
      return <Wheat size={18} color="#D35400" />;
    }
    return <ClipboardList size={18} color={theme.ac} />;
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.tx }]}>Завдання та догляд</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Щоденні агротехнічні операції у вашому саду
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <FilterChip
          label="До виконання"
          count={allTasks.filter((t) => !t.completedAt).length}
          active={filter === 'pending'}
          onPress={() => setFilter('pending')}
          theme={theme}
        />
        <FilterChip
          label="Всі"
          count={allTasks.length}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
          theme={theme}
        />
        <FilterChip
          label="Виконані"
          count={allTasks.filter((t) => t.completedAt).length}
          active={filter === 'completed'}
          onPress={() => setFilter('completed')}
          theme={theme}
        />
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={tasksQuery.isRefetching}
            onRefresh={() => void tasksQuery.refetch()}
            tintColor={theme.ac}
          />
        }
        ListEmptyComponent={
          tasksQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.ac} size="large" />
              <Text style={[styles.muted, { color: theme.mu, marginTop: 12 }]}>
                Завантаження завдань…
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <Sparkles size={36} color={theme.ac} />
              <Text style={[styles.emptyTitle, { color: theme.tx }]}>
                {filter === 'pending'
                  ? 'Всі поточні завдання виконано! 🎉'
                  : 'Список завдань порожній'}
              </Text>
              <Text style={[styles.muted, { color: theme.mu }]}>
                Заплануйте полив, обрізку або підживлення рослин.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isDone = Boolean(item.completedAt);
          return (
            <Pressable
              style={[
                styles.taskCard,
                {
                  backgroundColor: theme.pn,
                  borderColor: theme.bd,
                  opacity: isDone ? 0.65 : 1,
                },
              ]}
              onPress={() => {
                if (!isDone) {
                  completeMutation.mutate(item.id);
                }
              }}
            >
              <View style={styles.taskLeft}>
                <View style={styles.checkboxWrap}>
                  {isDone ? (
                    <CheckCircle2 size={24} color={theme.ac} />
                  ) : (
                    <Circle size={24} color={theme.mu} />
                  )}
                </View>
                <View style={styles.taskTextWrap}>
                  <Text
                    style={[
                      styles.taskTitle,
                      {
                        color: theme.tx,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={[styles.taskDesc, { color: theme.mu }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.dueAt ? (
                    <View style={styles.dateRow}>
                      <Calendar size={12} color={theme.mu} />
                      <Text style={[styles.dateText, { color: theme.mu }]}>
                        {new Date(item.dueAt).toLocaleDateString('uk-UA')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.iconTag}>{getTaskIcon(item.title)}</View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
  theme,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? theme.ac : theme.pn,
          borderColor: active ? theme.ac : theme.bd,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, { color: active ? '#ffffff' : theme.tx }]}>
        {label} ({count})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 18, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 18, paddingBottom: 40 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  taskLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  checkboxWrap: { paddingTop: 2 },
  taskTextWrap: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '700' },
  taskDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  dateText: { fontSize: 12 },
  iconTag: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f4f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  muted: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
});
