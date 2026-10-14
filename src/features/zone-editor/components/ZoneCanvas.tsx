import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { computePxPerMeter } from '@smart-garden/validation';
import { GridLayer } from './GridLayer';
import { PlantMarker } from './PlantMarker';
import { useCanvasGestures } from '../hooks/use-canvas-gestures';
import { markerTone, useZoneEditorStore } from '../store';

const TONE_STROKE: Record<string, string> = {
  ok: '#2f7a3a',
  attention: '#dc9b2b',
  danger: '#b23a2e',
  done: '#b6c3a5',
};

const PAD = 0.88;

type CanvasTheme = { bd: string; mu: string; ac: string; name: string };

export function ZoneCanvas({ theme }: { theme: CanvasTheme }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  const basePx = useMemo(
    () =>
      computePxPerMeter({
        stageWidthPx: size.width,
        stageHeightPx: size.height,
        bedWidthM: zone.widthM,
        bedHeightM: zone.heightM,
        padding: PAD,
        scale: 1,
      }),
    [size, zone.widthM, zone.heightM],
  );
  const pxPerMeter = basePx * view.scale;
  const zoneW = zone.widthM * pxPerMeter;
  const zoneH = zone.heightM * pxPerMeter;
  const originX = (size.width - zoneW) / 2 + view.offsetX;
  const originY = (size.height - zoneH) / 2 + view.offsetY;

  const getScale = useCallback(() => useZoneEditorStore.getState().view.scale, []);
  const isDragging = useCallback(() => useZoneEditorStore.getState().isDragging, []);
  const onPan = useCallback(
    (dx: number, dy: number) => {
      const v = useZoneEditorStore.getState().view;
      setView({ offsetX: v.offsetX + dx, offsetY: v.offsetY + dy });
    },
    [setView],
  );
  const onTapBackground = useCallback(() => select(null), [select]);

  const canvasGesture = useCanvasGestures({
    getScale,
    onZoom: zoomBy,
    onPan,
    onTapBackground,
    isDragging,
  });

  const onDragEnd = useCallback(
    (id: string, xM: number, yM: number) => commitPlantPosition(id, xM, yM),
    [commitPlantPosition],
  );
  const onDragStart = useCallback(() => setDragging(true), [setDragging]);
  const onSelect = useCallback((id: string) => select(id), [select]);

  const selectedPlant = selectedId ? (plantsMap[selectedId] ?? null) : null;

  const fillColor = theme.name === 'dark' ? '#2a3a2c' : '#c7a17a';
  const fillEnd = theme.name === 'dark' ? '#1d2a1f' : '#a97e52';
  const minorGrid = theme.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const majorGrid = theme.name === 'dark' ? 'rgba(63,174,109,0.35)' : 'rgba(47,143,87,0.35)';

  return (
    <GestureDetector gesture={canvasGesture}>
      <View style={styles.canvasWrap} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 ? (
        <>
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
                widthM={zone.widthM}
                heightM={zone.heightM}
                pxPerMeter={pxPerMeter}
                gridStepM={gridStepM}
                minorColor={minorGrid}
                majorColor={majorGrid}
                originX={originX}
                originY={originY}
              />
            ) : null}
            {selectedPlant && !selectedPlant.deleted ? (
              <>
                <Line
                  x1={originX + selectedPlant.positionX * pxPerMeter}
                  y1={originY}
                  x2={originX + selectedPlant.positionX * pxPerMeter}
                  y2={originY + zoneH}
                  stroke={theme.ac}
                  strokeWidth={1}
                  strokeDasharray="5 4"
                />
                <Line
                  x1={originX}
                  y1={originY + selectedPlant.positionY * pxPerMeter}
                  x2={originX + zoneW}
                  y2={originY + selectedPlant.positionY * pxPerMeter}
                  stroke={theme.ac}
                  strokeWidth={1}
                  strokeDasharray="5 4"
                />
              </>
            ) : null}
          </Svg>

          {plants.map((plant) => {
            const x = originX + plant.positionX * pxPerMeter;
            const y = originY + plant.positionY * pxPerMeter;
            const radius = Math.max((plant.size * pxPerMeter) / 2, 6);
            const selected = selectedId === plant.id;
            const stroke = selected ? theme.ac : (TONE_STROKE[markerTone(plant)] ?? TONE_STROKE.ok);
            return (
              <PlantMarker
                key={plant.id}
                plant={plant}
                x={x}
                y={y}
                radius={radius}
                selected={selected}
                pxPerMeter={pxPerMeter}
                strokeColor={stroke}
                fillColor={theme.name === 'dark' ? '#f7f9f1' : '#ffffff'}
                inkColor="#1c2418"
                showLabel={view.scale >= 0.75 && radius >= 10}
                onSelect={onSelect}
                onDragEnd={onDragEnd}
                onDragStart={onDragStart}
              />
            );
          })}
        </>
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
