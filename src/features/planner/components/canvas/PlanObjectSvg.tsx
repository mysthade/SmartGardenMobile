import React, { useMemo } from 'react';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PLAN_OBJECT_PRESETS } from '@smart-garden/types';
import { getEffectiveLinePoints } from '@smart-garden/validation';
import type { CanvasPlanObject } from '../../types';

interface PlanObjectSvgProps {
  object: CanvasPlanObject;
  isSelected: boolean;
  scale: number;
  isDark: boolean;
}

export const PlanObjectSvg = React.memo(function PlanObjectSvg({
  object,
  isSelected,
  scale,
  isDark,
}: PlanObjectSvgProps) {
  const preset = PLAN_OBJECT_PRESETS[object.type] ?? PLAN_OBJECT_PRESETS.CUSTOM;
  const isCircle =
    object.type === 'TREE' ||
    object.type === 'BUSH' ||
    object.type === 'WELL' ||
    object.type === 'BOREHOLE';
  const isLine = object.type === 'PATH' || object.type === 'FENCE';

  const color = object.color || preset.defaultColor;

  const cx = object.xCm + object.widthCm / 2;
  const cy = object.yCm + object.heightCm / 2;

  // Лінійні об'єкти (FENCE / PATH)
  const linePoints = useMemo(() => {
    if (!isLine) return [];
    return getEffectiveLinePoints(object);
  }, [isLine, object]);

  const linePathD = useMemo(() => {
    if (!linePoints.length) return '';
    let d = `M ${linePoints[0]!.xCm} ${linePoints[0]!.yCm}`;
    for (let i = 1; i < linePoints.length; i++) {
      d += ` L ${linePoints[i]!.xCm} ${linePoints[i]!.yCm}`;
    }
    return d;
  }, [linePoints]);

  const strokeWidth = (object.meta?.strokeWidthCm as number) || (object.type === 'PATH' ? 80 : 20);

  // Визначення чи показувати підпис
  const showLabel = scale * Math.max(object.widthCm, object.heightCm) >= 28;
  const fontSize = Math.max(12, Math.min(32, Math.round(object.heightCm * 0.22)));

  const strokeColor = object.hasCollision
    ? '#ef4444'
    : isSelected
      ? '#3b82f6'
      : isDark
        ? 'rgba(255, 255, 255, 0.25)'
        : 'rgba(0, 0, 0, 0.2)';

  const strokeW = object.hasCollision ? 4 : isSelected ? 3 : 1.5;

  if (isLine) {
    return (
      <G id={`obj-${object.id}`}>
        <Path
          d={linePathD}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={object.type === 'FENCE' ? '30,15' : undefined}
        />
        {isSelected ? (
          <Path
            d={linePathD}
            stroke="#3b82f6"
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.4}
          />
        ) : null}
      </G>
    );
  }

  return (
    <G
      id={`obj-${object.id}`}
      rotation={object.rotationDeg || 0}
      originX={cx}
      originY={cy}
    >
      {isCircle ? (
        <>
          <Circle
            cx={cx}
            cy={cy}
            r={Math.min(object.widthCm, object.heightCm) / 2}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          {object.type === 'TREE' ? (
            <Circle
              cx={cx}
              cy={cy}
              r={Math.min(object.widthCm, object.heightCm) / 4}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
              strokeWidth={1.5}
            />
          ) : null}
        </>
      ) : (
        <Rect
          x={object.xCm}
          y={object.yCm}
          width={object.widthCm}
          height={object.heightCm}
          rx={Math.min(16, object.widthCm * 0.1)}
          ry={Math.min(16, object.heightCm * 0.1)}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeW}
        />
      )}

      {/* Підпис обʼєкта */}
      {showLabel ? (
        <SvgText
          x={cx}
          y={cy + fontSize * 0.35}
          fill="#ffffff"
          fontSize={fontSize}
          fontWeight="bold"
          textAnchor="middle"
        >
          {object.label}
        </SvgText>
      ) : null}
    </G>
  );
});
