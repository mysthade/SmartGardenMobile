import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  Ruler,
  Layers,
  Plus,
  CheckSquare,
  Square,
  Copy,
  Trash2,
  Spline,
} from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import { usePlannerStore } from '../../store/use-planner-store';

interface PlannerBottomBarProps {
  onOpenObjectLibrary: () => void;
  onOpenLayers: () => void;
  onFitToScreen: () => void;
  theme: ThemeTokens;
}

export const PlannerBottomBar = React.memo(function PlannerBottomBar({
  onOpenObjectLibrary,
  onOpenLayers,
  onFitToScreen,
  theme,
}: PlannerBottomBarProps) {
  const showGrid = usePlannerStore((s) => s.grid.enabled);
  const snapToGrid = usePlannerStore((s) => s.grid.snap);
  const showRulers = usePlannerStore((s) => s.settings.showRulers);
  const isMultiSelectMode = usePlannerStore((s) => s.isMultiSelectMode);
  const activeTool = usePlannerStore((s) => s.activeTool);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const canUndo = usePlannerStore((s) => s.history.past.length > 0);
  const canRedo = usePlannerStore((s) => s.history.future.length > 0);

  const toggleGrid = usePlannerStore((s) => s.toggleGrid);
  const toggleSnap = usePlannerStore((s) => s.toggleSnap);
  const toggleRulers = usePlannerStore((s) => s.toggleRulers);
  const toggleMultiSelect = usePlannerStore((s) => s.toggleMultiSelect);
  const setTool = usePlannerStore((s) => s.setTool);
  const zoomBy = usePlannerStore((s) => s.zoomBy);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const duplicateSelected = usePlannerStore((s) => s.duplicateSelected);
  const deleteSelected = usePlannerStore((s) => s.deleteSelected);

  const isBoundaryEditMode = activeTool === 'boundary';
  const toggleBoundaryEditMode = () => {
    setTool(isBoundaryEditMode ? 'select' : 'boundary');
  };
  const zoomIn = () => zoomBy(1.2);
  const zoomOut = () => zoomBy(0.8);

  const hasSelection = selectedIds.length > 0;

  const handleDelete = () => {
    if (!hasSelection) return;
    const count = selectedIds.length;
    const msg = count === 1 ? 'Видалити вибраний об’єкт?' : `Видалити ${count} вибрані об’єкти?`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(msg)) {
        deleteSelected();
      }
    } else {
      Alert.alert('Підтвердження', msg, [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Видалити', style: 'destructive', onPress: deleteSelected },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.pn,
          borderTopColor: theme.bd,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* + Add Object primary button */}
        <Pressable
          accessibilityLabel="Додати новий об'єкт"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: theme.ac,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={onOpenObjectLibrary}
        >
          <Plus size={18} color="#fff" />
          <Text maxFontSizeMultiplier={1.2} style={styles.primaryBtnText}>
            + Об’єкт
          </Text>
        </Pressable>

        <View style={[styles.separator, { backgroundColor: theme.bd }]} />

        {/* Undo */}
        <Pressable
          accessibilityLabel="Скасувати дію"
          accessibilityRole="button"
          disabled={!canUndo}
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: !canUndo ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
          onPress={undo}
        >
          <Undo2 size={18} color={theme.tx} />
        </Pressable>

        {/* Redo */}
        <Pressable
          accessibilityLabel="Повторити дію"
          accessibilityRole="button"
          disabled={!canRedo}
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: !canRedo ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
          onPress={redo}
        >
          <Redo2 size={18} color={theme.tx} />
        </Pressable>

        <View style={[styles.separator, { backgroundColor: theme.bd }]} />

        {/* Zoom In */}
        <Pressable
          accessibilityLabel="Збільшити масштаб"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={zoomIn}
        >
          <ZoomIn size={18} color={theme.tx} />
        </Pressable>

        {/* Zoom Out */}
        <Pressable
          accessibilityLabel="Зменшити масштаб"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={zoomOut}
        >
          <ZoomOut size={18} color={theme.tx} />
        </Pressable>

        {/* Fit */}
        <Pressable
          accessibilityLabel="Вписати ділянку в екран"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={onFitToScreen}
        >
          <Maximize2 size={18} color={theme.tx} />
        </Pressable>

        <View style={[styles.separator, { backgroundColor: theme.bd }]} />

        {/* Grid toggle */}
        <Pressable
          accessibilityLabel={`Сітка ${showGrid ? 'увімкнена' : 'вимкнена'}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: showGrid ? theme.ac + '20' : theme.bg,
              borderColor: showGrid ? theme.ac : theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={toggleGrid}
        >
          <Grid size={17} color={showGrid ? theme.ac : theme.tx} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.toggleBtnText,
              { color: showGrid ? theme.ac : theme.tx },
            ]}
          >
            Сітка
          </Text>
        </Pressable>

        {/* Snap toggle */}
        <Pressable
          accessibilityLabel={`Прив'язка до сітки ${snapToGrid ? 'увімкнена' : 'вимкнена'}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: snapToGrid ? theme.ac + '20' : theme.bg,
              borderColor: snapToGrid ? theme.ac : theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={toggleSnap}
        >
          <Magnet size={17} color={snapToGrid ? theme.ac : theme.tx} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.toggleBtnText,
              { color: snapToGrid ? theme.ac : theme.tx },
            ]}
          >
            Прив’язка
          </Text>
        </Pressable>

        {/* Rulers toggle */}
        <Pressable
          accessibilityLabel={`Лінійки ${showRulers ? 'увімкнені' : 'вимкнені'}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: showRulers ? theme.ac + '20' : theme.bg,
              borderColor: showRulers ? theme.ac : theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={toggleRulers}
        >
          <Ruler size={17} color={showRulers ? theme.ac : theme.tx} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.toggleBtnText,
              { color: showRulers ? theme.ac : theme.tx },
            ]}
          >
            Лінійки
          </Text>
        </Pressable>

        {/* Boundary Editor toggle */}
        <Pressable
          accessibilityLabel={`Редактор межі ділянки ${isBoundaryEditMode ? 'активний' : 'вимкнений'}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: isBoundaryEditMode ? '#8e44ad20' : theme.bg,
              borderColor: isBoundaryEditMode ? '#8e44ad' : theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={toggleBoundaryEditMode}
        >
          <Spline size={17} color={isBoundaryEditMode ? '#8e44ad' : theme.tx} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.toggleBtnText,
              { color: isBoundaryEditMode ? '#8e44ad' : theme.tx },
            ]}
          >
            Межа
          </Text>
        </Pressable>

        {/* Layers Sheet Trigger */}
        <Pressable
          accessibilityLabel="Керування шарами"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={onOpenLayers}
        >
          <Layers size={17} color={theme.tx} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.toggleBtnText, { color: theme.tx }]}
          >
            Шари
          </Text>
        </Pressable>

        {/* Multi-select toggle */}
        <Pressable
          accessibilityLabel={`Режим мультивибору ${isMultiSelectMode ? 'увімкнено' : 'вимкнено'}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: isMultiSelectMode ? theme.ac + '20' : theme.bg,
              borderColor: isMultiSelectMode ? theme.ac : theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={toggleMultiSelect}
        >
          {isMultiSelectMode ? (
            <CheckSquare size={17} color={theme.ac} />
          ) : (
            <Square size={17} color={theme.tx} />
          )}
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.toggleBtnText,
              { color: isMultiSelectMode ? theme.ac : theme.tx },
            ]}
          >
            Мультивибір
          </Text>
        </Pressable>

        {/* Selection actions: Duplicate & Delete */}
        {hasSelection && (
          <>
            <View style={[styles.separator, { backgroundColor: theme.bd }]} />

            <Pressable
              accessibilityLabel="Дублювати вибрані об'єкти"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.bd,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={duplicateSelected}
            >
              <Copy size={18} color={theme.tx} />
            </Pressable>

            <Pressable
              accessibilityLabel="Видалити вибрані об'єкти"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: '#e74c3c15',
                  borderColor: '#e74c3c50',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={handleDelete}
            >
              <Trash2 size={18} color="#e74c3c" />
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 3,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  primaryBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    width: 1,
    height: 28,
    marginHorizontal: 2,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
