import React, { useMemo } from 'react';
import { Circle, G, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import {
  getEffectiveBoundary,
  getPolygonSignedArea,
  type BoundaryPoint,
} from '@smart-garden/validation';

interface PlotBoundarySvgProps {
  plan: {
    widthCm: number;
    heightCm: number;
    boundary: BoundaryPoint[] | null;
  };
  scale?: number;
  isDark: boolean;
}

export const PlotBoundarySvg = React.memo(function PlotBoundarySvg({
  plan,
  scale = 0.25,
  isDark,
}: PlotBoundarySvgProps) {
  const boundary = useMemo(() => {
    return getEffectiveBoundary(plan);
  }, [plan.widthCm, plan.heightCm, plan.boundary]);

  const pointsString = useMemo(() => {
    if (!boundary || !boundary.length) return '';
    return boundary.map((p) => `${p.xCm},${p.yCm}`).join(' ');
  }, [boundary]);

  // Natural muted earth/lawn palette with 3:1+ contrast against objects
  const plotFill = isDark ? '#15241b' : '#d8ebd9';
  const plotStroke = isDark ? '#2e4a36' : '#5b7d60';
  const strokeW = Math.max(1.5, 2 / scale);

  // Edge measurements and centroid computation
  const { edges, centroid, areaM2, perimeterM } = useMemo(() => {
    if (!boundary || boundary.length < 3) {
      return { edges: [], centroid: { x: 0, y: 0 }, areaM2: '0', perimeterM: '0' };
    }

    const n = boundary.length;
    let totalLenCm = 0;
    let sumX = 0;
    let sumY = 0;
    const computedEdges: Array<{
      midX: number;
      midY: number;
      lengthText: string;
      angleDeg: number;
    }> = [];

    for (let i = 0; i < n; i++) {
      const p1 = boundary[i]!;
      const p2 = boundary[(i + 1) % n]!;
      sumX += p1.xCm;
      sumY += p1.yCm;

      const dx = p2.xCm - p1.xCm;
      const dy = p2.yCm - p1.yCm;
      const lenCm = Math.hypot(dx, dy);
      totalLenCm += lenCm;

      const midX = (p1.xCm + p2.xCm) / 2;
      const midY = (p1.yCm + p2.yCm) / 2;
      const lengthText = `${(lenCm / 100).toFixed(2)} м`;
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angleDeg > 90 || angleDeg < -90) {
        angleDeg += 180;
      }

      computedEdges.push({ midX, midY, lengthText, angleDeg });
    }

    const signedAreaCm2 = Math.abs(getPolygonSignedArea(boundary));
    const aM2 = (signedAreaCm2 / 10000).toFixed(1);
    const pM = (totalLenCm / 100).toFixed(1);

    return {
      edges: computedEdges,
      centroid: { x: sumX / n, y: sumY / n },
      areaM2: aM2,
      perimeterM: pM,
    };
  }, [boundary]);

  if (!pointsString) return null;

  const fontSize = Math.max(9, Math.min(14, 11 / scale));
  const badgeFontSize = Math.max(10, Math.min(16, 13 / scale));
  const markerRadius = Math.max(3, 4.5 / scale);
  const pillFill = isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.88)';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <G id="plot-boundary-group">
      {/* 1. Основний контур ділянки */}
      <Polygon
        points={pointsString}
        fill={plotFill}
        stroke={plotStroke}
        strokeWidth={strokeW}
      />

      {/* 2. Кутові маркери вершин */}
      {boundary.map((p, idx) => (
        <Circle
          key={`vertex-${idx}`}
          cx={p.xCm}
          cy={p.yCm}
          r={markerRadius}
          fill={plotStroke}
          stroke={isDark ? '#0f172a' : '#ffffff'}
          strokeWidth={1.5 / scale}
        />
      ))}

      {/* 3. Довжини сторін ділянки */}
      {edges.map((e, idx) => {
        const textW = e.lengthText.length * fontSize * 0.62 + 8 / scale;
        const textH = fontSize * 1.4;
        return (
          <G key={`edge-${idx}`}>
            <Rect
              x={e.midX - textW / 2}
              y={e.midY - textH / 2}
              width={textW}
              height={textH}
              rx={3 / scale}
              fill={pillFill}
            />
            <SvgText
              x={e.midX}
              y={e.midY + fontSize * 0.38}
              fill={textColor}
              fontSize={fontSize}
              fontWeight="600"
              textAnchor="middle"
            >
              {e.lengthText}
            </SvgText>
          </G>
        );
      })}

      {/* 4. Зведення у центрі: площа та периметр */}
      {boundary.length >= 3 && (
        <G key="plot-centroid-badge">
          <Rect
            x={centroid.x - 70 / scale}
            y={centroid.y - 12 / scale}
            width={140 / scale}
            height={24 / scale}
            rx={5 / scale}
            fill={pillFill}
          />
          <SvgText
            x={centroid.x}
            y={centroid.y + badgeFontSize * 0.35}
            fill={textColor}
            fontSize={badgeFontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {`S = ${areaM2} м² • P = ${perimeterM} м`}
          </SvgText>
        </G>
      )}
    </G>
  );
}, (prev, next) => {
  if (prev.isDark !== next.isDark) return false;
  if (prev.scale !== next.scale) return false;
  if (prev.plan.widthCm !== next.plan.widthCm) return false;
  if (prev.plan.heightCm !== next.plan.heightCm) return false;
  if (prev.plan.boundary !== next.plan.boundary) return false;
  return true;
});

