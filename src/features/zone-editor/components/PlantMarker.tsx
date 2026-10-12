import { memo, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { pixelsToMeters } from '@smart-garden/validation';
import type { CanvasPlant } from '../store';

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
  /** Прев'ю позиції під час drag (без snap). */
  onDragMove: (id: string, xM: number, yM: number) => void;
  /** Фінальне комітування (зі snap) після відпускання. */
  onDragEnd: (id: string, xM: number, yM: number) => void;
  onDragStart: () => void;
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
  onDragMove,
  onDragEnd,
  onDragStart,
}: PlantMarkerProps) {
  const dragged = useRef(false);
  const start = useRef({ xM: plant.positionX, yM: plant.positionY });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          dragged.current = false;
          start.current = { xM: plant.positionX, yM: plant.positionY };
          onDragStart();
        },
        onPanResponderMove: (_evt, g) => {
          dragged.current = true;
          const xM = start.current.xM + pixelsToMeters(g.dx, pxPerMeter);
          const yM = start.current.yM + pixelsToMeters(g.dy, pxPerMeter);
          onDragMove(plant.id, xM, yM);
        },
        onPanResponderRelease: () => {
          if (dragged.current) {
            onDragEnd(plant.id, plant.positionX, plant.positionY);
          } else {
            onSelect(plant.id);
          }
        },
        onPanResponderTerminate: () => {
          if (dragged.current) {
            onDragEnd(plant.id, plant.positionX, plant.positionY);
          }
        },
      }),
    [plant.id, plant.positionX, plant.positionY, pxPerMeter, onSelect, onDragMove, onDragEnd, onDragStart],
  );

  const diameter = radius * 2;

  return (
    <View
      pointerEvents="box-only"
      {...pan.panHandlers}
      style={[styles.wrap, { left: x - radius, top: y - radius, width: diameter, height: diameter }]}
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
            style={[styles.icon, { color: inkColor, fontSize: Math.max(7, Math.min(14, radius * 0.75)) }]}
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
    </View>
  );
}

function shortIcon(plant: CanvasPlant): string {
  const raw = (plant.plantType?.iconKey ?? plant.name ?? '').trim();
  return raw.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontWeight: '800' },
  label: { fontSize: 9, marginTop: 2, maxWidth: 72, textAlign: 'center' },
});

export const PlantMarker = memo(PlantMarkerInner);
