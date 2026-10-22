import React, { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  G,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { useGardenPlannerStore } from '../../store/use-planner-store';
import type { CanvasPlanObject } from '../../types';
import { getModel3DConfig } from '../../constants/planner-3d-models';
import {
  computeExtrudedBox25D,
  type Point2D,
  pointsToSvgPath,
  projectGroundPolygon25D,
  projectGridLines25D,
  sortObjectsByDepth,
} from '../../utils/projection-25d';
import {
  type CandidateLabel,
  resolveNonOverlappingLabels,
} from '../../utils/label-manager';

interface PlannerCanvas25DProps {
  isDark: boolean;
}

export const PlannerCanvas25D = React.memo(function PlannerCanvas25D({
  isDark,
}: PlannerCanvas25DProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Store bindings
  const planWidthCm = useGardenPlannerStore((s) => s.plan.widthCm);
  const planHeightCm = useGardenPlannerStore((s) => s.plan.heightCm);
  const boundary = useGardenPlannerStore((s) => s.plan.boundary);
  const objects = useGardenPlannerStore((s) => s.objects);
  const objectIds = useGardenPlannerStore((s) => s.objectIds);
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const select = useGardenPlannerStore((s) => s.select);
  const camera3D = useGardenPlannerStore((s) => s.camera3D);
  const setCamera3D = useGardenPlannerStore((s) => s.setCamera3D);

  const planCenter = useMemo(
    () => ({ x: planWidthCm / 2, y: planHeightCm / 2 }),
    [planWidthCm, planHeightCm],
  );

  // Compute base scale to fit plot into screen with nice padding
  const baseScale = useMemo(() => {
    const margin = 80;
    const availW = Math.max(100, screenWidth - margin);
    const availH = Math.max(100, screenHeight - 160);
    return Math.min(availW / planWidthCm, availH / planHeightCm) * 1.25;
  }, [screenWidth, screenHeight, planWidthCm, planHeightCm]);

  // Animated camera shared values
  const yawSV = useSharedValue(camera3D.yawDeg);
  const pitchSV = useSharedValue(camera3D.pitchDeg);
  const scaleSV = useSharedValue(camera3D.distance * baseScale);
  const panX_SV = useSharedValue(screenWidth / 2);
  const panY_SV = useSharedValue(screenHeight / 2 + 30);

  // Sync shared values if store camera changes externally (e.g. presets)
  React.useEffect(() => {
    yawSV.value = withTiming(camera3D.yawDeg, { duration: 300 });
    pitchSV.value = withTiming(camera3D.pitchDeg, { duration: 300 });
    scaleSV.value = withTiming(camera3D.distance * baseScale, { duration: 300 });
  }, [camera3D.yawDeg, camera3D.pitchDeg, camera3D.distance, baseScale, yawSV, pitchSV, scaleSV]);

  // Local state for React render when gesture finishes or camera preset changes
  const [renderYaw, setRenderYaw] = React.useState(camera3D.yawDeg);
  const [renderPitch, setRenderPitch] = React.useState(camera3D.pitchDeg);
  const [renderScale, setRenderScale] = React.useState(camera3D.distance * baseScale);
  const [renderOffset, setRenderOffset] = React.useState<Point2D>({
    x: screenWidth / 2,
    y: screenHeight / 2 + 30,
  });

  const updateCameraState = useCallback(
    (yaw: number, pitch: number, scaleVal: number, offX: number, offY: number) => {
      setRenderYaw(yaw);
      setRenderPitch(pitch);
      setRenderScale(scaleVal);
      setRenderOffset({ x: offX, y: offY });
      setCamera3D({
        yawDeg: Math.round(yaw),
        pitchDeg: Math.round(pitch),
        distance: scaleVal / baseScale,
      });
    },
    [baseScale, setCamera3D],
  );

  // Shared values for tracking gesture start points on UI thread
  const startYawSV = useSharedValue(camera3D.yawDeg);
  const startPitchSV = useSharedValue(camera3D.pitchDeg);
  const startPanX_SV = useSharedValue(screenWidth / 2);
  const startPanY_SV = useSharedValue(screenHeight / 2 + 30);
  const startScaleSV = useSharedValue(baseScale);

  // 1 Finger: Orbit gesture (Rotate yaw + Tilt pitch)
  const orbitGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      'worklet';
      startYawSV.value = yawSV.value;
      startPitchSV.value = pitchSV.value;
    })
    .onUpdate((e) => {
      'worklet';
      yawSV.value = (startYawSV.value + e.translationX * 0.45 + 360) % 360;
      pitchSV.value = Math.max(15, Math.min(85, startPitchSV.value - e.translationY * 0.35));
    })
    .onEnd(() => {
      'worklet';
      runOnJS(updateCameraState)(
        yawSV.value,
        pitchSV.value,
        scaleSV.value,
        panX_SV.value,
        panY_SV.value,
      );
    });

  // 2 Fingers: Pan gesture
  const twoFingerPan = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      'worklet';
      startPanX_SV.value = panX_SV.value;
      startPanY_SV.value = panY_SV.value;
    })
    .onUpdate((e) => {
      'worklet';
      panX_SV.value = startPanX_SV.value + e.translationX;
      panY_SV.value = startPanY_SV.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(updateCameraState)(
        yawSV.value,
        pitchSV.value,
        scaleSV.value,
        panX_SV.value,
        panY_SV.value,
      );
    });

  // 2 Fingers: Pinch to zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      startScaleSV.value = scaleSV.value;
    })
    .onUpdate((e) => {
      'worklet';
      const minS = baseScale * 0.4;
      const maxS = baseScale * 3.5;
      scaleSV.value = Math.max(minS, Math.min(maxS, startScaleSV.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      runOnJS(updateCameraState)(
        yawSV.value,
        pitchSV.value,
        scaleSV.value,
        panX_SV.value,
        panY_SV.value,
      );
    });

  // Double tap to reset camera (North up: yaw = 0, pitch = 45)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      yawSV.value = withTiming(0, { duration: 300 });
      pitchSV.value = withTiming(45, { duration: 300 });
      scaleSV.value = withTiming(baseScale, { duration: 300 });
      panX_SV.value = withTiming(screenWidth / 2, { duration: 300 });
      panY_SV.value = withTiming(screenHeight / 2 + 30, { duration: 300 });

      runOnJS(updateCameraState)(0, 45, baseScale, screenWidth / 2, screenHeight / 2 + 30);
    });

  const composedGestures = Gesture.Simultaneous(
    Gesture.Race(twoFingerPan, orbitGesture),
    pinchGesture,
    doubleTapGesture,
  );

  // Active objects list
  const activeObjects = useMemo(() => {
    return objectIds
      .map((id) => objects[id])
      .filter((obj): obj is CanvasPlanObject => Boolean(obj && !obj.deleted));
  }, [objectIds, objects]);

  // Depth sorted objects
  const depthSortedObjects = useMemo(() => {
    return sortObjectsByDepth(activeObjects, planCenter, renderYaw, renderPitch);
  }, [activeObjects, planCenter, renderYaw, renderPitch]);

  // Projected boundary polygon on ground
  const projectedBoundaryPath = useMemo(() => {
    const rawBoundary =
      boundary && boundary.length >= 3
        ? boundary
        : [
            { xCm: 0, yCm: 0 },
            { xCm: planWidthCm, yCm: 0 },
            { xCm: planWidthCm, yCm: planHeightCm },
            { xCm: 0, yCm: planHeightCm },
          ];

    return projectGroundPolygon25D(
      rawBoundary,
      planCenter,
      renderYaw,
      renderPitch,
      renderScale,
      renderOffset,
    );
  }, [boundary, planWidthCm, planHeightCm, planCenter, renderYaw, renderPitch, renderScale, renderOffset]);

  // Projected grid lines
  const projectedGridPath = useMemo(() => {
    return projectGridLines25D(
      planWidthCm,
      planHeightCm,
      100, // 1m intervals
      planCenter,
      renderYaw,
      renderPitch,
      renderScale,
      renderOffset,
    );
  }, [planWidthCm, planHeightCm, planCenter, renderYaw, renderPitch, renderScale, renderOffset]);

  // Non-overlapping labels manager with screen boundary clamping
  const placedLabels = useMemo(() => {
    const candidates: CandidateLabel[] = depthSortedObjects.map((obj) => {
      const isSelected = selectedIds.includes(obj.id);
      const modelConfig = getModel3DConfig(obj.type);
      const box25D = computeExtrudedBox25D(
        obj,
        modelConfig.heightCm,
        obj.color || modelConfig.defaultColor,
        planCenter,
        renderYaw,
        renderPitch,
        renderScale,
        renderOffset,
      );
      const area = (obj.widthCm * obj.heightCm) / 10000;
      return {
        id: obj.id,
        text: obj.label,
        screenX: box25D.centerProjected.x,
        screenY: box25D.centerProjected.y - 14,
        isSelected,
        priority: isSelected ? 10000 : area,
      };
    });

    return resolveNonOverlappingLabels(
      candidates,
      screenWidth,
      screenHeight,
      12,
      16,
    );
  }, [
    depthSortedObjects,
    selectedIds,
    planCenter,
    renderYaw,
    renderPitch,
    renderScale,
    renderOffset,
    screenWidth,
    screenHeight,
  ]);

  // Theme-tailored colors
  const groundFillColor = isDark ? '#143324' : '#86efac';
  const groundStrokeColor = isDark ? '#34d399' : '#059669';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    width: screenWidth,
    height: screenHeight,
  }));

  return (
    <GestureDetector gesture={composedGestures}>
      <Animated.View style={[styles.container, animatedCanvasStyle]}>
        <Svg width={screenWidth} height={screenHeight}>
          {/* 1. Ground Surface (Triangulated / Projected Boundary) */}
          <Path
            d={projectedBoundaryPath}
            fill={groundFillColor}
            stroke={groundStrokeColor}
            strokeWidth={3}
          />

          {/* 2. Projected Ground Grid */}
          {projectedGridPath ? (
            <Path
              d={projectedGridPath}
              stroke={gridLineColor}
              strokeWidth={1}
            />
          ) : null}

          {/* 3. Depth-sorted Extruded Objects */}
          {depthSortedObjects.map((obj) => {
            const isSelected = selectedIds.includes(obj.id);
            const modelConfig = getModel3DConfig(obj.type);
            const heightCm = modelConfig.heightCm;
            const baseColor = obj.color || modelConfig.defaultColor;

            // Extruded 2.5D box
            const box25D = computeExtrudedBox25D(
              obj,
              heightCm,
              baseColor,
              planCenter,
              renderYaw,
              renderPitch,
              renderScale,
              renderOffset,
            );

            const isTree = obj.type === 'TREE' || obj.type === 'BUSH';

            return (
              <G
                key={obj.id}
                onPress={() => select(obj.id)}
                accessibilityRole="button"
                accessibilityLabel={`${obj.label || obj.type}`}
              >
                {/* Ground Shadow */}
                {box25D.shadowFace && (
                  <Path
                    d={pointsToSvgPath(box25D.shadowFace)}
                    fill="rgba(0,0,0,0.18)"
                  />
                )}

                {/* Side Faces with 3D Shading */}
                {!isTree &&
                  box25D.sideFaces.map((face, fIdx) => (
                    <Polygon
                      key={`face-${fIdx}`}
                      points={face.points.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill={face.color}
                      opacity={face.brightness}
                      stroke={face.color}
                      strokeWidth={0.5}
                    />
                  ))}

                {/* Top Face / Roof */}
                {!isTree && (
                  <Polygon
                    points={box25D.topFace.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill={modelConfig.roofColor || baseColor}
                    stroke={isSelected ? '#10b981' : isDark ? '#ffffff20' : '#00000020'}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                )}

                {/* Special 2.5D rendering for Trees & Bushes */}
                {isTree && (
                  <>
                    {/* Trunk */}
                    {obj.type === 'TREE' && (
                      <Rect
                        x={box25D.centerProjected.x - 3}
                        y={box25D.centerProjected.y}
                        width={6}
                        height={16}
                        fill="#5c3822"
                        rx={2}
                      />
                    )}
                    {/* Crown */}
                    <Circle
                      cx={box25D.centerProjected.x}
                      cy={box25D.centerProjected.y - (obj.type === 'TREE' ? 14 : 0)}
                      r={Math.max(12, (obj.widthCm * renderScale) / 2.2)}
                      fill={baseColor}
                      stroke={isSelected ? '#10b981' : '#14532d'}
                      strokeWidth={isSelected ? 2.5 : 1}
                      opacity={0.92}
                    />
                  </>
                )}

                {/* Selection Highlight Ring */}
                {isSelected && (
                  <Circle
                    cx={box25D.centerProjected.x}
                    cy={box25D.centerProjected.y}
                    r={Math.max(20, (obj.widthCm * renderScale) / 1.8)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4,3"
                  />
                )}
              </G>
            );
          })}

          {/* 4. Non-overlapping Clamped 2.5D Labels Layer with High-Contrast Pill Backgrounds */}
          <G id="labels-layer">
            {placedLabels.map((lbl) => {
              return (
                <G key={`lbl-${lbl.id}`}>
                  <Rect
                    x={lbl.screenX}
                    y={lbl.screenY}
                    width={lbl.width}
                    height={lbl.height}
                    rx={6}
                    fill={
                      isDark
                        ? 'rgba(15, 23, 42, 0.88)'
                        : 'rgba(255, 255, 255, 0.92)'
                    }
                    stroke={
                      lbl.isSelected
                        ? '#10b981'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(0, 0, 0, 0.15)'
                    }
                    strokeWidth={lbl.isSelected ? 2 : 1}
                  />
                  <SvgText
                    x={lbl.screenX + lbl.width / 2}
                    y={lbl.screenY + lbl.height / 2 + 3.5}
                    fill={isDark ? '#f8fafc' : '#0f172a'}
                    fontSize={10}
                    fontWeight={lbl.isSelected ? 'bold' : '600'}
                    textAnchor="middle"
                  >
                    {lbl.text}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
