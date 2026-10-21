import React, { useMemo } from 'react';
import { G, Line, Text as SvgText } from 'react-native-svg';
import { calculateDistances, formatMeasurement, type RectCm } from '@smart-garden/validation';
import type { CanvasPlanObject } from '../../types';

interface MeasurementRulersSvgProps {
  selectedObject: CanvasPlanObject;
  otherObjects: CanvasPlanObject[];
  plotWidthCm: number;
  plotHeightCm: number;
  scale: number;
  isDark: boolean;
}

export const MeasurementRulersSvg = React.memo(function MeasurementRulersSvg({
  selectedObject,
  otherObjects,
  plotWidthCm,
  plotHeightCm,
  scale,
  isDark,
}: MeasurementRulersSvgProps) {
  const targetRect: RectCm = useMemo(
    () => ({
      xCm: selectedObject.xCm,
      yCm: selectedObject.yCm,
      widthCm: selectedObject.widthCm,
      heightCm: selectedObject.heightCm,
    }),
    [selectedObject.xCm, selectedObject.yCm, selectedObject.widthCm, selectedObject.heightCm],
  );

  const othersRects: RectCm[] = useMemo(
    () =>
      otherObjects
        .filter((o) => o.id !== selectedObject.id && !o.deleted)
        .map((o) => ({
          xCm: o.xCm,
          yCm: o.yCm,
          widthCm: o.widthCm,
          heightCm: o.heightCm,
        })),
    [otherObjects, selectedObject.id],
  );

  const rulers = useMemo(
    () => calculateDistances(targetRect, othersRects, plotWidthCm, plotHeightCm),
    [targetRect, othersRects, plotWidthCm, plotHeightCm],
  );

  const strokeW = Math.max(1, 1.5 / scale);
  const fontSize = Math.max(10, Math.min(22, 14 / scale));
  const badgePad = 4 / scale;

  const rulerColor = isDark ? '#38bdf8' : '#0284c7';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  const cx = selectedObject.xCm + selectedObject.widthCm / 2;
  const cy = selectedObject.yCm + selectedObject.heightCm / 2;

  return (
    <G id="measurement-rulers-overlay">
      {/* 1. Лінійка до лівого краю */}
      {rulers.toPlot.leftCm > 0 ? (
        <>
          <Line
            x1={0}
            y1={cy}
            x2={selectedObject.xCm}
            y2={cy}
            stroke={rulerColor}
            strokeWidth={strokeW}
            strokeDasharray={`${6 / scale},${4 / scale}`}
          />
          <SvgText
            x={selectedObject.xCm / 2}
            y={cy - badgePad}
            fill={textColor}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {formatMeasurement(rulers.toPlot.leftCm)}
          </SvgText>
        </>
      ) : null}

      {/* 2. Лінійка до правого краю */}
      {rulers.toPlot.rightCm > 0 ? (
        <>
          <Line
            x1={selectedObject.xCm + selectedObject.widthCm}
            y1={cy}
            x2={plotWidthCm}
            y2={cy}
            stroke={rulerColor}
            strokeWidth={strokeW}
            strokeDasharray={`${6 / scale},${4 / scale}`}
          />
          <SvgText
            x={(selectedObject.xCm + selectedObject.widthCm + plotWidthCm) / 2}
            y={cy - badgePad}
            fill={textColor}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {formatMeasurement(rulers.toPlot.rightCm)}
          </SvgText>
        </>
      ) : null}

      {/* 3. Лінійка до верхнього краю */}
      {rulers.toPlot.topCm > 0 ? (
        <>
          <Line
            x1={cx}
            y1={0}
            x2={cx}
            y2={selectedObject.yCm}
            stroke={rulerColor}
            strokeWidth={strokeW}
            strokeDasharray={`${6 / scale},${4 / scale}`}
          />
          <SvgText
            x={cx + badgePad * 2}
            y={selectedObject.yCm / 2}
            fill={textColor}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="start"
          >
            {formatMeasurement(rulers.toPlot.topCm)}
          </SvgText>
        </>
      ) : null}

      {/* 4. Лінійка до нижнього краю */}
      {rulers.toPlot.bottomCm > 0 ? (
        <>
          <Line
            x1={cx}
            y1={selectedObject.yCm + selectedObject.heightCm}
            x2={cx}
            y2={plotHeightCm}
            stroke={rulerColor}
            strokeWidth={strokeW}
            strokeDasharray={`${6 / scale},${4 / scale}`}
          />
          <SvgText
            x={cx + badgePad * 2}
            y={(selectedObject.yCm + selectedObject.heightCm + plotHeightCm) / 2}
            fill={textColor}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="start"
          >
            {formatMeasurement(rulers.toPlot.bottomCm)}
          </SvgText>
        </>
      ) : null}

      {/* 5. Відстань до найближчого сусіда */}
      {rulers.nearestNeighbor ? (
        <>
          <Line
            x1={rulers.nearestNeighbor.line.from.x}
            y1={rulers.nearestNeighbor.line.from.y}
            x2={rulers.nearestNeighbor.line.to.x}
            y2={rulers.nearestNeighbor.line.to.y}
            stroke="#a855f7"
            strokeWidth={strokeW}
            strokeDasharray={`${4 / scale},${4 / scale}`}
          />
          <SvgText
            x={(rulers.nearestNeighbor.line.from.x + rulers.nearestNeighbor.line.to.x) / 2}
            y={(rulers.nearestNeighbor.line.from.y + rulers.nearestNeighbor.line.to.y) / 2 - badgePad}
            fill="#a855f7"
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {formatMeasurement(rulers.nearestNeighbor.distanceCm)}
          </SvgText>
        </>
      ) : null}
    </G>
  );
});
