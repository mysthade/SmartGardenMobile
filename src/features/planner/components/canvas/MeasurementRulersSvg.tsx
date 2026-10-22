import React, { useMemo } from 'react';
import { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { calculateDistances, type RectCm } from '@smart-garden/validation';
import type { CanvasPlanObject } from '../../types';

interface MeasurementRulersSvgProps {
  selectedObject: CanvasPlanObject;
  otherObjects: CanvasPlanObject[];
  plotWidthCm: number;
  plotHeightCm: number;
  scale: number;
  isDark: boolean;
  unit?: 'm' | 'cm' | 'ft';
  precision?: 0.01 | 0.1 | 1;
}

export function formatCadMeasurement(
  cm: number,
  unit: 'm' | 'cm' | 'ft' = 'm',
  precision: 0.01 | 0.1 | 1 = 0.01,
): string {
  if (unit === 'cm') {
    return `${Math.round(cm)} см`;
  }
  if (unit === 'ft') {
    const feet = cm / 30.48;
    return `${feet.toFixed(2)} ft`;
  }
  // За замовчуванням у метрах із 2 знаками
  const meters = cm / 100;
  const dec = precision === 0.01 ? 2 : precision === 0.1 ? 1 : 0;
  return `${meters.toFixed(dec)} м`;
}

export const MeasurementRulersSvg = React.memo(function MeasurementRulersSvg({
  selectedObject,
  otherObjects,
  plotWidthCm,
  plotHeightCm,
  scale,
  isDark,
  unit = 'm',
  precision = 0.01,
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

  const strokeW = Math.max(1, 1.2 / scale);
  const arrowTickLen = Math.max(4, 5 / scale);
  const fontSize = Math.max(9, Math.min(15, 11 / scale));

  const dimColor = '#3b82f6';
  const guideColor = isDark ? 'rgba(56, 189, 248, 0.75)' : 'rgba(2, 132, 199, 0.8)';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const pillFill = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';

  const cx = selectedObject.xCm + selectedObject.widthCm / 2;
  const cy = selectedObject.yCm + selectedObject.heightCm / 2;
  const left = selectedObject.xCm;
  const right = selectedObject.xCm + selectedObject.widthCm;
  const top = selectedObject.yCm;
  const bottom = selectedObject.yCm + selectedObject.heightCm;

  const dimOffset = 18 / scale;

  return (
    <G id="measurement-rulers-overlay">
      {/* 1. Розмірна лінія ширини (вгорі обʼєкта зі стрілками) */}
      <G id="dim-width">
        <Line
          x1={left}
          y1={top - dimOffset}
          x2={right}
          y2={top - dimOffset}
          stroke={dimColor}
          strokeWidth={strokeW}
        />
        {/* Засічки зліва й справа */}
        <Line
          x1={left}
          y1={top - dimOffset - arrowTickLen}
          x2={left}
          y2={top - dimOffset + arrowTickLen}
          stroke={dimColor}
          strokeWidth={strokeW * 1.2}
        />
        <Line
          x1={right}
          y1={top - dimOffset - arrowTickLen}
          x2={right}
          y2={top - dimOffset + arrowTickLen}
          stroke={dimColor}
          strokeWidth={strokeW * 1.2}
        />
        {/* Виносні тонкі лінії від кутів об'єкта */}
        <Line
          x1={left}
          y1={top}
          x2={left}
          y2={top - dimOffset - 2 / scale}
          stroke={dimColor}
          strokeWidth={strokeW * 0.75}
          strokeDasharray={`${2 / scale},${2 / scale}`}
        />
        <Line
          x1={right}
          y1={top}
          x2={right}
          y2={top - dimOffset - 2 / scale}
          stroke={dimColor}
          strokeWidth={strokeW * 0.75}
          strokeDasharray={`${2 / scale},${2 / scale}`}
        />
        {/* Табличка ширини */}
        {(() => {
          const text = formatCadMeasurement(selectedObject.widthCm, unit, precision);
          const w = text.length * fontSize * 0.65 + 10 / scale;
          const h = fontSize * 1.4;
          return (
            <G>
              <Rect
                x={cx - w / 2}
                y={top - dimOffset - h / 2}
                width={w}
                height={h}
                rx={3 / scale}
                fill={pillFill}
                stroke={dimColor}
                strokeWidth={0.75 / scale}
              />
              <SvgText
                x={cx}
                y={top - dimOffset + fontSize * 0.38}
                fill={textColor}
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
              >
                {text}
              </SvgText>
            </G>
          );
        })()}
      </G>

      {/* 2. Розмірна лінія довжини/висоти (праворуч обʼєкта зі стрілками) */}
      <G id="dim-height">
        <Line
          x1={right + dimOffset}
          y1={top}
          x2={right + dimOffset}
          y2={bottom}
          stroke={dimColor}
          strokeWidth={strokeW}
        />
        {/* Засічки зверху й знизу */}
        <Line
          x1={right + dimOffset - arrowTickLen}
          y1={top}
          x2={right + dimOffset + arrowTickLen}
          y2={top}
          stroke={dimColor}
          strokeWidth={strokeW * 1.2}
        />
        <Line
          x1={right + dimOffset - arrowTickLen}
          y1={bottom}
          x2={right + dimOffset + arrowTickLen}
          y2={bottom}
          stroke={dimColor}
          strokeWidth={strokeW * 1.2}
        />
        {/* Виносні тонкі лінії від кутів об'єкта */}
        <Line
          x1={right}
          y1={top}
          x2={right + dimOffset + 2 / scale}
          y2={top}
          stroke={dimColor}
          strokeWidth={strokeW * 0.75}
          strokeDasharray={`${2 / scale},${2 / scale}`}
        />
        <Line
          x1={right}
          y1={bottom}
          x2={right + dimOffset + 2 / scale}
          y2={bottom}
          stroke={dimColor}
          strokeWidth={strokeW * 0.75}
          strokeDasharray={`${2 / scale},${2 / scale}`}
        />
        {/* Табличка довжини */}
        {(() => {
          const text = formatCadMeasurement(selectedObject.heightCm, unit, precision);
          const w = text.length * fontSize * 0.65 + 10 / scale;
          const h = fontSize * 1.4;
          return (
            <G>
              <Rect
                x={right + dimOffset - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                rx={3 / scale}
                fill={pillFill}
                stroke={dimColor}
                strokeWidth={0.75 / scale}
              />
              <SvgText
                x={right + dimOffset}
                y={cy + fontSize * 0.38}
                fill={textColor}
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
              >
                {text}
              </SvgText>
            </G>
          );
        })()}
      </G>

      {/* 3. Кут повороту обʼєкта (якщо повернутий) */}
      {Boolean(selectedObject.rotationDeg) && (
        <G id="dim-rotation">
          <Rect
            x={cx - 18 / scale}
            y={top - 36 / scale}
            width={36 / scale}
            height={16 / scale}
            rx={4 / scale}
            fill={pillFill}
            stroke="#f59e0b"
            strokeWidth={1 / scale}
          />
          <SvgText
            x={cx}
            y={top - 24 / scale}
            fill="#f59e0b"
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {`${selectedObject.rotationDeg}°`}
          </SvgText>
        </G>
      )}

      {/* 4. Перпендикулярні відстані до 4 меж ділянки */}
      {/* 4.1 Відстань до лівої межі (x = 0) */}
      {rulers.toPlot.leftCm > 0 && (
        <G id="ruler-to-left">
          <Line
            x1={0}
            y1={cy}
            x2={left}
            y2={cy}
            stroke={guideColor}
            strokeWidth={strokeW}
            strokeDasharray={`${4 / scale},${3 / scale}`}
          />
          {(() => {
            const text = formatCadMeasurement(rulers.toPlot.leftCm, unit, precision);
            const w = text.length * fontSize * 0.62 + 8 / scale;
            const h = fontSize * 1.35;
            return (
              <G>
                <Rect
                  x={left / 2 - w / 2}
                  y={cy - h / 2}
                  width={w}
                  height={h}
                  rx={3 / scale}
                  fill={pillFill}
                  stroke={pillBorder}
                  strokeWidth={0.5 / scale}
                />
                <SvgText
                  x={left / 2}
                  y={cy + fontSize * 0.35}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {text}
                </SvgText>
              </G>
            );
          })()}
        </G>
      )}

      {/* 4.2 Відстань до правої межі (x = plotWidthCm) */}
      {rulers.toPlot.rightCm > 0 && (
        <G id="ruler-to-right">
          <Line
            x1={right}
            y1={cy}
            x2={plotWidthCm}
            y2={cy}
            stroke={guideColor}
            strokeWidth={strokeW}
            strokeDasharray={`${4 / scale},${3 / scale}`}
          />
          {(() => {
            const text = formatCadMeasurement(rulers.toPlot.rightCm, unit, precision);
            const w = text.length * fontSize * 0.62 + 8 / scale;
            const h = fontSize * 1.35;
            const mid = (right + plotWidthCm) / 2;
            return (
              <G>
                <Rect
                  x={mid - w / 2}
                  y={cy - h / 2}
                  width={w}
                  height={h}
                  rx={3 / scale}
                  fill={pillFill}
                  stroke={pillBorder}
                  strokeWidth={0.5 / scale}
                />
                <SvgText
                  x={mid}
                  y={cy + fontSize * 0.35}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {text}
                </SvgText>
              </G>
            );
          })()}
        </G>
      )}

      {/* 4.3 Відстань до верхньої межі (y = 0) */}
      {rulers.toPlot.topCm > 0 && (
        <G id="ruler-to-top">
          <Line
            x1={cx}
            y1={0}
            x2={cx}
            y2={top}
            stroke={guideColor}
            strokeWidth={strokeW}
            strokeDasharray={`${4 / scale},${3 / scale}`}
          />
          {(() => {
            const text = formatCadMeasurement(rulers.toPlot.topCm, unit, precision);
            const w = text.length * fontSize * 0.62 + 8 / scale;
            const h = fontSize * 1.35;
            return (
              <G>
                <Rect
                  x={cx - w / 2}
                  y={top / 2 - h / 2}
                  width={w}
                  height={h}
                  rx={3 / scale}
                  fill={pillFill}
                  stroke={pillBorder}
                  strokeWidth={0.5 / scale}
                />
                <SvgText
                  x={cx}
                  y={top / 2 + fontSize * 0.35}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {text}
                </SvgText>
              </G>
            );
          })()}
        </G>
      )}

      {/* 4.4 Відстань до нижньої межі (y = plotHeightCm) */}
      {rulers.toPlot.bottomCm > 0 && (
        <G id="ruler-to-bottom">
          <Line
            x1={cx}
            y1={bottom}
            x2={cx}
            y2={plotHeightCm}
            stroke={guideColor}
            strokeWidth={strokeW}
            strokeDasharray={`${4 / scale},${3 / scale}`}
          />
          {(() => {
            const text = formatCadMeasurement(rulers.toPlot.bottomCm, unit, precision);
            const w = text.length * fontSize * 0.62 + 8 / scale;
            const h = fontSize * 1.35;
            const mid = (bottom + plotHeightCm) / 2;
            return (
              <G>
                <Rect
                  x={cx - w / 2}
                  y={mid - h / 2}
                  width={w}
                  height={h}
                  rx={3 / scale}
                  fill={pillFill}
                  stroke={pillBorder}
                  strokeWidth={0.5 / scale}
                />
                <SvgText
                  x={cx}
                  y={mid + fontSize * 0.35}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {text}
                </SvgText>
              </G>
            );
          })()}
        </G>
      )}

      {/* 5. Відстань до найближчого сусіда */}
      {rulers.nearestNeighbor && (
        <G id="ruler-nearest-neighbor">
          <Line
            x1={rulers.nearestNeighbor.line.from.x}
            y1={rulers.nearestNeighbor.line.from.y}
            x2={rulers.nearestNeighbor.line.to.x}
            y2={rulers.nearestNeighbor.line.to.y}
            stroke={isDark ? '#c084fc' : '#9333ea'}
            strokeWidth={strokeW}
            strokeDasharray={`${4 / scale},${3 / scale}`}
          />
          {(() => {
            const text = formatCadMeasurement(rulers.nearestNeighbor.distanceCm, unit, precision);
            const w = text.length * fontSize * 0.62 + 8 / scale;
            const h = fontSize * 1.35;
            const midX = (rulers.nearestNeighbor.line.from.x + rulers.nearestNeighbor.line.to.x) / 2;
            const midY = (rulers.nearestNeighbor.line.from.y + rulers.nearestNeighbor.line.to.y) / 2;
            return (
              <G>
                <Rect
                  x={midX - w / 2}
                  y={midY - h / 2}
                  width={w}
                  height={h}
                  rx={3 / scale}
                  fill={pillFill}
                  stroke={isDark ? '#a855f7' : '#9333ea'}
                  strokeWidth={0.75 / scale}
                />
                <SvgText
                  x={midX}
                  y={midY + fontSize * 0.35}
                  fill={isDark ? '#e9d5ff' : '#7e22ce'}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {text}
                </SvgText>
              </G>
            );
          })()}
        </G>
      )}
    </G>
  );
});
