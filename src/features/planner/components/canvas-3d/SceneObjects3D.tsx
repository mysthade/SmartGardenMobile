import React, { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { CanvasPlanObject } from '../../types';
import { getModel3DConfig } from '../../constants/planner-3d-models';

interface SceneObject3DProps {
  object: CanvasPlanObject;
  planWidthM: number;
  planDepthM: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const SceneObject3D = memo(function SceneObject3D({
  object,
  planWidthM,
  planDepthM,
  isSelected,
  onSelect,
}: SceneObject3DProps) {
  const modelConfig = getModel3DConfig(object.type);

  // Dimensions in meters
  const widthM = object.widthCm / 100;
  const depthM = object.heightCm / 100;
  const totalHeightM = modelConfig.heightCm / 100;

  // Center position on XZ plane (0, 0 is center of plot)
  const sceneX = (object.xCm + object.widthCm / 2) / 100 - planWidthM / 2;
  const sceneZ = (object.yCm + object.heightCm / 2) / 100 - planDepthM / 2;
  const rotationY = -(object.rotationDeg * Math.PI) / 180;

  const baseColor = object.color || modelConfig.defaultColor;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(object.id);
  };

  const isTree = object.type === 'TREE' || object.type === 'BUSH';
  const hasRoof = Boolean(modelConfig.hasRoof && modelConfig.roofHeightCm);
  const roofHeightM = (modelConfig.roofHeightCm || 0) / 100;
  const wallHeightM = Math.max(0.2, totalHeightM - roofHeightM);

  return (
    <group
      position={[sceneX, 0, sceneZ]}
      rotation={[0, rotationY, 0]}
      onPointerDown={handlePointerDown}
    >
      {/* Contact Shadow (Blob plane) under elevated objects */}
      {totalHeightM > 0.3 && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthM * 1.15, depthM * 1.15]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 1. House, Shed, Garage, Gazebo, Greenhouse, Toilet, Custom */}
      {!isTree && object.type !== 'WELL' && (
        <group>
          {/* Main Walls / Body */}
          <mesh
            position={[0, wallHeightM / 2, 0]}
            castShadow={modelConfig.castShadow}
            receiveShadow={modelConfig.receiveShadow}
          >
            <boxGeometry args={[widthM, wallHeightM, depthM]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={0.7}
              metalness={0.05}
              transparent={modelConfig.isTransparent}
              opacity={modelConfig.opacity ?? 1.0}
              emissive={isSelected ? '#10b981' : '#000000'}
              emissiveIntensity={isSelected ? 0.35 : 0}
            />
          </mesh>

          {/* Roof (Gable, Pyramid or Slanted) */}
          {hasRoof && (
            <mesh
              position={[0, wallHeightM + roofHeightM / 2, 0]}
              castShadow={modelConfig.castShadow}
            >
              <coneGeometry
                args={[Math.max(widthM, depthM) * 0.72, roofHeightM, 4]}
              />
              <meshStandardMaterial
                color={modelConfig.roofColor || '#881337'}
                roughness={0.65}
                metalness={0.05}
                emissive={isSelected ? '#10b981' : '#000000'}
                emissiveIntensity={isSelected ? 0.25 : 0}
              />
            </mesh>
          )}
        </group>
      )}

      {/* 2. Well / Borehole */}
      {object.type === 'WELL' && (
        <group>
          {/* Cylinder base */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[widthM / 2, widthM / 2, 0.8, 16]} />
            <meshStandardMaterial color={baseColor} roughness={0.8} />
          </mesh>
          {/* Roof cone */}
          <mesh position={[0, 1.4, 0]} castShadow>
            <coneGeometry args={[widthM * 0.7, 0.6, 4]} />
            <meshStandardMaterial color="#451a03" roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* 3. Tree / Bush */}
      {isTree && (
        <group>
          {/* Trunk */}
          {object.type === 'TREE' && (
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.18, 1.4, 8]} />
              <meshStandardMaterial color="#5c3822" roughness={0.9} />
            </mesh>
          )}

          {/* Crown */}
          <mesh
            position={[0, object.type === 'TREE' ? 2.3 : totalHeightM / 2, 0]}
            castShadow
          >
            <dodecahedronGeometry
              args={[Math.max(0.4, Math.min(widthM, depthM) / 2), 1]}
            />
            <meshStandardMaterial
              color={baseColor}
              roughness={0.65}
              metalness={0.02}
              emissive={isSelected ? '#10b981' : '#000000'}
              emissiveIntensity={isSelected ? 0.35 : 0}
            />
          </mesh>
        </group>
      )}

      {/* Selection Bounding Box Outline */}
      {isSelected && (
        <lineSegments position={[0, totalHeightM / 2, 0]}>
          <edgesGeometry>
            <boxGeometry
              args={[widthM * 1.05, totalHeightM * 1.05, depthM * 1.05]}
            />
          </edgesGeometry>
          <lineBasicMaterial color="#10b981" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
});
