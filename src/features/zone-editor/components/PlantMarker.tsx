import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { pixelsToMeters } from '@smart-garden/validation';
import type { CanvasPlant } from '../store';

/** Тривалість затримки перед початком перетягування (мс). */
const LONG_PRESS_MS = 250;
/** Поріг «руху» (px): менше — вважаємо тапом, а не drag. */
const MOVE_THRESHOLD_PX = 4;

type PlantMarkerProps = {
  plant: CanvasPlant;
  /** Екранна позиція центру маркера (пікселі). */
  x: number;
  y: number;
  radius: number;
  selected: boolean;
  pxPerMeter: number;
  strokeColor: string;
  fillColor: string;
  inkColor: string;
  showLabel: boolean;
  onSelect: (id: string) => void;
  /** Фінальне комітування (зі snap+кламп) після відпускання. */
  onDragEnd: (id: string, xM: number, yM: number) => void;
  onDragStart: () => void;
  /** Не використовується (під час drag позиція живе у shared values). */
  onDragMove?: (id: string, xM: number, yM: number) => void;
};

function PlantMarkerInner({
  plant,
  x,
  y,
  radius,
  selected,
  pxPerMeter,
  strokeColor,
  fillColor,
  inkColor,
  showLabel,
  onSelect,
  onDragEnd,
  onDragStart,
}: PlantMarkerProps) {
  // Живий офсет під час перетягування — лише поточний маркер, без ререндеру стору.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const moved = useSharedValue(false);

  const fireHaptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const handleDragStart = () => {
    onDragStart();
    fireHaptic();
  };
  const handleDragEnd = (xM: number, yM: number) => onDragEnd(plant.id, xM, yM);
  const handleSelect = () => onSelect(plant.id);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      'worklet';
      moved.value = false;
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
        // Long-press без руху → трактуємо як тап (виділення).
        runOnJS(handleSelect)();
        return;
      }
      const xM = plant.positionX + pixelsToMeters(e.translationX, pxPerMeter);
      const yM = plant.positionY + pixelsToMeters(e.translationY, pxPerMeter);
      runOnJS(handleDragEnd)(xM, yM);
    })
    .onFinalize(() => {
      'worklet';
      // Безпечний скид, якщо жест перервано системою.
      translateX.value = 0;
      translateY.value = 0;
    });

  const tap = Gesture.Tap()
    .maxDuration(LONG_PRESS_MS)
    .onEnd((_e, success) => {
      'worklet';
      if (success) {
        runOnJS(handleSelect)();
      }
    });

  // Pan має пріоритет: якщо long-press не встиг (швидкий тап) — спрацьовує tap.
  const composed = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const diameter = radius * 2;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.wrap,
          { left: x - radius, top: y - radius, width: diameter, height: diameter },
          animatedStyle,
        ]}
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
              borderWidth: selected ? Math.max(2, radius * 0.3) : Math.max(1.2, radius * 0.2),
              borderColor: strokeColor,
            },
          ]}
        >
          {radius >= 6 ? (
            <Text
              numberOfLines={1}
              style={[
                styles.icon,
                { color: inkColor, fontSize: Math.max(7, Math.min(14, radius * 0.75)) },
              ]}
            >
              {shortIcon(plant)}
            </Text>
          ) : null}
        </View>
        {showLabel ? (
          <Text numberOfLines={1} style={[styles.label, { color: inkColor }]}>
            {plant.name.slice(0, 14)}
          </Text>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function shortIcon(plant: CanvasPlant): string {
  const raw = (plant.plantType?.iconKey ?? plant.name ?? '').trim();
  return raw.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontWeight: '800' },
  label: { fontSize: 9, marginTop: 2, maxWidth: 72, textAlign: 'center' },
});

export const PlantMarker = memo(PlantMarkerInner);
