import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Leaf, Plus } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { formatApiError } from '@/src/lib/api-errors';
import { useTheme } from '@/src/theme/theme-context';
import { useZoneEditorStore } from '@/src/features/zone-editor/store';
import { useZoneAutosave } from '@/src/features/zone-editor/hooks/use-zone-autosave';
import { EditorToolbar } from '@/src/features/zone-editor/components/EditorToolbar';
import { ZoneCanvas } from '@/src/features/zone-editor/components/ZoneCanvas';
import { PlantCatalogSheet } from '@/src/features/zone-editor/components/PlantCatalogSheet';
import { PlantDetailSheet } from '@/src/features/zone-editor/components/PlantDetailSheet';
import { CreatePlantTypeModal } from '@/src/features/zone-editor/components/CreatePlantTypeModal';

/**
 * Мобільний редактор зони (порт веб zone-editor).
 * Дані: getBedLayout(zoneId) → store.hydrate; автозбереження: saveBedLayout (1.5с).
 */
export default function ZoneEditorScreen() {
  const params = useLocalSearchParams<{ zoneId?: string }>();
  const zoneId = params.zoneId ?? '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);

  const zone = useZoneEditorStore((s) => s.zone);
  const zoneType = useZoneEditorStore((s) => s.zoneType);
  const plants = useZoneEditorStore((s) => s.plants);
  const selectedId = useZoneEditorStore((s) => s.selectedId);
  const showGrid = useZoneEditorStore((s) => s.showGrid);
  const snapToGrid = useZoneEditorStore((s) => s.snapToGrid);
  const saveStatus = useZoneEditorStore((s) => s.saveStatus);
  const lastError = useZoneEditorStore((s) => s.lastError);
  const history = useZoneEditorStore((s) => s.history);

  const hydrate = useZoneEditorStore((s) => s.hydrate);
  const select = useZoneEditorStore((s) => s.select);
  const zoomBy = useZoneEditorStore((s) => s.zoomBy);
  const resetView = useZoneEditorStore((s) => s.resetView);
  const toggleGrid = useZoneEditorStore((s) => s.toggleGrid);
  const toggleSnap = useZoneEditorStore((s) => s.toggleSnap);
  const duplicateSelected = useZoneEditorStore((s) => s.duplicateSelected);
  const deleteSelected = useZoneEditorStore((s) => s.deleteSelected);
  const undo = useZoneEditorStore((s) => s.undo);
  const redo = useZoneEditorStore((s) => s.redo);

  const { saveNow } = useZoneAutosave(zoneId);

  const selected = selectedId ? (plants[selectedId] ?? null) : null;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const layoutQuery = useQuery({
    queryKey: ['bed-layout', zoneId],
    queryFn: () => api.getBedLayout(zoneId),
    enabled: Boolean(zoneId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (layoutQuery.data) {
      hydrate(layoutQuery.data);
    }
  }, [layoutQuery.data, hydrate]);

  // Відкривати деталі рослини при новому виборі.
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId && selectedId !== prevSelected.current) {
      setDetailOpen(true);
    }
    if (!selectedId) {
      setDetailOpen(false);
    }
    prevSelected.current = selectedId;
  }, [selectedId]);

  const goBack = () => {
    if (saveStatus === 'dirty' || saveStatus === 'error') {
      Alert.alert('Незбережені зміни', 'Зберегти зміни перед виходом?', [
        { text: 'Залишитись', style: 'cancel' },
        {
          text: 'Зберегти і вийти',
          onPress: () => {
            saveNow();
            router.back();
          },
        },
        { text: 'Вийти без збереження', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (layoutQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.ac} />
        <Text style={[styles.centerText, { color: theme.mu }]}>Завантаження схеми…</Text>
      </View>
    );
  }

  if (layoutQuery.isError || !zoneId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <Leaf size={40} color={theme.mu} />
        <Text style={[styles.centerText, { color: theme.mu }]}>
          {zoneId
            ? formatApiError(layoutQuery.error, 'Не вдалося завантажити зону')
            : 'Зону не знайдено'}
        </Text>
        <Pressable onPress={goBack} style={[styles.retryBtn, { borderColor: theme.ac }]}>
          <Text style={[styles.retryText, { color: theme.ac }]}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <EditorToolbar
        zoneName={zone.name || 'Зона'}
        zoneType={zoneType}
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={Boolean(selected)}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        onBack={goBack}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onFit={resetView}
        onToggleGrid={toggleGrid}
        onToggleSnap={toggleSnap}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onSave={saveNow}
        theme={theme}
      />

      {lastError ? (
        <View style={[styles.errorBar, { backgroundColor: theme.danger }]}>
          <Text style={styles.errorText} numberOfLines={2}>
            {lastError}
          </Text>
        </View>
      ) : null}

      <View style={styles.canvasArea}>
        <ZoneCanvas theme={theme} />
      </View>

      <Pressable
        onPress={() => setCatalogOpen(true)}
        style={[styles.fab, { backgroundColor: theme.ac, bottom: insets.bottom + 20 }]}
      >
        <Plus size={20} color="#fff" />
        <Text style={styles.fabText}>Рослина</Text>
      </Pressable>

      <PlantCatalogSheet
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onCreateCustom={() => {
          setCatalogOpen(false);
          setCreateTypeOpen(true);
        }}
        centerMeters={{ x: zone.widthM / 2, y: zone.heightM / 2 }}
        theme={theme}
      />

      <PlantDetailSheet
        plant={detailOpen ? selected : null}
        onClose={() => {
          setDetailOpen(false);
          select(null);
        }}
        theme={theme}
      />

      <CreatePlantTypeModal
        open={createTypeOpen}
        onClose={() => setCreateTypeOpen(false)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerText: { fontSize: 14, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  retryText: { fontSize: 14, fontWeight: '700' },
  canvasArea: { flex: 1, padding: 10 },
  errorBar: { paddingHorizontal: 14, paddingVertical: 8 },
  errorText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

