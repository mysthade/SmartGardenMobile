import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber/native';
import type { CanvasPlanObject } from '../../types';
import { getModel3DConfig } from '../../constants/planner-3d-models';
import type { QualityTier } from '../../utils/adaptive-quality';
import {
  createGableRoofGeometry,
  createPyramidRoofGeometry,
} from '../../utils/3d-geometries';

// Reusable scratch objects to guarantee ZERO garbage-collection allocations in render loop
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyRot = new THREE.Euler();
const _dummyQuat = new THREE.Quaternion();
const _dummyColor = new THREE.Color();

interface InstancedScene3DProps {
  objects: CanvasPlanObject[];
  planWidthM: number;
  planDepthM: number;
  selectedIds: string[];
  qualityTier: QualityTier;
  onSelect: (id: string) => void;
}

export const InstancedScene3D = React.memo(function InstancedScene3D({
  objects,
  planWidthM,
  planDepthM,
  selectedIds,
  qualityTier,
  onSelect,
}: InstancedScene3DProps) {
  const { invalidate } = useThree();

  // Pre-created geometries for roofs
  const gableRoofGeom = useMemo(() => createGableRoofGeometry(), []);
  const pyramidRoofGeom = useMemo(() => createPyramidRoofGeometry(), []);

  // Categorize objects into dedicated groups for instanced rendering
  const {
    boxObjects,
    gableRoofObjects,
    pyramidRoofObjects,
    treeTrunkObjects,
    treeCrownObjects,
    cylinderObjects,
    waterObjects,
    shadowObjects,
  } = useMemo(() => {
    const boxes: Array<{ obj: CanvasPlanObject; wallHeightM: number }> = [];
    const gableRoofs: Array<{ obj: CanvasPlanObject; wallHeightM: number; roofHeightM: number }> = [];
    const pyramidRoofs: Array<{ obj: CanvasPlanObject; wallHeightM: number; roofHeightM: number }> = [];
    const trunks: CanvasPlanObject[] = [];
    const crowns: Array<{ obj: CanvasPlanObject; radiusM: number; crownYM: number }> = [];
    const cylinders: Array<{ obj: CanvasPlanObject; heightM: number }> = [];
    const waters: CanvasPlanObject[] = [];
    const shadows: CanvasPlanObject[] = [];

    for (const obj of objects) {
      const cfg = getModel3DConfig(obj.type);
      const totalHeightM = cfg.heightCm / 100;
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;

      if (totalHeightM > 0.25) {
        shadows.push(obj);
      }

      if (obj.type === 'TREE') {
        trunks.push(obj);
        const radiusM = Math.max(0.4, Math.min(widthM, depthM) / 2);
        crowns.push({ obj, radiusM, crownYM: 2.3 });
      } else if (obj.type === 'BUSH') {
        const radiusM = Math.max(0.35, Math.min(widthM, depthM) / 2);
        crowns.push({ obj, radiusM, crownYM: Math.max(0.3, totalHeightM / 2) });
      } else if (obj.type === 'WELL' || obj.type === 'BOREHOLE') {
        cylinders.push({ obj, heightM: totalHeightM });
        if (obj.type === 'WELL' && cfg.hasRoof && cfg.roofHeightCm) {
          pyramidRoofs.push({
            obj,
            wallHeightM: totalHeightM * 0.65,
            roofHeightM: (cfg.roofHeightCm || 50) / 100,
          });
        }
      } else if (obj.type === 'POOL' || obj.type === 'POND') {
        waters.push(obj);
      } else {
        // Box-based building, bed, greenhouse, shed, gazebo, etc.
        const hasRoof = Boolean(cfg.hasRoof && cfg.roofHeightCm);
        const roofHeightM = hasRoof ? (cfg.roofHeightCm || 0) / 100 : 0;
        const wallHeightM = Math.max(0.2, totalHeightM - roofHeightM);

        boxes.push({ obj, wallHeightM });
        if (hasRoof && roofHeightM > 0) {
          if (cfg.roofType === 'pyramid') {
            pyramidRoofs.push({ obj, wallHeightM, roofHeightM });
          } else {
            // Default to realistic gable roof for houses, sheds, greenhouses
            gableRoofs.push({ obj, wallHeightM, roofHeightM });
          }
        }
      }
    }

    return {
      boxObjects: boxes,
      gableRoofObjects: gableRoofs,
      pyramidRoofObjects: pyramidRoofs,
      treeTrunkObjects: trunks,
      treeCrownObjects: crowns,
      cylinderObjects: cylinders,
      waterObjects: waters,
      shadowObjects: shadows,
    };
  }, [objects]);

  // Mesh references
  const boxesMeshRef = useRef<THREE.InstancedMesh>(null);
  const gableRoofsMeshRef = useRef<THREE.InstancedMesh>(null);
  const pyramidRoofsMeshRef = useRef<THREE.InstancedMesh>(null);
  const trunksMeshRef = useRef<THREE.InstancedMesh>(null);
  const crownsMeshRef = useRef<THREE.InstancedMesh>(null);
  const cylindersMeshRef = useRef<THREE.InstancedMesh>(null);
  const watersMeshRef = useRef<THREE.InstancedMesh>(null);
  const shadowsMeshRef = useRef<THREE.InstancedMesh>(null);

  // 1. Synchronize Box instances (walls, beds, paths, fences)
  useEffect(() => {
    const mesh = boxesMeshRef.current;
    if (!mesh || boxObjects.length === 0) return;

    for (let i = 0; i < boxObjects.length; i++) {
      const { obj, wallHeightM } = boxObjects[i]!;
      const cfg = getModel3DConfig(obj.type);
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;
      const rotationY = -(obj.rotationDeg * Math.PI) / 180;

      _dummyPos.set(sceneX, wallHeightM / 2 + 0.015, sceneZ);
      _dummyRot.set(0, rotationY, 0);
      _dummyQuat.setFromEuler(_dummyRot);
      _dummyScale.set(widthM, wallHeightM, depthM);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set(obj.color || cfg.defaultColor);
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [boxObjects, planWidthM, planDepthM, invalidate]);

  // 2. Synchronize Gable Roof instances (House, Shed, Greenhouse - aligned with longest axis)
  useEffect(() => {
    const mesh = gableRoofsMeshRef.current;
    if (!mesh || gableRoofObjects.length === 0) return;

    for (let i = 0; i < gableRoofObjects.length; i++) {
      const { obj, wallHeightM, roofHeightM } = gableRoofObjects[i]!;
      const cfg = getModel3DConfig(obj.type);
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;
      const baseRotationY = -(obj.rotationDeg * Math.PI) / 180;

      // Ridge runs along the longer dimension
      const isLongerAlongZ = depthM > widthM;
      const roofRotY = isLongerAlongZ ? baseRotationY + Math.PI / 2 : baseRotationY;
      const scaleX = isLongerAlongZ ? depthM : widthM;
      const scaleZ = isLongerAlongZ ? widthM : depthM;

      _dummyPos.set(sceneX, wallHeightM + roofHeightM / 2 + 0.015, sceneZ);
      _dummyRot.set(0, roofRotY, 0);
      _dummyQuat.setFromEuler(_dummyRot);
      _dummyScale.set(scaleX, roofHeightM, scaleZ);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set(cfg.roofColor || '#881337');
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [gableRoofObjects, planWidthM, planDepthM, invalidate]);

  // 3. Synchronize Pyramid Roof instances (Gazebo, Well)
  useEffect(() => {
    const mesh = pyramidRoofsMeshRef.current;
    if (!mesh || pyramidRoofObjects.length === 0) return;

    for (let i = 0; i < pyramidRoofObjects.length; i++) {
      const { obj, wallHeightM, roofHeightM } = pyramidRoofObjects[i]!;
      const cfg = getModel3DConfig(obj.type);
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;
      const rotationY = -(obj.rotationDeg * Math.PI) / 180;

      _dummyPos.set(sceneX, wallHeightM + roofHeightM / 2 + 0.015, sceneZ);
      _dummyRot.set(0, rotationY, 0);
      _dummyQuat.setFromEuler(_dummyRot);
      _dummyScale.set(widthM, roofHeightM, depthM);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set(cfg.roofColor || '#78350f');
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [pyramidRoofObjects, planWidthM, planDepthM, invalidate]);

  // 4. Synchronize Tree Trunk instances
  useEffect(() => {
    const mesh = trunksMeshRef.current;
    if (!mesh || treeTrunkObjects.length === 0) return;

    for (let i = 0; i < treeTrunkObjects.length; i++) {
      const obj = treeTrunkObjects[i]!;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;

      _dummyPos.set(sceneX, 0.7, sceneZ);
      _dummyQuat.identity();
      _dummyScale.set(1, 1.4, 1);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set('#5c3822');
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [treeTrunkObjects, planWidthM, planDepthM, invalidate]);

  // 5. Synchronize Tree & Bush Crown instances
  useEffect(() => {
    const mesh = crownsMeshRef.current;
    if (!mesh || treeCrownObjects.length === 0) return;

    for (let i = 0; i < treeCrownObjects.length; i++) {
      const { obj, radiusM, crownYM } = treeCrownObjects[i]!;
      const cfg = getModel3DConfig(obj.type);
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;

      _dummyPos.set(sceneX, crownYM, sceneZ);
      _dummyQuat.identity();
      _dummyScale.set(radiusM, radiusM, radiusM);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set(obj.color || cfg.defaultColor);
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [treeCrownObjects, planWidthM, planDepthM, invalidate]);

  // 6. Synchronize Cylinder instances (Well base, borehole)
  useEffect(() => {
    const mesh = cylindersMeshRef.current;
    if (!mesh || cylinderObjects.length === 0) return;

    for (let i = 0; i < cylinderObjects.length; i++) {
      const { obj, heightM } = cylinderObjects[i]!;
      const cfg = getModel3DConfig(obj.type);
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;

      _dummyPos.set(sceneX, heightM / 2 + 0.015, sceneZ);
      _dummyQuat.identity();
      _dummyScale.set(widthM, heightM, depthM);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set(obj.color || cfg.defaultColor);
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [cylinderObjects, planWidthM, planDepthM, invalidate]);

  // 7. Synchronize Water instances (Pool, Pond)
  useEffect(() => {
    const mesh = watersMeshRef.current;
    if (!mesh || waterObjects.length === 0) return;

    for (let i = 0; i < waterObjects.length; i++) {
      const obj = waterObjects[i]!;
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;
      const rotationY = -(obj.rotationDeg * Math.PI) / 180;

      _dummyPos.set(sceneX, 0.035, sceneZ);
      _dummyRot.set(-Math.PI / 2, 0, rotationY);
      _dummyQuat.setFromEuler(_dummyRot);
      _dummyScale.set(widthM, depthM, 1);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
      _dummyColor.set(obj.color || '#0284c7');
      mesh.setColorAt(i, _dummyColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [waterObjects, planWidthM, planDepthM, invalidate]);

  // 8. Synchronize Contact Shadows in ONE single InstancedMesh
  useEffect(() => {
    const mesh = shadowsMeshRef.current;
    if (!mesh || shadowObjects.length === 0) return;

    for (let i = 0; i < shadowObjects.length; i++) {
      const obj = shadowObjects[i]!;
      const widthM = obj.widthCm / 100;
      const depthM = obj.heightCm / 100;
      const sceneX = (obj.xCm + obj.widthCm / 2) / 100 - planWidthM / 2;
      const sceneZ = (obj.yCm + obj.heightCm / 2) / 100 - planDepthM / 2;
      const rotationY = -(obj.rotationDeg * Math.PI) / 180;

      _dummyPos.set(sceneX, 0.045, sceneZ);
      _dummyRot.set(-Math.PI / 2, 0, rotationY);
      _dummyQuat.setFromEuler(_dummyRot);
      _dummyScale.set(widthM * 1.15, depthM * 1.15, 1);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);

      mesh.setMatrixAt(i, _dummyMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [shadowObjects, planWidthM, planDepthM, invalidate]);

  // Pointer event selection handlers
  const handleBoxPointer = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && boxObjects[e.instanceId]) {
      onSelect(boxObjects[e.instanceId]!.obj.id);
    }
  };

  const handleGableRoofPointer = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && gableRoofObjects[e.instanceId]) {
      onSelect(gableRoofObjects[e.instanceId]!.obj.id);
    }
  };

  const handleCrownPointer = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && treeCrownObjects[e.instanceId]) {
      onSelect(treeCrownObjects[e.instanceId]!.obj.id);
    }
  };

  const handleCylinderPointer = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && cylinderObjects[e.instanceId]) {
      onSelect(cylinderObjects[e.instanceId]!.obj.id);
    }
  };

  const handleWaterPointer = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && waterObjects[e.instanceId]) {
      onSelect(waterObjects[e.instanceId]!.id);
    }
  };

  // Find selected objects for highlight wireframe
  const selectedObjects = useMemo(() => {
    return objects.filter((o) => selectedIds.includes(o.id));
  }, [objects, selectedIds]);

  const useStandard = qualityTier === 'high';

  return (
    <group>
      {/* 1. All Contact Shadows in ONE InstancedMesh */}
      {shadowObjects.length > 0 && (
        <instancedMesh
          ref={shadowsMeshRef}
          args={[undefined, undefined, shadowObjects.length]}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* 2. All Box Bodies (Walls, beds, sheds, fences) */}
      {boxObjects.length > 0 && (
        <instancedMesh
          ref={boxesMeshRef}
          args={[undefined, undefined, boxObjects.length]}
          onPointerDown={handleBoxPointer}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          {useStandard ? (
            <meshStandardMaterial roughness={0.7} metalness={0.05} />
          ) : (
            <meshLambertMaterial />
          )}
        </instancedMesh>
      )}

      {/* 3. Gable Roofs (Houses, Sheds, Greenhouses) - NO DIAGONAL SEAMS */}
      {gableRoofObjects.length > 0 && (
        <instancedMesh
          ref={gableRoofsMeshRef}
          args={[gableRoofGeom, undefined, gableRoofObjects.length]}
          onPointerDown={handleGableRoofPointer}
          frustumCulled={false}
        >
          {useStandard ? (
            <meshStandardMaterial roughness={0.65} metalness={0.05} />
          ) : (
            <meshLambertMaterial />
          )}
        </instancedMesh>
      )}

      {/* 4. Pyramid Roofs (Gazebo, Well) */}
      {pyramidRoofObjects.length > 0 && (
        <instancedMesh
          ref={pyramidRoofsMeshRef}
          args={[pyramidRoofGeom, undefined, pyramidRoofObjects.length]}
          onPointerDown={handleBoxPointer}
          frustumCulled={false}
        >
          {useStandard ? (
            <meshStandardMaterial roughness={0.65} metalness={0.05} />
          ) : (
            <meshLambertMaterial />
          )}
        </instancedMesh>
      )}

      {/* 5. Tree Trunks */}
      {treeTrunkObjects.length > 0 && (
        <instancedMesh
          ref={trunksMeshRef}
          args={[undefined, undefined, treeTrunkObjects.length]}
          onPointerDown={handleCrownPointer}
          frustumCulled={false}
        >
          <cylinderGeometry args={[0.12, 0.18, 1, 6]} />
          {useStandard ? (
            <meshStandardMaterial roughness={0.9} />
          ) : (
            <meshLambertMaterial />
          )}
        </instancedMesh>
      )}

      {/* 6. Tree & Bush Crowns */}
      {treeCrownObjects.length > 0 && (
        <instancedMesh
          ref={crownsMeshRef}
          args={[undefined, undefined, treeCrownObjects.length]}
          onPointerDown={handleCrownPointer}
          frustumCulled={false}
        >
          <dodecahedronGeometry args={[1, 0]} />
          {useStandard ? (
            <meshStandardMaterial roughness={0.65} metalness={0.02} />
          ) : (
            <meshLambertMaterial />
          )}
        </instancedMesh>
      )}

      {/* 7. Cylinders (Well base, borehole) */}
      {cylinderObjects.length > 0 && (
        <instancedMesh
          ref={cylindersMeshRef}
          args={[undefined, undefined, cylinderObjects.length]}
          onPointerDown={handleCylinderPointer}
          frustumCulled={false}
        >
          <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
          {useStandard ? (
            <meshStandardMaterial roughness={0.7} />
          ) : (
            <meshLambertMaterial />
          )}
        </instancedMesh>
      )}

      {/* 8. Water surfaces (Pool, Pond) */}
      {waterObjects.length > 0 && (
        <instancedMesh
          ref={watersMeshRef}
          args={[undefined, undefined, waterObjects.length]}
          onPointerDown={handleWaterPointer}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshLambertMaterial transparent opacity={0.82} />
        </instancedMesh>
      )}

      {/* 9. Selection Glowing Outlines for selected objects */}
      {selectedObjects.map((selObj) => {
        const cfg = getModel3DConfig(selObj.type);
        const widthM = selObj.widthCm / 100;
        const depthM = selObj.heightCm / 100;
        const totalHeightM = cfg.heightCm / 100;
        const sceneX = (selObj.xCm + selObj.widthCm / 2) / 100 - planWidthM / 2;
        const sceneZ = (selObj.yCm + selObj.heightCm / 2) / 100 - planDepthM / 2;
        const rotationY = -(selObj.rotationDeg * Math.PI) / 180;

        return (
          <lineSegments
            key={`sel-${selObj.id}`}
            position={[sceneX, totalHeightM / 2 + 0.015, sceneZ]}
            rotation={[0, rotationY, 0]}
          >
            <edgesGeometry>
              <boxGeometry
                args={[widthM * 1.05, totalHeightM * 1.05, depthM * 1.05]}
              />
            </edgesGeometry>
            <lineBasicMaterial color="#10b981" linewidth={2} />
          </lineSegments>
        );
      })}
    </group>
  );
});
