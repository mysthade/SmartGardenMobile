import { memo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CATEGORY_EMOJI } from '@/src/lib/zone-labels';
import type { CanvasPlant } from '../store';

/** Тривалість затримки перед початком перетягування (мс). */
const LONG_PRESS_MS = 200;
/** Поріг руху (px): менше — вважаємо тапом, а не drag. */
const MOVE_THRESHOLD_PX = 4;
/** Мінімальний розмір області натискання за рекомендаціями WCAG / Material (dp). */
const MIN_TOUCH_TARGET_DP = 44;

type PlantMarkerProps = {
  plant: CanvasPlant;
  /** Екранна позиція центру маркера (пікселі, заклампована у межах зони). */
  x: number;
  y: number;
  radius: number;
  selected: boolean;
  pxPerMeter: number;
  strokeColor?: string;
  fillColor?: string;
  inkColor?: string;
  showLabel?: boolean;
  onSelect: (id: string) => void;
  /** Фінальне комітування (зі snap+кламп) після відпускання. */
  onDragEnd: (id: string, xM: number, yM: number) => void;
  onDragStart: () => void;
  onDragMove?: (id: string, xM: number, yM: number) => void;
  isDraggingCanvas?: SharedValue<boolean>;
};

function PlantMarkerInner({
  plant,
  x,
  y,
  radius,
  selected,
  pxPerMeter,
  strokeColor = '#e67e22',
  fillColor = '#ffffff',
  inkColor = '#1c2418',
  showLabel = true,
  onSelect,
  onDragEnd,
  onDragStart,
  isDraggingCanvas,
}: PlantMarkerProps) {
  // Живий офсет під час перетягування — оновлюється на UI thread без зайвих ререндерів стору.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const moved = useSharedValue(false);

  const fireHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  const handleDragStart = useCallback(() => {
    onDragStart();
    fireHaptic();
  }, [onDragStart, fireHaptic]);

  const handleDragEnd = useCallback(
    (translationX: number, translationY: number) => {
      const dxM = pxPerMeter > 0 && Number.isFinite(translationX) ? translationX / pxPerMeter : 0;
      const dyM = pxPerMeter > 0 && Number.isFinite(translationY) ? translationY / pxPerMeter : 0;
      const baseX = Number.isFinite(plant.positionX) ? plant.positionX : 0;
      const baseY = Number.isFinite(plant.positionY) ? plant.positionY : 0;
      onDragEnd(plant.id, baseX + dxM, baseY + dyM);
    },
    [onDragEnd, plant.id, plant.positionX, plant.positionY, pxPerMeter],
  );

  const handleSelect = useCallback(() => {
    onSelect(plant.id);
  }, [onSelect, plant.id]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      'worklet';
      moved.value = false;
      if (isDraggingCanvas) {
        isDraggingCanvas.value = true;
      }
      runOnJS(handleDragStart)();
    })
    .onUpdate((e) => {
      'worklet';
      if (Math.abs(e.translationX) > MOVE_THRESHOLD_PX || Math.abs(e.translationY) > MOVE_THRESHOLD_PX) {
        moved.value = true;
      }
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      translateX.value = 0;
      translateY.value = 0;
      if (!moved.value) {
        // Long-press без суттєвого руху трактуємо як тап (виділення).
        runOnJS(handleSelect)();
        return;
      }
      runOnJS(handleDragEnd)(e.translationX, e.translationY);
    })
    .onFinalize(() => {
      'worklet';
      translateX.value = 0;
      translateY.value = 0;
      if (isDraggingCanvas) {
        isDraggingCanvas.value = false;
      }
    });

  const tap = Gesture.Tap()
    .maxDuration(LONG_PRESS_MS)
    .onEnd((_e, success) => {
      'worklet';
      if (success) {
        runOnJS(handleSelect)();
      }
    });

  const composed = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const validRadius = Number.isFinite(radius) && radius > 0 ? radius : MIN_TOUCH_TARGET_DP / 2;
  const diameter = validRadius * 2;
  const emoji = plant.plantType?.category
    ? (CATEGORY_EMOJI[plant.plantType.category] ?? '🌱')
    : '🌱';
  const hitPadding = Math.max(0, (MIN_TOUCH_TARGET_DP - diameter) / 2);
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.wrap,
          {
            left: safeX - validRadius - hitPadding,
            top: safeY - validRadius - hitPadding,
            width: diameter + hitPadding * 2,
            height: diameter + hitPadding * 2,
            padding: hitPadding,
          },
          animatedStyle,
        ]}
        hitSlop={{ top: hitPadding, bottom: hitPadding, left: hitPadding, right: hitPadding }}
        pointerEvents="box-only"
      >
        <View
          style={[
            styles.circle,
            {
              width: diameter,
              height: diameter,
              borderRadius: radius,
              backgroundColor: fillColor,
              borderWidth: selected ? Math.max(2.5, radius * 0.35) : Math.max(1.8, radius * 0.22),
              borderColor: selected ? '#2f8f57' : strokeColor,
              shadowColor: '#000',
              shadowOpacity: selected ? 0.25 : 0.12,
              shadowRadius: selected ? 5 : 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: selected ? 4 : 2,
            },
          ]}
        >
          {radius >= 6 ? (
            <Text
              style={{
                fontSize: Math.max(9, Math.min(18, radius * 0.95)),
                textAlign: 'center',
                includeFontPadding: false,
              }}
            >
              {emoji}
            </Text>
          ) : null}
        </View>

        {showLabel ? (
          <View style={styles.labelContainer} pointerEvents="none">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.3}
              style={[styles.label, { color: inkColor }]}
            >
              {plant.name}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    top: '100%',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 90,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export const PlantMarker = memo(PlantMarkerInner, (prev, next) => {
  return (
    prev.plant.id === next.plant.id &&
    prev.plant.positionX === next.plant.positionX &&
    prev.plant.positionY === next.plant.positionY &&
    prev.plant.size === next.plant.size &&
    prev.plant.status === next.plant.status &&
    prev.plant.name === next.plant.name &&
    prev.plant.version === next.plant.version &&
    prev.selected === next.selected &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.radius === next.radius &&
    prev.pxPerMeter === next.pxPerMeter &&
    prev.strokeColor === next.strokeColor &&
    prev.fillColor === next.fillColor &&
    prev.inkColor === next.inkColor &&
    prev.showLabel === next.showLabel
  );
});
