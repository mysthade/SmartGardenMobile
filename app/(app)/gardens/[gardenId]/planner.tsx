import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Compass, Plus, RefreshCw } from 'lucide-react-native';
import type { GardenPlanDetailsDto, GardenPlanDto } from '@smart-garden/types';

import { useTheme } from '@/src/theme/theme-context';
import { useGardenPlannerStore } from '@/src/features/planner/store/use-planner-store';
import {
  useGardenPlans,
  useActiveGardenPlan,
  useGardenPlan,
  useCreateGardenPlan,
} from '@/src/features/planner/hooks/use-planner-data';
import { usePlannerAutosave } from '@/src/features/planner/hooks/use-planner-autosave';

import { PlannerCanvas } from '@/src/features/planner/components/canvas/PlannerCanvas';
import { PlannerTopBar } from '@/src/features/planner/components/toolbar/PlannerTopBar';
import { PlannerBottomBar } from '@/src/features/planner/components/toolbar/PlannerBottomBar';
import { NorthArrow } from '@/src/features/planner/components/overlays/NorthArrow';
import { ScaleBar } from '@/src/features/planner/components/overlays/ScaleBar';
import { LegendOverlay } from '@/src/features/planner/components/overlays/LegendOverlay';

import { ObjectLibrarySheet } from '@/src/features/planner/components/sheets/ObjectLibrarySheet';
import { ObjectPropertiesSheet } from '@/src/features/planner/components/sheets/ObjectPropertiesSheet';
import { LayersSheet } from '@/src/features/planner/components/sheets/LayersSheet';
import { PlanSelectorModal } from '@/src/features/planner/components/sheets/PlanSelectorModal';
import { ConflictModal } from '@/src/features/planner/components/sheets/ConflictModal';

export default function GardenPlannerScreen() {
  const params = useLocalSearchParams<{
    gardenId?: string | string[];
    planId?: string | string[];
  }>();

  const gardenId = Array.isArray(params.gardenId)
    ? params.gardenId[0] || ''
    : params.gardenId || '';
  const routePlanId = Array.isArray(params.planId)
    ? params.planId[0]
    : params.planId;

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Selected plan state
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(routePlanId || null);

  // Sheets and modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isPlanSelectorOpen, setIsPlanSelectorOpen] = useState(false);
  const [conflictPendingData, setConflictPendingData] = useState<GardenPlanDetailsDto | null>(null);

  // Store bindings
  const storePlanName = useGardenPlannerStore((s) => s.plan.name);
  const storeVersion = useGardenPlannerStore((s) => s.plan.version);
  const dirtyIds = useGardenPlannerStore((s) => s.dirtyIds);
  const saveStatus = useGardenPlannerStore((s) => s.saveStatus);
  const isDirty = dirtyIds.length > 0 || saveStatus === 'dirty';
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const hydrate = useGardenPlannerStore((s) => s.hydrate);
  const clearSelection = useGardenPlannerStore((s) => s.clearSelection);
  const zoomToFit = useGardenPlannerStore((s) => s.zoomToFit);

  // Queries
  const {
    data: rawPlans,
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans,
  } = useGardenPlans(gardenId);

  const plans = useMemo<GardenPlanDto[]>(() => {
    if (Array.isArray(rawPlans)) return rawPlans;
    if (
      rawPlans &&
      typeof rawPlans === 'object' &&
      'data' in rawPlans &&
      Array.isArray((rawPlans as { data: unknown }).data)
    ) {
      return (rawPlans as { data: GardenPlanDto[] }).data;
    }
    return [];
  }, [rawPlans]);

  const {
    data: activePlan,
    isLoading: activePlanLoading,
  } = useActiveGardenPlan(gardenId);

  // Decide which plan ID to load: user selection -> route parameter -> active plan -> first in list
  const effectivePlanId = useMemo(() => {
    if (selectedPlanId) return selectedPlanId;
    if (activePlan?.id) return activePlan.id;
    if (plans.length > 0 && plans[0]?.id) return plans[0].id;
    return null;
  }, [selectedPlanId, activePlan, plans]);

  const {
    data: planDetails,
    isLoading: planDetailsLoading,
    error: planDetailsError,
    refetch: refetchPlanDetails,
  } = useGardenPlan(effectivePlanId);

  const createPlanMutation = useCreateGardenPlan(gardenId);

  // Hydrate store when planDetails finishes loading or plan changes
  const lastLoadedPlanIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (planDetails && planDetails.id) {
      if (lastLoadedPlanIdRef.current !== planDetails.id) {
        lastLoadedPlanIdRef.current = planDetails.id;
        hydrate(planDetails, plans);
      } else if (planDetails.version > storeVersion) {
        // If server version is newer and user has no local changes, rehydrate smoothly
        if (!isDirty) {
          hydrate(planDetails, plans);
        } else {
          // Conflict detected: local unsaved changes while server has newer version
          setConflictPendingData(planDetails);
        }
      }
    }
  }, [planDetails, plans, hydrate, storeVersion, isDirty]);

  // Connect autosave hook (debounced 1.5s batch save)
  const { saveNow, saveStatus: autoSaveStatus } = usePlannerAutosave(
    gardenId,
    effectivePlanId,
  );

  // Open properties sheet automatically when a single object is selected
  useEffect(() => {
    if (selectedIds.length === 1) {
      setIsPropertiesOpen(true);
    } else if (selectedIds.length === 0) {
      setIsPropertiesOpen(false);
    }
  }, [selectedIds.length]);

  // Fit to screen callback
  const handleFitToScreen = useCallback(() => {
    zoomToFit(width, Math.max(100, height - 120));
  }, [zoomToFit, width, height]);

  // Back action with unsaved changes confirmation
  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmLeave = () => router.back();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm('У вас є незбережені зміни в плані. Ви дійсно хочете вийти?')) {
          confirmLeave();
        }
      } else {
        Alert.alert(
          'Незбережені зміни',
          'У вас є незбережені зміни в плані. Ви дійсно хочете вийти?',
          [
            { text: 'Залишитися', style: 'cancel' },
            { text: 'Зберегти і вийти', onPress: () => { void saveNow(); router.back(); } },
            { text: 'Вийти без збереження', style: 'destructive', onPress: confirmLeave },
          ],
        );
      }
    } else {
      router.back();
    }
  }, [isDirty, saveNow]);

  // Android Hardware Back button handling
  useEffect(() => {
    const onHardwareBack = () => {
      if (isLibraryOpen) {
        setIsLibraryOpen(false);
        return true;
      }
      if (isPropertiesOpen) {
        setIsPropertiesOpen(false);
        return true;
      }
      if (isLayersOpen) {
        setIsLayersOpen(false);
        return true;
      }
      if (isPlanSelectorOpen) {
        setIsPlanSelectorOpen(false);
        return true;
      }
      if (selectedIds.length > 0) {
        clearSelection();
        return true;
      }
      handleBack();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [
    isLibraryOpen,
    isPropertiesOpen,
    isLayersOpen,
    isPlanSelectorOpen,
    selectedIds.length,
    clearSelection,
    handleBack,
  ]);

  // Conflict resolution
  const handleKeepMine = useCallback(() => {
    setConflictPendingData(null);
  }, []);

  const handleTakeServer = useCallback(() => {
    if (conflictPendingData) {
      hydrate(conflictPendingData, plans);
    }
    setConflictPendingData(null);
  }, [conflictPendingData, hydrate, plans]);

  // Loading state
  const isInitialLoading = (plansLoading || activePlanLoading) && plans.length === 0;

  if (isInitialLoading) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.ac} />
        <Text style={[styles.loadingText, { color: theme.tx }]}>Завантаження плану садку...</Text>
      </View>
    );
  }

  // Error state for plans list
  if (plansError) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: theme.bg, padding: 24 }]}>
        <AlertTriangle size={48} color="#e74c3c" />
        <Text style={[styles.errorTitle, { color: theme.tx }]}>Не вдалося завантажити плани</Text>
        <Text style={[styles.errorSubtitle, { color: theme.mu }]}>
          Перевірте підключення до сервера або спробуйте знову
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: theme.ac }]}
          onPress={() => refetchPlans()}
        >
          <RefreshCw size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Повторити</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state: no plans created yet in this garden
  if (!plansLoading && plans.length === 0) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: theme.bg, padding: 24 }]}>
        <Compass size={64} color={theme.ac} />
        <Text style={[styles.emptyTitle, { color: theme.tx }]}>Створіть перший план</Text>
        <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
          У цьому саду ще немає жодного плану території. Створіть 2D-план, щоб розміщувати будівлі, зони, грядки та комунікації.
        </Text>
        <Pressable
          style={[styles.primaryActionBtn, { backgroundColor: theme.ac }]}
          onPress={() => {
            createPlanMutation.mutate(
              {
                name: 'Основний план',
                widthCm: 2000,
                heightCm: 1500,
                gridSizeCm: 50,
                northAngleDeg: 0,
              },
              {
                onSuccess: (newPlan) => {
                  setSelectedPlanId(newPlan.id);
                },
              },
            );
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.primaryActionBtnText}>Створити план території</Text>
        </Pressable>
      </View>
    );
  }

  // Plan details error
  if (planDetailsError && !planDetails) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: theme.bg, padding: 24 }]}>
        <AlertTriangle size={48} color="#e74c3c" />
        <Text style={[styles.errorTitle, { color: theme.tx }]}>Помилка плану</Text>
        <Text style={[styles.errorSubtitle, { color: theme.mu }]}>
          Не вдалося завантажити вибраний план саду
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: theme.ac }]}
          onPress={() => refetchPlanDetails()}
        >
          <RefreshCw size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Повторити</Text>
        </Pressable>
      </View>
    );
  }

  const isDark = theme.name === 'dark';

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* Safe Area Top Offset */}
      <View style={{ height: insets.top, backgroundColor: theme.pn }} />

      {/* Top 2-Row Toolbar: Row 1 */}
      <PlannerTopBar
        planTitle={storePlanName || planDetails?.name || 'План саду'}
        saveStatus={autoSaveStatus}
        isDirty={isDirty}
        onBack={handleBack}
        onOpenPlanSelector={() => setIsPlanSelectorOpen(true)}
        onSave={() => void saveNow()}
        theme={theme}
      />

      {/* Main Canvas Area */}
      <View style={styles.canvasContainer}>
        {planDetailsLoading && !planDetails ? (
          <View style={styles.centerAbsolute}>
            <ActivityIndicator size="large" color={theme.ac} />
          </View>
        ) : (
          <PlannerCanvas isDark={isDark} />
        )}

        {/* Floating Overlays on Canvas */}
        <NorthArrow isDark={isDark} />
        <ScaleBar isDark={isDark} />
        <LegendOverlay isDark={isDark} />
      </View>

      {/* Bottom 2-Row Toolbar: Row 2 (Horizontally scrollable tools) */}
      <PlannerBottomBar
        onOpenObjectLibrary={() => setIsLibraryOpen(true)}
        onOpenLayers={() => setIsLayersOpen(true)}
        onFitToScreen={handleFitToScreen}
        theme={theme}
      />

      {/* Safe Area Bottom Offset */}
      <View style={{ height: insets.bottom, backgroundColor: theme.pn }} />

      {/* Object Library Bottom Sheet */}
      <ObjectLibrarySheet
        visible={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        isDark={isDark}
      />

      {/* Object Properties Sheet */}
      <ObjectPropertiesSheet
        visible={isPropertiesOpen}
        onClose={() => setIsPropertiesOpen(false)}
        isDark={isDark}
      />

      {/* Layers Sheet */}
      <LayersSheet
        visible={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
        isDark={isDark}
      />

      {/* Plan Switcher Modal */}
      <PlanSelectorModal
        visible={isPlanSelectorOpen}
        onClose={() => setIsPlanSelectorOpen(false)}
        gardenId={gardenId}
        activePlanId={effectivePlanId || ''}
        plans={plans}
        onSelectPlan={(id: string) => {
          setSelectedPlanId(id);
          setIsPlanSelectorOpen(false);
        }}
        isDark={isDark}
      />

      {/* Conflict Resolution Modal */}
      <ConflictModal
        visible={Boolean(conflictPendingData)}
        onKeepMine={handleKeepMine}
        onTakeServer={handleTakeServer}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAbsolute: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 320,
  },
  primaryActionBtn: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
