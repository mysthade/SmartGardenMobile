import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { G, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  getEffectiveBoundary,
  getPolygonSignedArea,
  pxToCm,
  snapValueToGrid,
} from '@smart-garden/validation';
import { Ruler } from 'lucide-react-native';
import { useGardenPlannerStore } from '../../store/use-planner-store';
import { SpatialHashGrid } from '../../utils/spatial-index';
import type { CandidateLabel } from '../../utils/label-manager';
import { resolveNonOverlappingLabels } from '../../utils/label-manager';
import type { CanvasPlanObject } from '../../types';
import { GridSvg } from './GridSvg';
import { PlotBoundarySvg } from './PlotBoundarySvg';
import { PlanObjectSvg } from './PlanObjectSvg';
import { StaticObjectsLayer } from './StaticObjectsLayer';
import { TransformerSvg } from './TransformerSvg';
import { SnapGuidesSvg } from './SnapGuidesSvg';
import { MeasurementRulersSvg } from './MeasurementRulersSvg';
import { MeasurementInteractiveOverlay } from './MeasurementInteractiveOverlay';
import { CadRulersSvg } from './CadRulersSvg';
import { DragLoupeSvg } from './DragLoupeSvg';
import { BoundaryEditorSvg } from './BoundaryEditorSvg';
import { LineEditorSvg } from './LineEditorSvg';
import { PlannerErrorBoundary } from './PlannerErrorBoundary';
import { BoundaryEdgeEditModal } from '../sheets/BoundaryEdgeEditModal';
import { RectanglePlotWizardModal } from '../sheets/RectanglePlotWizardModal';

interface PlannerCanvasProps {
  isDark: boolean;
}

export function PlannerCanvas({ isDark }: PlannerCanvasProps) {
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number } | null>(null);
  const hasAutoFittedRef = useRef(false);

  // Modals state
  const [edgeEditIdx, setEdgeEditIdx] = useState<number | null>(null);
  const [isRectWizardOpen, setIsRectWizardOpen] = useState(false);

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
  const customGuidelines = useGardenPlannerStore((s) => s.customGuidelines);
  const lineDrawingState = useGardenPlannerStore((s) => s.lineDrawingState);
  const selectedLineVertex = useGardenPlannerStore((s) => s.selectedLineVertex);
  const selectedBoundaryVertexIdx = useGardenPlannerStore((s) => s.selectedBoundaryVertexIdx);
  const measurePoints = useGardenPlannerStore((s) => s.measurePoints);
  const pinnedMeasurements = useGardenPlannerStore((s) => s.pinnedMeasurements);
  const areaPoints = useGardenPlannerStore((s) => s.areaPoints);

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
  const finishDrawingLine = useGardenPlannerStore((s) => s.finishDrawingLine);
  const cancelDrawingLine = useGardenPlannerStore((s) => s.cancelDrawingLine);
  const insertBoundaryVertex = useGardenPlannerStore((s) => s.insertBoundaryVertex);
  const setSelectedBoundaryVertexIdx = useGardenPlannerStore((s) => s.setSelectedBoundaryVertexIdx);
  const addMeasurePoint = useGardenPlannerStore((s) => s.addMeasurePoint);
  const clearMeasurePoints = useGardenPlannerStore((s) => s.clearMeasurePoints);
  const saveMeasurePin = useGardenPlannerStore((s) => s.saveMeasurePin);
  const addAreaPoint = useGardenPlannerStore((s) => s.addAreaPoint);
  const clearAreaPoints = useGardenPlannerStore((s) => s.clearAreaPoints);
  const setTool = useGardenPlannerStore((s) => s.setTool);

  // Local drag state for high-performance zero-re-render dragging of static objects
  const [activeDragOffset, setActiveDragOffset] = useState<{ dxCm: number; dyCm: number } | null>(null);
  const [dragTouchScreenPos, setDragTouchScreenPos] = useState<{ x: number; y: number } | null>(null);

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

  // Quantized zoom bucket to prevent re-calculating LOD on tiny sub-pixel scaling
  const zoomBucket = Math.round(view.scale * 10) / 10;

  // Viewport Culling: calculate world bounds visible on screen + 80px margin
  const viewBucket = canvasLayout
    ? `${Math.round(view.offsetX / 40)}_${Math.round(view.offsetY / 40)}_${Math.round(view.scale * 20)}`
    : 'default';

  const visibleObjects = useMemo(() => {
    if (!canvasLayout) {
      return objectIds
        .map((id) => objects[id])
        .filter((o): o is NonNullable<typeof o> => Boolean(o && !o.deleted && layersVisibility[o.layer]));
    }

    const marginPx = 80;
    const minWorldX = pxToCm(-view.offsetX - marginPx, view.scale);
    const minWorldY = pxToCm(-view.offsetY - marginPx, view.scale);
    const maxWorldX = pxToCm(canvasLayout.width - view.offsetX + marginPx, view.scale);
    const maxWorldY = pxToCm(canvasLayout.height - view.offsetY + marginPx, view.scale);

    const selSet = new Set(selectedIds);

    return objectIds
      .map((id) => objects[id])
      .filter((o): o is NonNullable<typeof o> => {
        if (!o || o.deleted || !layersVisibility[o.layer]) return false;
        // Always render selected objects
        if (selSet.has(o.id)) return true;
        // Viewport intersection test
        return (
          o.xCm + o.widthCm >= minWorldX &&
          o.xCm <= maxWorldX &&
          o.yCm + o.heightCm >= minWorldY &&
          o.yCm <= maxWorldY
        );
      });
  }, [
    objectIds,
    objects,
    layersVisibility,
    selectedIds,
    canvasLayout,
    viewBucket,
    view.offsetX,
    view.offsetY,
    view.scale,
  ]);

  // Split visible objects into unselected (static layer) and selected (dynamic layer)
  const { unselectedObjects, selectedObjects } = useMemo(() => {
    const unselected: CanvasPlanObject[] = [];
    const selected: CanvasPlanObject[] = [];
    const selSet = new Set(selectedIds);

    for (const obj of visibleObjects) {
      if (selSet.has(obj.id)) {
        selected.push(obj);
      } else {
        unselected.push(obj);
      }
    }

    return { unselectedObjects: unselected, selectedObjects: selected };
  }, [visibleObjects, selectedIds]);

  // Spatial Hash Grid for fast O(1) neighbor, snap guide, and collision checks
  const spatialGrid = useMemo(() => {
    const gridInstance = new SpatialHashGrid(300);
    gridInstance.rebuild(visibleObjects);
    return gridInstance;
  }, [visibleObjects]);

  // Selected single object
  const singleSelectedObject = useMemo(() => {
    if (selectedIds.length === 1) {
      return objects[selectedIds[0]!] ?? null;
    }
    return null;
  }, [selectedIds, objects]);

  // Rulers nearby neighbors (queries spatial index instead of all 300 objects)
  const nearbyRulerObjects = useMemo(() => {
    if (!singleSelectedObject) return [];
    return spatialGrid.queryNeighbors(singleSelectedObject, 800);
  }, [singleSelectedObject, spatialGrid]);

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
      for (let i = visibleObjects.length - 1; i >= 0; i--) {
        const obj = visibleObjects[i]!;
        if (layersLocked[obj.layer]) continue;

        if (obj.type === 'PATH' || obj.type === 'FENCE') {
          const tolerance = Math.max(40, 24 / view.scale);
          if (
            worldX >= obj.xCm - tolerance &&
            worldX <= obj.xCm + obj.widthCm + tolerance &&
            worldY >= obj.yCm - tolerance &&
            worldY <= obj.yCm + obj.heightCm + tolerance
          ) {
            return obj.id;
          }
        } else {
          // Guaranteed touch zone >= 44 dp
          const paddingCm = Math.max(10, 22 / view.scale);
          if (
            worldX >= obj.xCm - paddingCm &&
            worldX <= obj.xCm + obj.widthCm + paddingCm &&
            worldY >= obj.yCm - paddingCm &&
            worldY <= obj.yCm + obj.heightCm + paddingCm
          ) {
            return obj.id;
          }
        }
      }
      return null;
    },
    [visibleObjects, layersLocked, view.scale],
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
        setActiveDragOffset({ dxCm: 0, dyCm: 0 });
        setDragTouchScreenPos({ x: e.x, y: e.y });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        isDraggingObjectRef.current = false;
        setActiveDragOffset(null);
        setDragTouchScreenPos(null);
      }
    })
    .onUpdate((e) => {
      if (isDraggingObjectRef.current && selectedIds.length > 0) {
        setDragTouchScreenPos({ x: e.x, y: e.y });

        const dragMultiplier = settings.slowDrag ? 0.25 : 1.0;
        let totalDx = pxToCm(e.translationX * dragMultiplier, view.scale);
        let totalDy = pxToCm(e.translationY * dragMultiplier, view.scale);

        if (grid.snap) {
          totalDx = snapValueToGrid(totalDx, grid.stepCm);
          totalDy = snapValueToGrid(totalDy, grid.stepCm);
        }

        // Fast snap guides for primary selected object with threshold in DP
        if (settings.objectSnap && singleSelectedObject) {
          const snapThresholdCm = 12 / view.scale; // ~12 dp threshold
          const virtualObj: CanvasPlanObject = {
            ...singleSelectedObject,
            xCm: singleSelectedObject.xCm + totalDx,
            yCm: singleSelectedObject.yCm + totalDy,
          };
          const { guides, snappedX, snappedY } = spatialGrid.computeSnapGuidesForObject(
            virtualObj,
            plan.widthCm,
            plan.heightCm,
            snapThresholdCm,
          );
          if (guides.length > 0) {
            if (activeGuides.length === 0) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setActiveGuides(guides);
            totalDx = snappedX - singleSelectedObject.xCm;
            totalDy = snappedY - singleSelectedObject.yCm;
          } else {
            setActiveGuides([]);
          }
        }

        dragAccumulatedCm.current = { dx: totalDx, dy: totalDy };
        setActiveDragOffset({ dxCm: totalDx, dyCm: totalDy });
      } else {
        // Panning the view canvas
        setView({
          offsetX: panStartViewOffset.current.x + e.translationX,
          offsetY: panStartViewOffset.current.y + e.translationY,
        });
      }
    })
    .onEnd(() => {
      setDragTouchScreenPos(null);
      if (isDraggingObjectRef.current) {
        isDraggingObjectRef.current = false;
        setIsDragging(false);
        setActiveGuides([]);

        const finalDx = dragAccumulatedCm.current.dx;
        const finalDy = dragAccumulatedCm.current.dy;
        setActiveDragOffset(null);

        // Commit transform to Zustand store ONCE at end of gesture
        if (Math.abs(finalDx) >= 1 || Math.abs(finalDy) >= 1) {
          moveSelected(finalDx, finalDy);
        }
      }
    });

  // 3. Tap Gesture
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const world = screenToWorld(e.x, e.y);

      // Measure tool tap: snaps to object corners/centers if within 20 dp
      if (activeTool === 'measure') {
        let tapX = world.xCm;
        let tapY = world.yCm;
        const snapRadius = 18 / view.scale;

        for (const obj of visibleObjects) {
          const corners = [
            { x: obj.xCm, y: obj.yCm },
            { x: obj.xCm + obj.widthCm, y: obj.yCm },
            { x: obj.xCm + obj.widthCm, y: obj.yCm + obj.heightCm },
            { x: obj.xCm, y: obj.yCm + obj.heightCm },
            { x: obj.xCm + obj.widthCm / 2, y: obj.yCm + obj.heightCm / 2 },
          ];
          for (const c of corners) {
            if (Math.hypot(c.x - world.xCm, c.y - world.yCm) <= snapRadius) {
              tapX = c.x;
              tapY = c.y;
              break;
            }
          }
        }

        addMeasurePoint({ xCm: Math.round(tapX), yCm: Math.round(tapY) });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Area tool tap
      if (activeTool === 'area') {
        addAreaPoint({ xCm: Math.round(world.xCm), yCm: Math.round(world.yCm) });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Drawing line tool tap
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

      // Boundary tool tap
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
            setEdgeEditIdx(i);
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

  // Dynamic selected object with drag offset if currently being dragged
  const transformedSingleSelectedObject = useMemo(() => {
    if (!singleSelectedObject) return null;
    if (!activeDragOffset) return singleSelectedObject;
    return {
      ...singleSelectedObject,
      xCm: singleSelectedObject.xCm + activeDragOffset.dxCm,
      yCm: singleSelectedObject.yCm + activeDragOffset.dyCm,
    };
  }, [singleSelectedObject, activeDragOffset]);

  // Non-Overlapping Clamped Labels for CAD clarity
  const placedLabels = useMemo(() => {
    if (!canvasLayout) return [];
    const candidates: CandidateLabel[] = visibleObjects.map((obj) => {
      const screenX = (obj.xCm + obj.widthCm / 2) * view.scale + view.offsetX;
      const screenY = (obj.yCm + obj.heightCm / 2) * view.scale + view.offsetY;
      const isSel = selectedIds.includes(obj.id);
      const area = (obj.widthCm * obj.heightCm) / 10000;
      return {
        id: obj.id,
        text: obj.label,
        screenX,
        screenY,
        isSelected: isSel,
        priority: isSel ? 10000 : area,
      };
    });

    return resolveNonOverlappingLabels(
      candidates,
      canvasLayout.width,
      canvasLayout.height,
      12,
      16,
    );
  }, [visibleObjects, selectedIds, view.scale, view.offsetX, view.offsetY, canvasLayout]);

  // Total measurement distance
  const totalMeasureDistanceM = useMemo(() => {
    if (measurePoints.length < 2) return '0.00';
    let sumCm = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      const p1 = measurePoints[i]!;
      const p2 = measurePoints[i + 1]!;
      sumCm += Math.hypot(p2.xCm - p1.xCm, p2.yCm - p1.yCm);
    }
    return (sumCm / 100).toFixed(2);
  }, [measurePoints]);

  // Polygon Area calculation
  const totalAreaM2 = useMemo(() => {
    if (areaPoints.length < 3) return '0.00';
    const signedAreaCm2 = getPolygonSignedArea(areaPoints);
    return (Math.abs(signedAreaCm2) / 10000).toFixed(2);
  }, [areaPoints]);

  return (
    <PlannerErrorBoundary isDark={isDark} onReset={() => zoomToFit(canvasLayout?.width || 800, canvasLayout?.height || 600)}>
      <View style={styles.container} onLayout={onLayout}>
        {canvasLayout ? (
          <GestureDetector gesture={composedGestures}>
            <View style={styles.container}>
              <Svg width={canvasLayout.width} height={canvasLayout.height}>
                <G x={view.offsetX} y={view.offsetY} scale={view.scale}>
                  {/* 1. Межі ділянки */}
                  <PlotBoundarySvg plan={plan} scale={view.scale} isDark={isDark} />

                  {/* 2. Сітка */}
                  {grid.enabled ? (
                    <GridSvg
                      widthCm={plan.widthCm}
                      heightCm={plan.heightCm}
                      gridStepCm={grid.stepCm}
                      scale={view.scale}
                      isDark={isDark}
                    />
                  ) : null}

                  {/* 3. Custom guidelines */}
                  {customGuidelines.map((cg) => {
                    const isVert = cg.type === 'vertical';
                    return (
                      <Line
                        key={cg.id}
                        x1={isVert ? cg.posCm : 0}
                        y1={isVert ? 0 : cg.posCm}
                        x2={isVert ? cg.posCm : plan.widthCm}
                        y2={isVert ? plan.heightCm : cg.posCm}
                        stroke="#06b6d4"
                        strokeWidth={Math.max(1, 1.5 / view.scale)}
                        strokeDasharray={`${6 / view.scale},${4 / view.scale}`}
                      />
                    );
                  })}

                  {/* 4. Статичний шар (не вибрані обʼєкти) */}
                  <StaticObjectsLayer
                    objects={unselectedObjects}
                    scale={view.scale}
                    zoomBucket={zoomBucket}
                    isDark={isDark}
                  />

                  {/* 5. Динамічний шар (вибрані / перетягувані обʼєкти) */}
                  {selectedObjects.map((obj) => {
                    const renderObj = activeDragOffset
                      ? {
                          ...obj,
                          xCm: obj.xCm + activeDragOffset.dxCm,
                          yCm: obj.yCm + activeDragOffset.dyCm,
                        }
                      : obj;

                    return (
                      <PlanObjectSvg
                        key={obj.id}
                        object={renderObj}
                        isSelected={true}
                        scale={view.scale}
                        zoomBucket={zoomBucket}
                        isDark={isDark}
                      />
                    );
                  })}

                  {/* 6. Напрямні магнітної привʼязки */}
                  <SnapGuidesSvg guides={activeGuides} scale={view.scale} />

                  {/* 7. Вимірювальні лінійки */}
                  {settings.showRulers && transformedSingleSelectedObject ? (
                    <MeasurementRulersSvg
                      selectedObject={transformedSingleSelectedObject}
                      otherObjects={nearbyRulerObjects}
                      plotWidthCm={plan.widthCm}
                      plotHeightCm={plan.heightCm}
                      scale={view.scale}
                      isDark={isDark}
                    />
                  ) : null}

                  {/* 8. Transformer виділення */}
                  {transformedSingleSelectedObject && activeTool !== 'boundary' && activeTool !== 'draw-line' ? (
                    <TransformerSvg
                      object={transformedSingleSelectedObject}
                      scale={view.scale}
                      isDark={isDark}
                    />
                  ) : null}

                  {/* 9. Редактор меж */}
                  {activeTool === 'boundary' ? (
                    <BoundaryEditorSvg
                      boundary={getEffectiveBoundary(plan)}
                      selectedVertexIdx={selectedBoundaryVertexIdx}
                      scale={view.scale}
                      isDark={isDark}
                    />
                  ) : null}

                  {/* 10. Редактор ліній */}
                  <LineEditorSvg
                    selectedObject={transformedSingleSelectedObject}
                    lineDrawingState={lineDrawingState}
                    selectedLineVertex={selectedLineVertex}
                    scale={view.scale}
                    isDark={isDark}
                  />

                  {/* 11. Інтерактивні вимірювання (measure / area modes + pinned pins) */}
                  <MeasurementInteractiveOverlay
                    activeTool={activeTool}
                    points={activeTool === 'area' ? areaPoints : measurePoints}
                    pinnedMeasurements={pinnedMeasurements}
                    scale={view.scale}
                    isDark={isDark}
                  />
                </G>
              </Svg>

              {/* CAD Rulers along Canvas Edges */}
              {settings.showRulers && canvasLayout ? (
                <CadRulersSvg
                  width={canvasLayout.width}
                  height={canvasLayout.height}
                  offsetX={view.offsetX}
                  offsetY={view.offsetY}
                  scale={view.scale}
                  isDark={isDark}
                />
              ) : null}

              {/* Magnifier Loupe during object drag */}
              {dragTouchScreenPos && transformedSingleSelectedObject ? (
                <DragLoupeSvg
                  touchScreenX={dragTouchScreenPos.x}
                  touchScreenY={dragTouchScreenPos.y}
                  object={transformedSingleSelectedObject}
                  scale={view.scale}
                  offsetX={view.offsetX}
                  offsetY={view.offsetY}
                  isDark={isDark}
                />
              ) : null}

              {/* CAD Screen-Clamped Non-Overlapping Labels */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {placedLabels.map((lbl) => (
                  <View
                    key={`cad-lbl-${lbl.id}`}
                    style={[
                      styles.screenLabelBackdrop,
                      {
                        left: lbl.screenX,
                        top: lbl.screenY,
                        backgroundColor: lbl.isSelected
                          ? '#059669'
                          : isDark
                            ? 'rgba(15, 23, 42, 0.88)'
                            : 'rgba(255, 255, 255, 0.92)',
                        borderColor: lbl.isSelected
                          ? '#34d399'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.20)'
                            : 'rgba(0, 0, 0, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.screenLabelText,
                        { color: lbl.isSelected ? '#ffffff' : isDark ? '#f8fafc' : '#0f172a' },
                      ]}
                      numberOfLines={1}
                    >
                      {lbl.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Floating Active Tool Action Pills */}
              {activeTool === 'measure' && (
                <View style={[styles.toolPill, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                  <Ruler size={16} color="#0ea5e9" style={{ marginRight: 6 }} />
                  <Text style={[styles.toolPillText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    Довжина: <Text style={{ fontWeight: '700' }}>{totalMeasureDistanceM} м</Text> ({measurePoints.length} точок)
                  </Text>
                  {measurePoints.length >= 2 && (
                    <Pressable style={styles.pillActionBtn} onPress={() => saveMeasurePin()}>
                      <Text style={styles.pillActionBtnText}>Зберегти мітку</Text>
                    </Pressable>
                  )}
                  {measurePoints.length > 0 && (
                    <Pressable style={styles.pillActionBtn} onPress={clearMeasurePoints}>
                      <Text style={styles.pillActionBtnText}>Очистити</Text>
                    </Pressable>
                  )}
                  <Pressable style={[styles.pillActionBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => setTool('select')}>
                    <Text style={[styles.pillActionBtnText, { color: '#ffffff' }]}>Готово</Text>
                  </Pressable>
                </View>
              )}

              {activeTool === 'area' && (
                <View style={[styles.toolPill, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                  <Text style={[styles.toolPillText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    Площа: <Text style={{ fontWeight: '700', color: '#10b981' }}>{totalAreaM2} м²</Text> ({areaPoints.length} точок)
                  </Text>
                  {areaPoints.length > 0 && (
                    <Pressable style={styles.pillActionBtn} onPress={clearAreaPoints}>
                      <Text style={styles.pillActionBtnText}>Очистити</Text>
                    </Pressable>
                  )}
                  <Pressable style={[styles.pillActionBtn, { backgroundColor: '#10b981' }]} onPress={() => setTool('select')}>
                    <Text style={[styles.pillActionBtnText, { color: '#ffffff' }]}>Готово</Text>
                  </Pressable>
                </View>
              )}

              {activeTool === 'boundary' && (
                <View style={[styles.toolPill, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                  <Pressable style={styles.pillActionBtn} onPress={() => setIsRectWizardOpen(true)}>
                    <Text style={styles.pillActionBtnText}>Прямокутник Ш × Д</Text>
                  </Pressable>
                  {selectedBoundaryVertexIdx !== null && (
                    <Pressable style={styles.pillActionBtn} onPress={() => setEdgeEditIdx(selectedBoundaryVertexIdx)}>
                      <Text style={styles.pillActionBtnText}>Редагувати сторону</Text>
                    </Pressable>
                  )}
                  <Pressable style={[styles.pillActionBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => setTool('select')}>
                    <Text style={[styles.pillActionBtnText, { color: '#ffffff' }]}>Готово</Text>
                  </Pressable>
                </View>
              )}

              {activeTool === 'draw-line' && lineDrawingState && (
                <View style={[styles.toolPill, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                  <Text style={[styles.toolPillText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    Лінія: {lineDrawingState.points.length} точок
                  </Text>
                  <Pressable style={[styles.pillActionBtn, { backgroundColor: '#10b981' }]} onPress={finishDrawingLine}>
                    <Text style={[styles.pillActionBtnText, { color: '#ffffff' }]}>Завершити</Text>
                  </Pressable>
                  <Pressable style={styles.pillActionBtn} onPress={cancelDrawingLine}>
                    <Text style={styles.pillActionBtnText}>Скасувати</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </GestureDetector>
        ) : null}

        {/* Boundary Edge Modal */}
        <BoundaryEdgeEditModal
          visible={edgeEditIdx !== null}
          edgeIndex={edgeEditIdx}
          onClose={() => setEdgeEditIdx(null)}
          isDark={isDark}
        />

        {/* Rectangle Plot Wizard Modal */}
        <RectanglePlotWizardModal
          visible={isRectWizardOpen}
          onClose={() => setIsRectWizardOpen(false)}
          onApplied={() => {
            if (canvasLayout) {
              zoomToFit(canvasLayout.width, canvasLayout.height);
            }
          }}
          isDark={isDark}
        />
      </View>
    </PlannerErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  screenLabelBackdrop: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  screenLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toolPill: {
    position: 'absolute',
    top: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
  },
  toolPillText: {
    fontSize: 13,
  },
  pillActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  pillActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
