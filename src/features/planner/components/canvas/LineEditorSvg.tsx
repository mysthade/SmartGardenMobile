import React from 'react';
import { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { getEffectiveLinePoints } from '@smart-garden/validation';
import type { CanvasPlanObject, LineDrawingState } from '../../types';

interface LineEditorSvgProps {
  selectedObject: CanvasPlanObject | null;
  lineDrawingState: LineDrawingState | null;
  selectedLineVertex: { objectId: string; vertexIdx: number } | null;
  scale: number;
  isDark: boolean;
}

export const LineEditorSvg = React.memo(function LineEditorSvg({
  selectedObject,
  lineDrawingState,
  selectedLineVertex,
  scale,
  isDark,
}: LineEditorSvgProps) {
  const vertexRadius = Math.max(10, Math.min(24, 14 / scale));
  const strokeW = Math.max(2, 2.5 / scale);
  const primaryColor = '#10b981';

  // Режим малювання нової лінії
  if (lineDrawingState && lineDrawingState.points.length > 0) {
    const pts = lineDrawingState.points;
    let d = `M ${pts[0]!.xCm} ${pts[0]!.yCm}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i]!.xCm} ${pts[i]!.yCm}`;
    }

    return (
      <G id="line-drawing-preview">
        <Path
          d={d}
          stroke={primaryColor}
          strokeWidth={4 / scale}
          strokeDasharray={`${8 / scale},${4 / scale}`}
          fill="none"
        />
        {pts.map((p, idx) => (
          <Circle
            key={`draw-pt-${idx}`}
            cx={p.xCm}
            cy={p.yCm}
            r={vertexRadius}
            fill="#ffffff"
            stroke={primaryColor}
            strokeWidth={strokeW}
          />
        ))}
      </G>
    );
  }

  // Редагування точок вибраного лінійного об'єкта
  if (selectedObject && (selectedObject.type === 'PATH' || selectedObject.type === 'FENCE')) {
    const points = getEffectiveLinePoints(selectedObject);
    return (
      <G id="line-object-vertices">
        {points.map((p, idx) => {
          const isSelected =
            selectedLineVertex?.objectId === selectedObject.id &&
            selectedLineVertex?.vertexIdx === idx;

          return (
            <G key={`line-v-${idx}`}>
              <Circle
                cx={p.xCm}
                cy={p.yCm}
                r={isSelected ? vertexRadius * 1.3 : vertexRadius}
                fill={isSelected ? '#3b82f6' : isDark ? '#1e293b' : '#ffffff'}
                stroke="#3b82f6"
                strokeWidth={strokeW}
              />
              <SvgText
                x={p.xCm}
                y={p.yCm + vertexRadius * 0.35}
                fill={isSelected ? '#ffffff' : '#3b82f6'}
                fontSize={vertexRadius * 0.8}
                fontWeight="bold"
                textAnchor="middle"
              >
                {idx + 1}
              </SvgText>
            </G>
          );
        })}
      </G>
    );
  }

  return null;
});
