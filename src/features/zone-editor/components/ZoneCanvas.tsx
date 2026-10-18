import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { computePxPerMeter } from '@/src/features/zone-editor/lib/geometry';
import { GridLayer } from './GridLayer';
import { PlantMarker } from './PlantMarker';
import { useCanvasGestures } from '../hooks/use-canvas-gestures';
import { useZoneEditorStore } from '../store';

const CANVAS_PADDING_DP = 16;
const MIN_MARKER_RADIUS_DP = 7; // Візуальний мінімум 14 dp

type CanvasTheme = { bd: string; mu: string; ac: string; name: string };

export function ZoneCanvas({ theme }: { theme: CanvasTheme }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const isDraggingSV = useSharedValue(false);
  const panTranslateX = useSharedValue(0);
  const panTranslateY = useSharedValue(0);
  const pinchScale = useSharedValue(1);

  const zone = useZoneEditorStore((s) => s.zone);
  const plantsMap = useZoneEditorStore((s) => s.plants);
  const selectedId = useZoneEditorStore((s) => s.selectedId);
  const view = useZoneEditorStore((s) => s.view);
  const showGrid = useZoneEditorStore((s) => s.showGrid);
  const gridStepM = useZoneEditorStore((s) => s.gridStepM);
  const select = useZoneEditorStore((s) => s.select);
  const setView = useZoneEditorStore((s) => s.setView);
  const zoomBy = useZoneEditorStore((s) => s.zoomBy);
  const setDragging = useZoneEditorStore((s) => s.setDragging);
  const commitPlantPosition = useZoneEditorStore((s) => s.commitPlantPosition);

  const plants = useMemo(() => Object.values(plantsMap).filter((p) => !p.deleted), [plantsMap]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  // Вписування зони в доступну область екрана (fit-to-screen, відступ 16 dp, збереження пропорцій)
  const basePx = useMemo(() => {
    const availableW = Math.max(0, size.width - CANVAS_PADDING_DP * 2);
    const availableH = Math.max(0, size.height - CANVAS_PADDING_DP * 2);
    return computePxPerMeter({
      stageWidthPx: availableW,
      stageHeightPx: availableH,
      bedWidthM: Math.max(0.1, Number(zone.widthM) || 4),
      bedHeightM: Math.max(0.1, Number(zone.heightM) || 2),
      padding: 1.0,
      scale: 1,
    });
  }, [size, zone.widthM, zone.heightM]);

  const safeScale = Number.isFinite(view.scale) && view.scale > 0 ? view.scale : 1;
  const pxPerMeter = (Number.isFinite(basePx) && basePx > 0 ? basePx : 1) * safeScale;
  const safeZoneWidthM = Math.max(0.1, Number(zone.widthM) || 4);
  const safeZoneHeightM = Math.max(0.1, Number(zone.heightM) || 2);
  const zoneW = safeZoneWidthM * pxPerMeter;
  const zoneH = safeZoneHeightM * pxPerMeter;
  // Центрування зони на полотні
  const originX = (size.width - zoneW) / 2 + (Number.isFinite(view.offsetX) ? view.offsetX : 0);
  const originY = (size.height - zoneH) / 2 + (Number.isFinite(view.offsetY) ? view.offsetY : 0);

  const getScale = useCallback(() => useZoneEditorStore.getState().view.scale, []);
  const onPanEnd = useCallback(
    (dx: number, dy: number) => {
      const v = useZoneEditorStore.getState().view;
      setView({ offsetX: v.offsetX + dx, offsetY: v.offsetY + dy });
    },
    [setView],
  );
  const onZoomEnd = useCallback(
    (rawFactor: number) => {
      const current = useZoneEditorStore.getState().view.scale;
      if (!Number.isFinite(current) || current <= 0 || !Number.isFinite(rawFactor) || rawFactor <= 0) {
        return;
      }
      const target = Math.min(4, Math.max(0.3, current * rawFactor));
      const factor = target / current;
      if (Math.abs(factor - 1) > 0.001) {
        zoomBy(factor);
      }
    },
    [zoomBy],
  );
  const onTapBackground = useCallback(() => select(null), [select]);

  const canvasGesture = useCanvasGestures({
    getScale,
    onZoomEnd,
    onPanEnd,
    onTapBackground,
    isDragging: isDraggingSV,
    panTranslateX,
    panTranslateY,
    pinchScale,
  });

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panTranslateX.value },
      { translateY: panTranslateY.value },
      { scale: pinchScale.value },
    ],
  }));

  const onDragEnd = useCallback(
    (id: string, xM: number, yM: number) => {
      setDragging(false);
      commitPlantPosition(id, xM, yM);
    },
    [commitPlantPosition, setDragging],
  );
  const onDragStart = useCallback(() => setDragging(true), [setDragging]);
  const onSelect = useCallback((id: string) => select(id), [select]);

  const selectedPlant = selectedId ? (plantsMap[selectedId] ?? null) : null;

  const fillColor = theme.name === 'dark' ? '#2a3a2c' : '#c7a17a';
  const fillEnd = theme.name === 'dark' ? '#1d2a1f' : '#a97e52';
  const minorGrid = theme.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const majorGrid = theme.name === 'dark' ? 'rgba(63,174,109,0.35)' : 'rgba(47,143,87,0.35)';

  const hasValidSelectedCoords =
    selectedPlant &&
    !selectedPlant.deleted &&
    Number.isFinite(selectedPlant.positionX) &&
    Number.isFinite(selectedPlant.positionY);

  return (
    <GestureDetector gesture={canvasGesture}>
      <View style={styles.canvasWrap} onLayout={onLayout}>
        {size.width > 0 && size.height > 0 ? (
          <Animated.View style={[StyleSheet.absoluteFill, canvasAnimatedStyle]}>
            <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>

              <Defs>
                <LinearGradient id="zoneGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={fillColor} />
                  <Stop offset="1" stopColor={fillEnd} />
                </LinearGradient>
              </Defs>
              <Rect
                x={originX}
                y={originY}
                width={zoneW}
                height={zoneH}
                rx={Math.min(16, zoneW * 0.04)}
                fill="url(#zoneGrad)"
                stroke={theme.bd}
                strokeWidth={1.5}
              />
              {showGrid ? (
                <GridLayer
                  widthM={safeZoneWidthM}
                  heightM={safeZoneHeightM}
                  pxPerMeter={pxPerMeter}
                  gridStepM={gridStepM}
                  minorColor={minorGrid}
                  majorColor={majorGrid}
                  originX={originX}
                  originY={originY}
                />
              ) : null}
              {hasValidSelectedCoords ? (
                (() => {
                  const selSize = Number.isFinite(selectedPlant!.size) && selectedPlant!.size > 0 ? selectedPlant!.size : 0.4;
                  const r = Math.max((selSize * pxPerMeter) / 2, MIN_MARKER_RADIUS_DP);
                  const selX = Math.min(
                    Math.max(originX + selectedPlant!.positionX * pxPerMeter, originX + r),
                    originX + zoneW - r,
                  );
                  const selY = Math.min(
                    Math.max(originY + selectedPlant!.positionY * pxPerMeter, originY + r),
                    originY + zoneH - r,
                  );
                  return (
                    <>
                      <Line
                        x1={selX}
                        y1={originY}
                        x2={selX}
                        y2={originY + zoneH}
                        stroke={theme.ac}
                        strokeWidth={1}
                        strokeDasharray="5 4"
                      />
                      <Line
                        x1={originX}
                        y1={selY}
                        x2={originX + zoneW}
                        y2={selY}
                        stroke={theme.ac}
                        strokeWidth={1}
                        strokeDasharray="5 4"
                      />
                    </>
                  );
                })()
              ) : null}
            </Svg>

            {plants.map((plant) => {
              const plantSize = Number.isFinite(plant.size) && plant.size > 0 ? plant.size : 0.4;
              const radius = Math.max((plantSize * pxPerMeter) / 2, MIN_MARKER_RADIUS_DP);
              const pX = Number.isFinite(plant.positionX) ? plant.positionX : safeZoneWidthM / 2;
              const pY = Number.isFinite(plant.positionY) ? plant.positionY : safeZoneHeightM / 2;
              const clampedX = Math.min(
                Math.max(originX + pX * pxPerMeter, originX + radius),
                originX + zoneW - radius,
              );
              const clampedY = Math.min(
                Math.max(originY + pY * pxPerMeter, originY + radius),
                originY + zoneH - radius,
              );
              const selected = selectedId === plant.id;

              return (
                <PlantMarker
                  key={plant.id}
                  plant={plant}
                  x={clampedX}
                  y={clampedY}
                  radius={radius}
                  selected={selected}
                  pxPerMeter={pxPerMeter}
                  strokeColor={selected ? theme.ac : '#e67e22'}
                  fillColor="#ffffff"
                  inkColor="#1c2418"
                  showLabel={safeScale >= 0.7}
                  onSelect={onSelect}
                  onDragEnd={onDragEnd}
                  onDragStart={onDragStart}
                  isDraggingCanvas={isDraggingSV}
                />
              );
            })}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
