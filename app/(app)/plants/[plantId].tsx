import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@smart-garden/api-client';
import type { PlantDto } from '@smart-garden/types';
import { useTheme } from '@/src/theme/theme-context';
import { api } from '@/src/lib/api';
import { PlantHeader } from '@/src/features/plants/components/PlantHeader';
import { PlantTabsBar } from '@/src/features/plants/components/PlantTabsBar';
import { OverviewTab } from '@/src/features/plants/components/tabs/OverviewTab';
import { JournalTab } from '@/src/features/plants/components/tabs/JournalTab';
import { HarvestsTab } from '@/src/features/plants/components/tabs/HarvestsTab';
import { ProblemsTab } from '@/src/features/plants/components/tabs/ProblemsTab';
import type { PlantTabKey } from '@/src/features/plants/lib/plant-helpers';

export default function PlantDetailScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PlantTabKey>('overview');
  const [_visitedTabs, setVisitedTabs] = useState<Set<PlantTabKey>>(new Set(['overview']));
  const [isOverviewDirty, setIsOverviewDirty] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch Plant
  const {
    data: plant,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['plants', plantId],
    queryFn: () => api.getPlant(plantId),
    staleTime: 30_000,
  });

  // Refetch on screen focus to keep synced with web changes
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  // Mark tabs visited for lazy query mounting
  const handleSelectTab = useCallback((tab: PlantTabKey) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  // Save Plant Overview Mutation
  const saveMutation = useMutation({
    mutationFn: (values: Partial<PlantDto> & { version: number }) =>
      api.updatePlant(plantId, values),
    onSuccess: async (updated) => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      if (updated.zoneId) {
        await queryClient.invalidateQueries({ queryKey: ['bed-layout', updated.zoneId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      Alert.alert('Збережено', 'Дані рослини успішно оновлено.');
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Не вдалося зберегти дані рослини.');
      }
    },
  });

  // Delete Plant Mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.deletePlant(plantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      if (plant?.zoneId) {
        await queryClient.invalidateQueries({ queryKey: ['bed-layout', plant.zoneId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      router.back();
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.message : 'Не вдалося видалити рослину';
      Alert.alert('Помилка', msg);
    },
  });

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Видалити рослину?',
      `Ви впевнені, що хочете видалити «${plant?.name ?? 'рослину'}»? Цю дію не можна скасувати.`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => {
            void deleteMutation.mutateAsync();
          },
        },
      ],
    );
  }, [plant?.name, deleteMutation]);

  // Handle Safe Navigation Back with Dirty Check
  const handleBack = useCallback(() => {
    if (isOverviewDirty) {
      Alert.alert(
        'Незбережені зміни',
        'У вас є незбережені зміни в картці рослини. Ви дійсно бажаєте вийти?',
        [
          { text: 'Залишитися', style: 'cancel' },
          {
            text: 'Вийти без збереження',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  }, [isOverviewDirty, router]);

  // Hardware Back Handler on Android
  useEffect(() => {
    const onHardwareBack = () => {
      if (isOverviewDirty) {
        handleBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [isOverviewDirty, handleBack]);

  if (isLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.ac} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.loadingText, { color: theme.mu }]}>
          Завантаження картки рослини...
        </Text>
      </View>
    );
  }

  if (isError || !plant) {
    return (
      <View style={[styles.errorCenter, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.errorTitle, { color: theme.danger }]}>
          Помилка завантаження
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.errorDesc, { color: theme.mu }]}>
          {error instanceof Error ? error.message : 'Не вдалося завантажити картку рослини'}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={[styles.retryBtn, { backgroundColor: theme.ac }]}
        >
          <Text style={styles.retryBtnText}>Спробувати знову</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={[styles.cancelLinkText, { color: theme.mu }]}>Повернутися назад</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      {/* 1. Header (Fixed, not inside scroll to prevent horizontal tabs conflict) */}
      <PlantHeader
        plant={plant}
        theme={theme}
        onBack={handleBack}
        onDelete={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* 2. Horizontally scrollable Segmented Tab Control */}
      <PlantTabsBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        counts={{
          problems: plant.openProblemsCount ?? 0,
        }}
        theme={theme}
      />

      {/* 3. Tab Content Area with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {activeTab === 'overview' ? (
          <OverviewTab
            plant={plant}
            theme={theme}
            onSave={async (values) => {
              await saveMutation.mutateAsync(values);
            }}
            isSaving={saveMutation.isPending}
            serverError={serverError}
            onDirtyChange={setIsOverviewDirty}
          />
        ) : null}

        {activeTab === 'notes' ? (
          <JournalTab plantId={plantId} theme={theme} />
        ) : null}

        {activeTab === 'harvests' ? (
          <HarvestsTab plantId={plantId} theme={theme} />
        ) : null}

        {activeTab === 'problems' ? (
          <ProblemsTab plant={plant} theme={theme} />
        ) : null}

        {/* Placeholder tabs for next stages */}
        {activeTab !== 'overview' && activeTab !== 'notes' && activeTab !== 'harvests' && activeTab !== 'problems' ? (
          <ScrollView
            contentContainerStyle={styles.placeholderContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                colors={[theme.ac]}
              />
            }
          >
            <Text style={[styles.placeholderText, { color: theme.mu }]}>
              Вкладка «{activeTab}» завантажується...
            </Text>
          </ScrollView>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelLink: {
    padding: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
