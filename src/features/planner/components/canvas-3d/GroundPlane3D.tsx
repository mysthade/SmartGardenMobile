import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createBoundaryBufferGeometry } from '../../utils/polygon-triangulation';
import {
  createBoundaryRibbonGeometry,
  createPlotGridGeometry,
} from '../../utils/3d-geometries';

interface GroundPlane3DProps {
  widthM: number;
  depthM: number;
  boundary: Array<{ xCm: number; yCm: number }> | null;
  isDark: boolean;
}

export const GroundPlane3D = React.memo(function GroundPlane3D({
  widthM,
  depthM,
  boundary,
  isDark,
}: GroundPlane3DProps) {
  // Balanced ground palette (vibrant lawn in light mode, deep muted green in dark mode)
  const outerGroundColor = isDark ? '#0b1a13' : '#dcfce7';
  const plotGroundColor = isDark ? '#1b4332' : '#86efac';
  const ribbonColor = isDark ? '#34d399' : '#059669';
  const gridLineColor = isDark ? '#2d6a4f' : '#4ade80';

  // Triangulated custom boundary mesh (if custom boundary polygon exists)
  const boundaryGeometry = useMemo(() => {
    return createBoundaryBufferGeometry(boundary, widthM, depthM);
  }, [boundary, widthM, depthM]);

  // Ribbon geometry for solid 0.16m boundary perimeter (replaces 1-pixel wire line)
  const ribbonGeometry = useMemo(() => {
    const effectiveBoundary =
      boundary && boundary.length >= 3
        ? boundary
        : [
            { xCm: 0, yCm: 0 },
            { xCm: widthM * 100, yCm: 0 },
            { xCm: widthM * 100, yCm: depthM * 100 },
            { xCm: 0, yCm: depthM * 100 },
          ];
    return createBoundaryRibbonGeometry(effectiveBoundary, widthM, depthM, 0.16);
  }, [boundary, widthM, depthM]);

  // Subtle 1m grid line segments inside the plot
  const gridGeometry = useMemo(() => {
    return createPlotGridGeometry(widthM, depthM, 1.0);
  }, [widthM, depthM]);

  return (
    <group>
      {/* 1. Outer extended lawn surface spanning the full horizon */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[Math.max(widthM * 6, 300), Math.max(depthM * 6, 300)]} />
        <meshLambertMaterial
          color={outerGroundColor}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={3}
          polygonOffsetUnits={3}
        />
      </mesh>

      {/* 2. Plot surface fill (either triangulated custom boundary or default plot rectangle) */}
      {boundaryGeometry ? (
        <mesh geometry={boundaryGeometry} receiveShadow>
          <meshLambertMaterial
            color={plotGroundColor}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={2}
            polygonOffsetUnits={2}
          />
        </mesh>
      ) : (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015, 0]}
          receiveShadow
        >
          <planeGeometry args={[widthM, depthM]} />
          <meshLambertMaterial
            color={plotGroundColor}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={2}
            polygonOffsetUnits={2}
          />
        </mesh>
      )}

      {/* 3. Subtle plot grid lines (1m intervals) */}
      {gridGeometry && (
        <lineSegments geometry={gridGeometry}>
          <lineBasicMaterial
            color={gridLineColor}
            transparent
            opacity={isDark ? 0.35 : 0.45}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* 4. Solid flat boundary ribbon perimeter (0.16m wide flat mesh) */}
      {ribbonGeometry && (
        <mesh geometry={ribbonGeometry}>
          <meshLambertMaterial
            color={ribbonColor}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      )}
    </group>
  );
});
