import React, { useMemo } from 'react';
import { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { getPolygonSignedArea } from '@smart-garden/validation';

export interface MeasurementPoint {
  xCm: number;
  yCm: number;
}

export interface PinnedMeasurement {
  id: string;
  points: MeasurementPoint[];
  label: string;
}

interface MeasurementInteractiveOverlayProps {
  activeTool: string;
  points: MeasurementPoint[];
  pinnedMeasurements: PinnedMeasurement[];
  scale: number;
  isDark: boolean;
}

export const MeasurementInteractiveOverlay = React.memo(function MeasurementInteractiveOverlay({
  activeTool,
  points,
  pinnedMeasurements,
  scale,
  isDark,
}: MeasurementInteractiveOverlayProps) {
  const isMeasureMode = activeTool === 'measure';
  const isAreaMode = activeTool === 'area';

  const strokeW = Math.max(1.5, 2 / scale);
  const pointRadius = Math.max(4, 5 / scale);
  const fontSize = Math.max(9, Math.min(15, 11 / scale));

  const pillFill = isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)';
  const textColor = isDark ? '#f8fafc' : '#0f172a';

  // 1. Поточні вимірювальні сегменти (в режимі 'measure')
  const measureSegments = useMemo(() => {
    if (!isMeasureMode || points.length < 2) return [];
    const segments: Array<{
      p1: MeasurementPoint;
      p2: MeasurementPoint;
      distanceM: string;
      midX: number;
      midY: number;
    }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const dx = p2.xCm - p1.xCm;
      const dy = p2.yCm - p1.yCm;
      const distCm = Math.hypot(dx, dy);
      segments.push({
        p1,
        p2,
        distanceM: `${(distCm / 100).toFixed(2)} м`,
        midX: (p1.xCm + p2.xCm) / 2,
        midY: (p1.yCm + p2.yCm) / 2,
      });
    }
    return segments;
  }, [isMeasureMode, points]);

  // 2. Поточний довільний полігон площі (в режимі 'area')
  const { areaPointsString, areaM2, perimeterM, centroid } = useMemo(() => {
    if (!isAreaMode || points.length < 3) {
      return { areaPointsString: '', areaM2: '0', perimeterM: '0', centroid: { x: 0, y: 0 } };
    }

    const ptsStr = points.map((p) => `${p.xCm},${p.yCm}`).join(' ');
    const boundaryPts = points.map((p) => ({ xCm: p.xCm, yCm: p.yCm }));
    const areaCm2 = Math.abs(getPolygonSignedArea(boundaryPts));
    const aM2 = (areaCm2 / 10000).toFixed(2);

    let perimCm = 0;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]!;
      const p2 = points[(i + 1) % points.length]!;
      perimCm += Math.hypot(p2.xCm - p1.xCm, p2.yCm - p1.yCm);
      sumX += p1.xCm;
      sumY += p1.yCm;
    }

    return {
      areaPointsString: ptsStr,
      areaM2: aM2,
      perimeterM: (perimCm / 100).toFixed(2),
      centroid: { x: sumX / points.length, y: sumY / points.length },
    };
  }, [isAreaMode, points]);

  return (
    <G id="measurement-interactive-layer">
      {/* 1. Збережені локальні мітки (Pinned measurements) */}
      {pinnedMeasurements.map((pinned) => {
        if (pinned.points.length < 2) return null;
        return (
          <G key={`pinned-${pinned.id}`}>
            {pinned.points.map((p, idx) => {
              if (idx === pinned.points.length - 1) return null;
              const pNext = pinned.points[idx + 1]!;
              const midX = (p.xCm + pNext.xCm) / 2;
              const midY = (p.yCm + pNext.yCm) / 2;
              const len = (Math.hypot(pNext.xCm - p.xCm, pNext.yCm - p.yCm) / 100).toFixed(2);
              return (
                <G key={`pinned-seg-${idx}`}>
                  <Line
                    x1={p.xCm}
                    y1={p.yCm}
                    x2={pNext.xCm}
                    y2={pNext.yCm}
                    stroke="#10b981"
                    strokeWidth={strokeW * 0.9}
                    strokeDasharray={`${5 / scale},${3 / scale}`}
                  />
                  <Rect
                    x={midX - 22 / scale}
                    y={midY - 8 / scale}
                    width={44 / scale}
                    height={16 / scale}
                    rx={3 / scale}
                    fill={pillFill}
                    stroke="#10b981"
                    strokeWidth={0.75 / scale}
                  />
                  <SvgText
                    x={midX}
                    y={midY + 4 / scale}
                    fill={textColor}
                    fontSize={fontSize * 0.9}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`${len} м`}
                  </SvgText>
                </G>
              );
            })}
          </G>
        );
      })}

      {/* 2. Активний ланцюжок режиму «Виміряти» */}
      {isMeasureMode && (
        <G id="active-measure-chain">
          {measureSegments.map((seg, idx) => (
            <G key={`active-seg-${idx}`}>
              <Line
                x1={seg.p1.xCm}
                y1={seg.p1.yCm}
                x2={seg.p2.xCm}
                y2={seg.p2.yCm}
                stroke="#0ea5e9"
                strokeWidth={strokeW}
              />
              <Rect
                x={seg.midX - 26 / scale}
                y={seg.midY - 9 / scale}
                width={52 / scale}
                height={18 / scale}
                rx={4 / scale}
                fill={pillFill}
                stroke="#0ea5e9"
                strokeWidth={1 / scale}
              />
              <SvgText
                x={seg.midX}
                y={seg.midY + 4 / scale}
                fill={textColor}
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
              >
                {seg.distanceM}
              </SvgText>
            </G>
          ))}

          {/* Точки ланцюжка */}
          {points.map((p, idx) => (
            <Circle
              key={`measure-pt-${idx}`}
              cx={p.xCm}
              cy={p.yCm}
              r={pointRadius}
              fill="#0ea5e9"
              stroke="#ffffff"
              strokeWidth={1.5 / scale}
            />
          ))}
        </G>
      )}

      {/* 3. Активний полігон режиму «Площа» */}
      {isAreaMode && (
        <G id="active-area-polygon">
          {areaPointsString ? (
            <Polygon
              points={areaPointsString}
              fill={isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.18)'}
              stroke="#0284c7"
              strokeWidth={strokeW}
              strokeDasharray={`${6 / scale},${4 / scale}`}
            />
          ) : null}

          {/* Ребра довільного полігону */}
          {points.map((p, idx) => {
            const nextP = points[(idx + 1) % points.length]!;
            const isLast = idx === points.length - 1;
            if (isLast && points.length < 3) return null;
            return (
              <Line
                key={`area-edge-${idx}`}
                x1={p.xCm}
                y1={p.yCm}
                x2={nextP.xCm}
                y2={nextP.yCm}
                stroke="#0284c7"
                strokeWidth={strokeW}
              />
            );
          })}

          {/* Вершини */}
          {points.map((p, idx) => (
            <Circle
              key={`area-pt-${idx}`}
              cx={p.xCm}
              cy={p.yCm}
              r={pointRadius}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth={1.5 / scale}
            />
          ))}

          {/* Центроїд з площею й периметром */}
          {points.length >= 3 && (
            <G id="area-centroid-badge">
              <Rect
                x={centroid.x - 70 / scale}
                y={centroid.y - 12 / scale}
                width={140 / scale}
                height={24 / scale}
                rx={5 / scale}
                fill={pillFill}
                stroke="#0284c7"
                strokeWidth={1 / scale}
              />
              <SvgText
                x={centroid.x}
                y={centroid.y + fontSize * 0.38}
                fill={textColor}
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
              >
                {`S = ${areaM2} м² • P = ${perimeterM} м`}
              </SvgText>
            </G>
          )}
        </G>
      )}
    </G>
  );
});
