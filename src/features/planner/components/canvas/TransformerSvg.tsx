import React from 'react';
import { Circle, G, Line, Rect } from 'react-native-svg';
import type { CanvasPlanObject } from '../../types';

interface TransformerSvgProps {
  object: CanvasPlanObject;
  scale: number;
  isDark: boolean;
}

/**
 * Transformer для вибраного об'єкта:
 * рамка вибору, 4 кутові ручки зміни розміру, 1 верхня ручка повороту.
 * Розміри ручок адаптуються до масштабу для зручного дотику (≥ 44 dp).
 */
export const TransformerSvg = React.memo(function TransformerSvg({
  object,
  scale,
  isDark,
}: TransformerSvgProps) {
  // Для лінійних об'єктів трансформатор замінюється на LineEditor
  if (object.type === 'PATH' || object.type === 'FENCE') {
    return null;
  }

  const cx = object.xCm + object.widthCm / 2;
  const cy = object.yCm + object.heightCm / 2;

  // Радіус ручки у світових координатах (щоб на екрані було ~18 dp)
  const handleRadius = Math.max(8, Math.min(28, 16 / scale));
  const strokeW = Math.max(1.5, 2 / scale);
  const stemLength = Math.max(20, 30 / scale);

  const primaryColor = '#3b82f6';
  const handleFill = isDark ? '#1e293b' : '#ffffff';

  // 4 кути прямокутника
  const left = object.xCm;
  const top = object.yCm;
  const right = object.xCm + object.widthCm;
  const bottom = object.yCm + object.heightCm;

  return (
    <G
      id="transformer-overlay"
      rotation={object.rotationDeg || 0}
      originX={cx}
      originY={cy}
    >
      {/* 1. Рамка виділення */}
      <Rect
        x={left}
        y={top}
        width={object.widthCm}
        height={object.heightCm}
        fill="none"
        stroke={primaryColor}
        strokeWidth={strokeW}
        strokeDasharray={`${6 / scale},${4 / scale}`}
      />

      {/* 2. Стрижень ручки повороту */}
      <Line
        x1={cx}
        y1={top}
        x2={cx}
        y2={top - stemLength}
        stroke={primaryColor}
        strokeWidth={strokeW}
      />

      {/* 3. Верхня ручка повороту */}
      <Circle
        cx={cx}
        cy={top - stemLength}
        r={handleRadius}
        fill={primaryColor}
        stroke={handleFill}
        strokeWidth={strokeW}
      />

      {/* 4. Кутові ручки зміни розміру (NW, NE, SE, SW) */}
      <Circle
        cx={left}
        cy={top}
        r={handleRadius}
        fill={handleFill}
        stroke={primaryColor}
        strokeWidth={strokeW}
      />
      <Circle
        cx={right}
        cy={top}
        r={handleRadius}
        fill={handleFill}
        stroke={primaryColor}
        strokeWidth={strokeW}
      />
      <Circle
        cx={right}
        cy={bottom}
        r={handleRadius}
        fill={handleFill}
        stroke={primaryColor}
        strokeWidth={strokeW}
      />
      <Circle
        cx={left}
        cy={bottom}
        r={handleRadius}
        fill={handleFill}
        stroke={primaryColor}
        strokeWidth={strokeW}
      />
    </G>
  );
});
