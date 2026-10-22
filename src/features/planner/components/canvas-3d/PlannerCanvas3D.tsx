import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  LogBox,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Crosshair, Move, Rotate3d, Sliders } from 'lucide-react-native';

LogBox.ignoreLogs([
  'WARNING: Multiple instances of Three.js being imported.',
  'THREE.WebGLRenderer: WEBGL_lose_context extension not supported.',
  'THREE.WebGLProgram: Program Info Log',
]);
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useGardenPlannerStore } from '../../store/use-planner-store';
import { GroundPlane3D } from './GroundPlane3D';
import { InstancedScene3D } from './InstancedScene3D';
import type { CanvasPlanObject } from '../../types';
import {
  AdaptiveQualityMonitor,
  QUALITY_PROFILES,
  type QualityTier,
} from '../../utils/adaptive-quality';
import {
  type CandidateLabel,
  type PlacedLabel,
  resolveNonOverlappingLabels,
} from '../../utils/label-manager';

interface PlannerCanvas3DProps {
  isDark: boolean;
  onFallbackTo25D?: () => void;
  onOpenProperties?: () => void;
}

// Controller inside Three.js context: handles camera animation, frame-limiting, and label projection
function SceneCameraController({
  maxDimM,
  planWidthM,
  planDepthM,
  yawDeg,
  pitchDeg,
  distance,
  targetXCm,
  targetYCm,
  qualityTier,
  objects,
  selectedIds,
  screenWidth,
  screenHeight,
  onRecordFrame,
  onContextLost,
  onUpdateLabels,
}: {
  maxDimM: number;
  planWidthM: number;
  planDepthM: number;
  yawDeg: number;
  pitchDeg: number;
  distance: number;
  targetXCm: number;
  targetYCm: number;
  qualityTier: QualityTier;
  objects: CanvasPlanObject[];
  selectedIds: string[];
  screenWidth: number;
  screenHeight: number;
  onRecordFrame: (now: number) => void;
  onContextLost: () => void;
  onUpdateLabels: (labels: PlacedLabel[]) => void;
}) {
  const { camera, invalidate, gl, scene } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const lastRenderTime = useRef(0);
  const lastLabelTime = useRef(0);
  const _projVec = useRef(new THREE.Vector3()).current;

  // WebGL context lost listener & cleanup
  useEffect(() => {
    const canvasDom = gl.domElement;
    if (!canvasDom) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onContextLost();
    };

    if (typeof canvasDom.addEventListener === 'function') {
      canvasDom.addEventListener('webglcontextlost', handleContextLost as EventListener);
    }
    return () => {
      if (typeof canvasDom.removeEventListener === 'function') {
        canvasDom.removeEventListener('webglcontextlost', handleContextLost as EventListener);
      }
      // Clean up geometries and materials in scene on unmount
      scene.traverse((child) => {
        if ('geometry' in child && child.geometry instanceof THREE.BufferGeometry) {
          child.geometry.dispose();
        }
        if ('material' in child) {
          const mat = child.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else if (mat && typeof mat.dispose === 'function') {
            mat.dispose();
          }
        }
      });
    };
  }, [gl, scene, onContextLost]);

  // Spherical camera coordinate update with target panning support
  useEffect(() => {
    const targetXM = (targetXCm || 0) / 100;
    const targetZM = (targetYCm || 0) / 100;

    // Radius from focal target: distance factor scales from 0.08 (close-up) to 4.5 (panoramic)
    const r = Math.max(2.5, maxDimM * 1.35) * Math.max(0.08, Math.min(4.5, distance));
    const radYaw = (yawDeg * Math.PI) / 180;
    // Allow pitch from 2° (ground-level walking perspective) to 89° (overhead bird's eye)
    const radPitch = (Math.max(2, Math.min(89, pitchDeg)) * Math.PI) / 180;

    const x = r * Math.cos(radPitch) * Math.sin(radYaw);
    const y = Math.max(0.2, r * Math.sin(radPitch));
    const z = r * Math.cos(radPitch) * Math.cos(radYaw);

    targetPos.current.set(targetXM + x, y, targetZM + z);
    lookTarget.current.set(targetXM, Math.min(y * 0.25, 1.2), targetZM);
    invalidate();
  }, [maxDimM, yawDeg, pitchDeg, distance, targetXCm, targetYCm, invalidate]);

  useFrame(() => {
    const now = performance.now();
    onRecordFrame(now);

    // Frame budget cap: 30 FPS on low tier to prevent device overheating
    if (qualityTier === 'low') {
      const elapsed = now - lastRenderTime.current;
      if (elapsed < 32) return;
      lastRenderTime.current = now;
    }

    const posDist = camera.position.distanceTo(targetPos.current);
    const lookDist = currentLookAt.current.distanceTo(lookTarget.current);

    if (posDist > 0.02 || lookDist > 0.02) {
      camera.position.lerp(targetPos.current, 0.22);
      currentLookAt.current.lerp(lookTarget.current, 0.22);
      camera.lookAt(currentLookAt.current);
      invalidate();
    }

    // Project 3D labels at ~10 FPS for max performance
    if (now - lastLabelTime.current > 100 && objects.length > 0) {
      lastLabelTime.current = now;

      const candidates: CandidateLabel[] = [];
      const selSet = new Set(selectedIds);

      // Prioritize selected objects and significant objects
      const objectsToProject = objects.slice(0, 24);

      for (const obj of objectsToProject) {
        const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
        const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;
        const heightM = Math.max(1.0, (obj.heightCm || 100) / 100);

        _projVec.set(sceneX, heightM + 0.3, sceneZ);
        _projVec.project(camera);

        // Behind camera check
        if (_projVec.z > 1.0) continue;

        const screenX = ((_projVec.x + 1) / 2) * screenWidth;
        const screenY = ((-_projVec.y + 1) / 2) * screenHeight;

        const isSelected = selSet.has(obj.id);
        const area = (obj.widthCm * obj.heightCm) / 10000;

        candidates.push({
          id: obj.id,
          text: obj.label,
          screenX,
          screenY,
          isSelected,
          priority: isSelected ? 10000 : area,
        });
      }

      const placed = resolveNonOverlappingLabels(
        candidates,
        screenWidth,
        screenHeight,
        12,
        14,
      );
      onUpdateLabels(placed);
    }
  });

  return null;
}

export default function PlannerCanvas3D({
  isDark,
  onFallbackTo25D,
  onOpenProperties,
}: PlannerCanvas3DProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Store data
  const planWidthCm = useGardenPlannerStore((s) => s.plan.widthCm);
  const planHeightCm = useGardenPlannerStore((s) => s.plan.heightCm);
  const boundary = useGardenPlannerStore((s) => s.plan.boundary);
  const objects = useGardenPlannerStore((s) => s.objects);
  const objectIds = useGardenPlannerStore((s) => s.objectIds);
  const selectedIds = useGardenPlannerStore((s) => s.selectedIds);
  const select = useGardenPlannerStore((s) => s.select);
  const clearSelection = useGardenPlannerStore((s) => s.clearSelection);
  const camera3D = useGardenPlannerStore((s) => s.camera3D);
  const setCamera3D = useGardenPlannerStore((s) => s.setCamera3D);

  const planWidthM = planWidthCm / 100;
  const planDepthM = planHeightCm / 100;
  const maxDimM = Math.max(planWidthM, planDepthM, 15);

  // Free camera control mode: 'orbit' (1-finger rotates, 2-finger pans) or 'pan' (1-finger pans, 2-finger rotates)
  const [cameraMode, setCameraMode] = useState<'orbit' | 'pan'>('orbit');

  // Projected non-overlapping labels state
  const [placedLabels, setPlacedLabels] = useState<PlacedLabel[]>([]);

  // Adaptive Quality Profiler state
  const [qualityTier, setQualityTier] = useState<QualityTier>('medium');
  const [suggest25D, setSuggest25D] = useState(false);

  const qualityMonitor = useRef(
    new AdaptiveQualityMonitor(
      'medium',
      (newTier) => setQualityTier(newTier),
      () => setSuggest25D(true),
    ),
  ).current;

  const currentProfile = QUALITY_PROFILES[qualityTier];

  // Pause rendering when app goes to background
  const [isActive, setIsActive] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      setIsActive(nextState === 'active');
    });
    return () => {
      sub.remove();
    };
  }, []);

  // Filter active objects
  const activeObjects = useMemo(() => {
    return objectIds
      .map((id) => objects[id])
      .filter((obj): obj is CanvasPlanObject => Boolean(obj && !obj.deleted));
  }, [objectIds, objects]);

  // Selected single object details
  const singleSelectedObject = useMemo(() => {
    if (selectedIds.length === 1 && selectedIds[0]) {
      return objects[selectedIds[0]] || null;
    }
    return null;
  }, [selectedIds, objects]);

  // Gestures for 3D navigation
  const startYawRef = useRef(camera3D.yawDeg);
  const startPitchRef = useRef(camera3D.pitchDeg);
  const startDistRef = useRef(camera3D.distance);
  const startTargetXRef = useRef(camera3D.targetX || 0);
  const startTargetYRef = useRef(camera3D.targetY || 0);

  // Helper to compute world pan delta from screen displacement
  const computePanDelta = useCallback(
    (transX: number, transY: number) => {
      const radYaw = ((camera3D.yawDeg || 0) * Math.PI) / 180;
      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);

      // Sensitivity factor scaled by zoom distance
      const factor = Math.max(0.2, camera3D.distance || 1.0) * 0.055;

      const dxScreen = -transX * factor;
      const dyScreen = -transY * factor;

      // Project onto ground X and Z axes relative to camera heading
      const dX = dxScreen * cosY + dyScreen * sinY;
      const dZ = -dxScreen * sinY + dyScreen * cosY;

      return { dXCm: dX * 100, dZCm: dZ * 100 };
    },
    [camera3D.yawDeg, camera3D.distance],
  );

  // 1 Finger Gesture: Orbit (when in 'orbit' mode) or Pan (when in 'pan' mode)
  const singleFingerGesture = Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    .onStart(() => {
      startYawRef.current = camera3D.yawDeg;
      startPitchRef.current = camera3D.pitchDeg;
      startTargetXRef.current = camera3D.targetX || 0;
      startTargetYRef.current = camera3D.targetY || 0;
    })
    .onUpdate((e) => {
      if (cameraMode === 'orbit') {
        const nextYaw = (startYawRef.current + e.translationX * 0.45 + 360) % 360;
        const nextPitch = Math.max(2, Math.min(89, startPitchRef.current - e.translationY * 0.35));
        setCamera3D({ yawDeg: Math.round(nextYaw), pitchDeg: Math.round(nextPitch) });
      } else {
        const { dXCm, dZCm } = computePanDelta(e.translationX, e.translationY);
        const maxRangeCm = Math.max(planWidthCm, planHeightCm, 4000);
        const clampedX = Math.max(-maxRangeCm, Math.min(maxRangeCm, startTargetXRef.current + dXCm));
        const clampedY = Math.max(-maxRangeCm, Math.min(maxRangeCm, startTargetYRef.current + dZCm));
        setCamera3D({ targetX: Math.round(clampedX), targetY: Math.round(clampedY) });
      }
    });

  // 2 Fingers Pan Gesture (Always available regardless of single-finger mode)
  const twoFingerPanGesture = Gesture.Pan()
    .runOnJS(true)
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      startTargetXRef.current = camera3D.targetX || 0;
      startTargetYRef.current = camera3D.targetY || 0;
      startYawRef.current = camera3D.yawDeg;
      startPitchRef.current = camera3D.pitchDeg;
    })
    .onUpdate((e) => {
      if (cameraMode === 'orbit') {
        // Two fingers pan when primary is orbit
        const { dXCm, dZCm } = computePanDelta(e.translationX, e.translationY);
        const maxRangeCm = Math.max(planWidthCm, planHeightCm, 4000);
        const clampedX = Math.max(-maxRangeCm, Math.min(maxRangeCm, startTargetXRef.current + dXCm));
        const clampedY = Math.max(-maxRangeCm, Math.min(maxRangeCm, startTargetYRef.current + dZCm));
        setCamera3D({ targetX: Math.round(clampedX), targetY: Math.round(clampedY) });
      } else {
        // Two fingers orbit when primary is pan
        const nextYaw = (startYawRef.current + e.translationX * 0.45 + 360) % 360;
        const nextPitch = Math.max(2, Math.min(89, startPitchRef.current - e.translationY * 0.35));
        setCamera3D({ yawDeg: Math.round(nextYaw), pitchDeg: Math.round(nextPitch) });
      }
    });

  // 2 Fingers Pinch: Zoom in / zoom out
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      startDistRef.current = camera3D.distance;
    })
    .onUpdate((e) => {
      const nextDist = Math.max(0.08, Math.min(4.5, startDistRef.current / e.scale));
      setCamera3D({ distance: nextDist });
    });

  // Double tap to reset camera (North up, isometric angle, re-centered on plot)
  const doubleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd(() => {
      setCamera3D({
        yawDeg: 0,
        pitchDeg: 45,
        distance: 1.0,
        targetX: 0,
        targetY: 0,
      });
    });

  const composedGestures = Gesture.Simultaneous(
    Gesture.Race(twoFingerPanGesture, singleFingerGesture),
    pinchGesture,
    doubleTapGesture,
  );

  // When selecting an object, automatically center camera target on it for 360° close inspection
  const handleSelectObject = useCallback(
    (id: string) => {
      select(id);
      const obj = objects[id];
      if (obj) {
        const objCenterCmX = obj.xCm + obj.widthCm / 2 - planWidthCm / 2;
        const objCenterCmY = obj.yCm + obj.heightCm / 2 - planHeightCm / 2;
        setCamera3D({
          targetX: Math.round(objCenterCmX),
          targetY: Math.round(objCenterCmY),
        });
      }
    },
    [select, objects, planWidthCm, planHeightCm, setCamera3D],
  );

  const handleRecordFrame = useCallback(
    (now: number) => {
      qualityMonitor.recordFrame(now);
    },
    [qualityMonitor],
  );

  const handleContextLost = useCallback(() => {
    if (onFallbackTo25D) {
      onFallbackTo25D();
    }
  }, [onFallbackTo25D]);

  // Check if camera target has panned away from garden center
  const isPannedAway =
    Math.abs(camera3D.targetX || 0) > 40 || Math.abs(camera3D.targetY || 0) > 40;

  if (!isActive) {
    return <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]} />;
  }

  return (
    <GestureDetector gesture={composedGestures}>
      <View style={styles.container}>
        <Canvas
          frameloop="demand"
          camera={{
            fov: 45,
            near: 0.1,
            far: 1400,
            position: [0, maxDimM * 1.0, maxDimM * 1.0],
          }}
          gl={{
            antialias: currentProfile.antialias,
            powerPreference: 'high-performance',
          }}
          style={StyleSheet.absoluteFill}
        >
          {/* Soft background horizon color */}
          <color attach="background" args={[isDark ? '#0b1913' : '#eaf4ee']} />

          {/* Internal Scene & Camera Controller */}
          <SceneCameraController
            maxDimM={maxDimM}
            planWidthM={planWidthM}
            planDepthM={planDepthM}
            yawDeg={camera3D.yawDeg}
            pitchDeg={camera3D.pitchDeg}
            distance={camera3D.distance}
            targetXCm={camera3D.targetX || 0}
            targetYCm={camera3D.targetY || 0}
            qualityTier={qualityTier}
            objects={activeObjects}
            selectedIds={selectedIds}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            onRecordFrame={handleRecordFrame}
            onContextLost={handleContextLost}
            onUpdateLabels={setPlacedLabels}
          />

          {/* Natural hemisphere lighting (Sky + Ground fill) */}
          <hemisphereLight
            args={[
              isDark ? '#334155' : '#e0f2fe',
              isDark ? '#0f172a' : '#14532d',
              isDark ? 0.8 : 0.95,
            ]}
          />
          <directionalLight
            position={[maxDimM * 0.9, maxDimM * 1.5, maxDimM * 0.6]}
            intensity={isDark ? 0.9 : 1.15}
          />

          {/* Ground Plane with ribbon boundary and grid */}
          <GroundPlane3D
            widthM={planWidthM}
            depthM={planDepthM}
            boundary={boundary}
            isDark={isDark}
          />

          {/* Batch Instanced 3D Mesh */}
          <InstancedScene3D
            objects={activeObjects}
            planWidthM={planWidthM}
            planDepthM={planDepthM}
            selectedIds={selectedIds}
            qualityTier={qualityTier}
            onSelect={handleSelectObject}
          />
        </Canvas>

        {/* 3D Projected Non-Overlapping Labels Overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {placedLabels.map((lbl) => (
            <View
              key={lbl.id}
              style={[
                styles.labelPill,
                {
                  left: lbl.screenX,
                  top: lbl.screenY,
                  backgroundColor: isDark
                    ? 'rgba(15, 23, 42, 0.88)'
                    : 'rgba(255, 255, 255, 0.92)',
                  borderColor: lbl.isSelected
                    ? '#10b981'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'rgba(0, 0, 0, 0.15)',
                  borderWidth: lbl.isSelected ? 2 : 1,
                },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                style={[
                  styles.labelText,
                  {
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontWeight: lbl.isSelected ? '700' : '600',
                  },
                ]}
              >
                {lbl.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Floating Free Camera HUD: Mode Toggle (Orbit / Pan) + Re-center button */}
        <View style={styles.cameraHudContainer} pointerEvents="box-none">
          <View
            style={[
              styles.modeTogglePill,
              {
                backgroundColor: isDark
                  ? 'rgba(30, 41, 59, 0.92)'
                  : 'rgba(255, 255, 255, 0.94)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          >
            <Pressable
              style={[styles.modeOption, cameraMode === 'orbit' && styles.modeOptionActive]}
              onPress={() => setCameraMode('orbit')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Режим вільного обертання камери"
            >
              <Rotate3d
                size={14}
                color={cameraMode === 'orbit' ? '#fff' : isDark ? '#94a3b8' : '#64748b'}
              />
              <Text
                style={[
                  styles.modeOptionText,
                  { color: cameraMode === 'orbit' ? '#fff' : isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Обертання
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modeOption, cameraMode === 'pan' && styles.modeOptionActive]}
              onPress={() => setCameraMode('pan')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Режим переміщення (пан) камери"
            >
              <Move
                size={14}
                color={cameraMode === 'pan' ? '#fff' : isDark ? '#94a3b8' : '#64748b'}
              />
              <Text
                style={[
                  styles.modeOptionText,
                  { color: cameraMode === 'pan' ? '#fff' : isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Пан
              </Text>
            </Pressable>
          </View>

          {/* Quick Re-center target button (shown if target is panned away from garden center) */}
          {isPannedAway && (
            <Pressable
              style={[
                styles.recenterBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(30, 41, 59, 0.92)'
                    : 'rgba(255, 255, 255, 0.94)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                },
              ]}
              onPress={() => setCamera3D({ targetX: 0, targetY: 0 })}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Повернути камеру до центру ділянки"
            >
              <Crosshair size={13} color="#10b981" />
              <Text
                style={[
                  styles.recenterText,
                  { color: isDark ? '#e2e8f0' : '#1e293b' },
                ]}
              >
                До центру
              </Text>
            </Pressable>
          )}
        </View>

        {/* Selected Object Action Pill */}
        {singleSelectedObject && (
          <View
            style={[
              styles.selectedActionCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          >
            <View
              style={[
                styles.selectedDot,
                { backgroundColor: singleSelectedObject.color || '#10b981' },
              ]}
            />
            <Text
              style={[styles.selectedTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}
              numberOfLines={1}
            >
              {singleSelectedObject.label}
            </Text>
            {onOpenProperties && (
              <Pressable
                style={styles.propsBtn}
                onPress={onOpenProperties}
                accessibilityRole="button"
                accessibilityLabel="Відкрити властивості обʼєкта"
              >
                <Sliders size={14} color="#fff" />
                <Text style={styles.propsBtnText}>Властивості</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.deselectBtn}
              onPress={clearSelection}
              accessibilityRole="button"
              accessibilityLabel="Зняти вибір"
            >
              <Text style={styles.deselectBtnText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Suggestion banner if device framerate drops on lowest tier */}
        {suggest25D && onFallbackTo25D && (
          <View
            style={[
              styles.suggestionBanner,
              { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)' },
            ]}
          >
            <Text
              style={[
                styles.suggestionText,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              Для кращої швидкості рекомендуємо 2.5D
            </Text>
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setSuggest25D(false);
                onFallbackTo25D();
              }}
              accessibilityRole="button"
              accessibilityLabel="Перейти в режим 2.5D"
            >
              <Text style={styles.switchButtonText}>Перейти</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSuggest25D(false)}
              accessibilityRole="button"
              accessibilityLabel="Закрити пропозицію"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  labelPill: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    fontSize: 10,
  },
  cameraHudContainer: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 15,
  },
  modeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  modeOptionActive: {
    backgroundColor: '#10b981',
  },
  modeOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectedActionCard: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    gap: 8,
    maxWidth: '90%',
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectedTitle: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 140,
  },
  propsBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  propsBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  deselectBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  deselectBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionBanner: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  switchButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  switchButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
