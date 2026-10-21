import React from 'react';
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { calculateEdgeProperties, formatMeasurement, type BoundaryPoint } from '@smart-garden/validation';

interface BoundaryEditorSvgProps {
  boundary: BoundaryPoint[];
  selectedVertexIdx: number | null;
  scale: number;
  isDark: boolean;
  onSelectVertex?: (idx: number) => void;
  onInsertVertex?: (edgeIdx: number, point: BoundaryPoint) => void;
}

export const BoundaryEditorSvg = React.memo(function BoundaryEditorSvg({
  boundary,
  selectedVertexIdx,
  scale,
  isDark,
}: BoundaryEditorSvgProps) {
  const n = boundary.length;
  const vertexRadius = Math.max(10, Math.min(26, 14 / scale));
  const plusRadius = Math.max(8, Math.min(20, 10 / scale));
  const fontSize = Math.max(10, Math.min(22, 13 / scale));
  const strokeW = Math.max(2, 2.5 / scale);

  const edgeColor = isDark ? '#38bdf8' : '#0284c7';
  const vertexFill = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';

  return (
    <G id="boundary-editor-overlay">
      {/* 1. Ребра з підписами довжини та кнопками '+' */}
      {boundary.map((p1, i) => {
        const p2 = boundary[(i + 1) % n]!;
        const midX = (p1.xCm + p2.xCm) / 2;
        const midY = (p1.yCm + p2.yCm) / 2;

        const { lengthCm, angleDeg } = calculateEdgeProperties(p1, p2);
        const labelText = `${formatMeasurement(lengthCm)} (${angleDeg}°)`;

        return (
          <G key={`edge-${i}`}>
            {/* Лінія ребра */}
            <Line
              x1={p1.xCm}
              y1={p1.yCm}
              x2={p2.xCm}
              y2={p2.yCm}
              stroke={edgeColor}
              strokeWidth={strokeW}
              strokeDasharray={`${8 / scale},${4 / scale}`}
            />

            {/* Підпис довжини та кута */}
            <SvgText
              x={midX}
              y={midY - 14 / scale}
              fill={textColor}
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="middle"
            >
              {labelText}
            </SvgText>

            {/* Точка '+' посередині для вставки вершини */}
            <Circle
              cx={midX}
              cy={midY}
              r={plusRadius}
              fill={edgeColor}
              stroke="#ffffff"
              strokeWidth={1.5 / scale}
            />
            <SvgText
              x={midX}
              y={midY + (plusRadius * 0.4)}
              fill="#ffffff"
              fontSize={plusRadius * 1.3}
              fontWeight="bold"
              textAnchor="middle"
            >
              +
            </SvgText>
          </G>
        );
      })}

      {/* 2. Вершини контуру */}
      {boundary.map((p, i) => {
        const isSelected = selectedVertexIdx === i;
        return (
          <G key={`vertex-${i}`}>
            <Circle
              cx={p.xCm}
              cy={p.yCm}
              r={isSelected ? vertexRadius * 1.25 : vertexRadius}
              fill={isSelected ? edgeColor : vertexFill}
              stroke={edgeColor}
              strokeWidth={strokeW}
            />
            <SvgText
              x={p.xCm}
              y={p.yCm + vertexRadius * 0.35}
              fill={isSelected ? '#ffffff' : edgeColor}
              fontSize={vertexRadius * 0.9}
              fontWeight="bold"
              textAnchor="middle"
            >
              {i + 1}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
});
