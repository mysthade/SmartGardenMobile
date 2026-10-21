import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  getEffectiveBoundary,
  pxToCm,
  snapValueToGrid,
} from '@smart-garden/validation';
import { useGardenPlannerStore } from '../../store/use-planner-store';
import { GridSvg } from './GridSvg';
import { PlotBoundarySvg } from './PlotBoundarySvg';
import { PlanObjectSvg } from './PlanObjectSvg';
import { TransformerSvg } from './TransformerSvg';
import { SnapGuidesSvg } from './SnapGuidesSvg';
import { MeasurementRulersSvg } from './MeasurementRulersSvg';
import { BoundaryEditorSvg } from './BoundaryEditorSvg';
import { LineEditorSvg } from './LineEditorSvg';

interface PlannerCanvasProps {
  isDark: boolean;
}

export function PlannerCanvas({ isDark }: PlannerCanvasProps) {
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number } | null>(null);
  const hasAutoFittedRef = useRef(false);

  const plan = useGardenPlannerStore((s) => s.plan);
  const objects = useGardenPlannerStore((s) => s.objects);
  const objectIds = useGardenPlannerStore((s) => s.objectIds);
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const activeTool = useGardenPlannerStore((s) => s.activeTool);
  const view = useGardenPlannerStore((s) => s.view);
  const grid = useGardenPlannerStore((s) => s.grid);
  const settings = useGardenPlannerStore((s) => s.settings);
  const layersVisibility = useGardenPlannerStore((s) => s.layersVisibility);
  const layersLocked = useGardenPlannerStore((s) => s.layersLocked);
  const activeGuides = useGardenPlannerStore((s) => s.activeGuides);
  const lineDrawingState = useGardenPlannerStore((s) => s.lineDrawingState);
  const selectedLineVertex = useGardenPlannerStore((s) => s.selectedLineVertex);
  const selectedBoundaryVertexIdx = useGardenPlannerStore((s) => s.selectedBoundaryVertexIdx);

  // Store actions
  const select = useGardenPlannerStore((s) => s.select);
  const clearSelection = useGardenPlannerStore((s) => s.clearSelection);
  const setView = useGardenPlannerStore((s) => s.setView);
  const zoomBy = useGardenPlannerStore((s) => s.zoomBy);
  const zoomToFit = useGardenPlannerStore((s) => s.zoomToFit);
  const moveSelected = useGardenPlannerStore((s) => s.moveSelected);
  const setActiveGuides = useGardenPlannerStore((s) => s.setActiveGuides);
  const setIsDragging = useGardenPlannerStore((s) => s.setIsDragging);
  const addDrawingLinePoint = useGardenPlannerStore((s) => s.addDrawingLinePoint);
  const insertBoundaryVertex = useGardenPlannerStore((s) => s.insertBoundaryVertex);
  const setSelectedBoundaryVertexIdx = useGardenPlannerStore((s) => s.setSelectedBoundaryVertexIdx);

  // Gesture tracking refs
  const initialTouchWorldPos = useRef<{ xCm: number; yCm: number }>({ xCm: 0, yCm: 0 });
  const panStartViewOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingObjectRef = useRef(false);
  const dragAccumulatedCm = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setCanvasLayout({ width, height });
        if (!hasAutoFittedRef.current) {
          hasAutoFittedRef.current = true;
          zoomToFit(width, height);
        }
      }
    },
    [zoomToFit],
  );

  // Filtered and sorted visible objects
  const visibleObjects = useMemo(() => {
    return objectIds
      .map((id) => objects[id])
      .filter(
        (o): o is NonNullable<typeof o> =>
          Boolean(o && !o.deleted && layersVisibility[o.layer]),
      );
  }, [objectIds, objects, layersVisibility]);

  // Selected single object
  const singleSelectedObject = useMemo(() => {
    if (selectedIds.length === 1) {
      return objects[selectedIds[0]!] ?? null;
    }
    return null;
  }, [selectedIds, objects]);

  // Screen to World converter
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const xCm = pxToCm(screenX - view.offsetX, view.scale);
      const yCm = pxToCm(screenY - view.offsetY, view.scale);
      return { xCm, yCm };
    },
    [view.offsetX, view.offsetY, view.scale],
  );

  // Hit test for objects
  const hitTestObject = useCallback(
    (worldX: number, worldY: number): string | null => {
      // Iterate from top to bottom (reverse z-order)
      for (let i = visibleObjects.length - 1; i >= 0; i--) {
        const obj = visibleObjects[i]!;
        if (layersLocked[obj.layer]) continue;

        if (obj.type === 'PATH' || obj.type === 'FENCE') {
          // Point near line bounds with tolerance
          const tolerance = 60;
          if (
            worldX >= obj.xCm - tolerance &&
            worldX <= obj.xCm + obj.widthCm + tolerance &&
            worldY >= obj.yCm - tolerance &&
            worldY <= obj.yCm + obj.heightCm + tolerance
          ) {
            return obj.id;
          }
        } else {
          // Bounding box hit
          if (
            worldX >= obj.xCm &&
            worldX <= obj.xCm + obj.widthCm &&
            worldY >= obj.yCm &&
            worldY <= obj.yCm + obj.heightCm
          ) {
            return obj.id;
          }
        }
      }
      return null;
    },
    [visibleObjects, layersLocked],
  );

  // Gestures
  // 1. Pinch for Zooming
  const lastScaleRef = useRef(1);
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      lastScaleRef.current = 1;
    })
    .onUpdate((e) => {
      const factor = e.scale / lastScaleRef.current;
      lastScaleRef.current = e.scale;
      zoomBy(factor, { x: e.focalX, y: e.focalY });
    });

  // 2. Pan for Moving canvas or Dragging selected object
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .onStart((e) => {
      const world = screenToWorld(e.x, e.y);
      initialTouchWorldPos.current = world;
      panStartViewOffset.current = { x: view.offsetX, y: view.offsetY };
      dragAccumulatedCm.current = { dx: 0, dy: 0 };

      // Hit test
      const hitId = hitTestObject(world.xCm, world.yCm);
      if (hitId && selectedIds.includes(hitId)) {
        isDraggingObjectRef.current = true;
        setIsDragging(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        isDraggingObjectRef.current = false;
      }
    })
    .onUpdate((e) => {
      if (isDraggingObjectRef.current && selectedIds.length > 0) {
        const dxCm = pxToCm(e.translationX, view.scale) - dragAccumulatedCm.current.dx;
        const dyCm = pxToCm(e.translationY, view.scale) - dragAccumulatedCm.current.dy;

        if (Math.abs(dxCm) >= 1 || Math.abs(dyCm) >= 1) {
          dragAccumulatedCm.current.dx += dxCm;
          dragAccumulatedCm.current.dy += dyCm;
          moveSelected(dxCm, dyCm);
        }
      } else {
        // Panning the view canvas
        setView({
          offsetX: panStartViewOffset.current.x + e.translationX,
          offsetY: panStartViewOffset.current.y + e.translationY,
        });
      }
    })
    .onEnd(() => {
      if (isDraggingObjectRef.current) {
        isDraggingObjectRef.current = false;
        setIsDragging(false);
        setActiveGuides([]);
      }
    });

  // 3. Tap Gesture
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const world = screenToWorld(e.x, e.y);

      // If drawing line
      if (activeTool === 'draw-line' && lineDrawingState) {
        let ptX = world.xCm;
        let ptY = world.yCm;
        if (grid.snap) {
          ptX = snapValueToGrid(ptX, grid.stepCm);
          ptY = snapValueToGrid(ptY, grid.stepCm);
        }
        addDrawingLinePoint({ xCm: ptX, yCm: ptY });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // If boundary tool
      if (activeTool === 'boundary') {
        const boundary = getEffectiveBoundary(plan);
        const n = boundary.length;
        const hitToleranceCm = 24 / view.scale;

        // Check if tap hit any midpoint '+' to insert a vertex
        for (let i = 0; i < n; i++) {
          const p1 = boundary[i]!;
          const p2 = boundary[(i + 1) % n]!;
          const midX = (p1.xCm + p2.xCm) / 2;
          const midY = (p1.yCm + p2.yCm) / 2;
          const dist = Math.hypot(world.xCm - midX, world.yCm - midY);

          if (dist <= hitToleranceCm) {
            insertBoundaryVertex(i, { xCm: Math.round(midX), yCm: Math.round(midY) });
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            return;
          }
        }

        // Check if tap hit vertex
        for (let i = 0; i < n; i++) {
          const p = boundary[i]!;
          const dist = Math.hypot(world.xCm - p.xCm, world.yCm - p.yCm);
          if (dist <= hitToleranceCm) {
            setSelectedBoundaryVertexIdx(i);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
          }
        }

        setSelectedBoundaryVertexIdx(null);
        return;
      }

      // Default select tool
      const hitId = hitTestObject(world.xCm, world.yCm);
      if (hitId) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeTool === 'multiselect') {
          select(hitId, true);
        } else {
          select(hitId, false);
        }
      } else {
        clearSelection();
      }
    });

  const composedGestures = Gesture.Race(Gesture.Simultaneous(pinchGesture, panGesture), tapGesture);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {canvasLayout ? (
        <GestureDetector gesture={composedGestures}>
          <View style={styles.container}>
            <Svg width={canvasLayout.width} height={canvasLayout.height}>
              <G x={view.offsetX} y={view.offsetY} scale={view.scale}>
                {/* 1. Межі ділянки */}
                <PlotBoundarySvg plan={plan} isDark={isDark} />

                {/* 2. Сітка */}
                {grid.enabled ? (
                  <GridSvg
                    widthCm={plan.widthCm}
                    heightCm={plan.heightCm}
                    gridStepCm={grid.stepCm}
                    isDark={isDark}
                  />
                ) : null}

                {/* 3. Обʼєкти плану */}
                {visibleObjects.map((obj) => (
                  <PlanObjectSvg
                    key={obj.id}
                    object={obj}
                    isSelected={selectedIds.includes(obj.id)}
                    scale={view.scale}
                    isDark={isDark}
                  />
                ))}

                {/* 4. Напрямні магнітної привʼязки */}
                <SnapGuidesSvg guides={activeGuides} scale={view.scale} />

                {/* 5. Вимірювальні лінійки */}
                {settings.showRulers && singleSelectedObject ? (
                  <MeasurementRulersSvg
                    selectedObject={singleSelectedObject}
                    otherObjects={visibleObjects}
                    plotWidthCm={plan.widthCm}
                    plotHeightCm={plan.heightCm}
                    scale={view.scale}
                    isDark={isDark}
                  />
                ) : null}

                {/* 6. Transformer виділення */}
                {singleSelectedObject && activeTool !== 'boundary' && activeTool !== 'draw-line' ? (
                  <TransformerSvg
                    object={singleSelectedObject}
                    scale={view.scale}
                    isDark={isDark}
                  />
                ) : null}

                {/* 7. Редактор меж */}
                {activeTool === 'boundary' ? (
                  <BoundaryEditorSvg
                    boundary={getEffectiveBoundary(plan)}
                    selectedVertexIdx={selectedBoundaryVertexIdx}
                    scale={view.scale}
                    isDark={isDark}
                  />
                ) : null}

                {/* 8. Редактор ліній */}
                <LineEditorSvg
                  selectedObject={singleSelectedObject}
                  lineDrawingState={lineDrawingState}
                  selectedLineVertex={selectedLineVertex}
                  scale={view.scale}
                  isDark={isDark}
                />
              </G>
            </Svg>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
