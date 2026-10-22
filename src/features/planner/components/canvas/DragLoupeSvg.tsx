import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { CanvasPlanObject } from '../../types';

interface DragLoupeSvgProps {
  touchScreenX: number;
  touchScreenY: number;
  object: CanvasPlanObject;
  scale: number;
  offsetX: number;
  offsetY: number;
  isDark: boolean;
}

export const DragLoupeSvg = React.memo(function DragLoupeSvg({
  touchScreenX,
  touchScreenY,
  object,
  scale,
  offsetX,
  offsetY,
  isDark,
}: DragLoupeSvgProps) {
  const loupeRadius = 52;
  const loupeYOffset = 110;

  // Позиція центру лупи на екрані (над пальцем)
  const loupeCenterX = Math.max(loupeRadius + 10, Math.min(touchScreenX, 500));
  const loupeCenterY = Math.max(loupeRadius + 50, touchScreenY - loupeYOffset);

  // Світові координати об'єкта
  const objCenterX = object.xCm + object.widthCm / 2;
  const objCenterY = object.yCm + object.heightCm / 2;

  // Поточні метричні координати для підпису
  const xM = (object.xCm / 100).toFixed(2);
  const yM = (object.yCm / 100).toFixed(2);

  const bg = isDark ? '#0f172a' : '#ffffff';
  const border = '#0ea5e9';
  const crosshair = isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(2, 132, 199, 0.7)';
  const textColor = isDark ? '#f8fafc' : '#0f172a';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <ClipPath id="loupe-clip">
            <Circle cx={loupeCenterX} cy={loupeCenterY} r={loupeRadius - 2} />
          </ClipPath>
        </Defs>

        {/* Світловод / ніжка-індикатор від пальця до лупи */}
        <Line
          x1={touchScreenX}
          y1={touchScreenY}
          x2={loupeCenterX}
          y2={loupeCenterY + loupeRadius}
          stroke={border}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          opacity={0.6}
        />

        {/* Тінь та зовнішнє кільце лупи */}
        <Circle
          cx={loupeCenterX}
          cy={loupeCenterY}
          r={loupeRadius}
          fill={bg}
          stroke={border}
          strokeWidth={3}
        />

        {/* Вміст зі збільшенням ×3 */}
        <G clipPath="url(#loupe-clip)">
          <G
            transform={`
              translate(${loupeCenterX}, ${loupeCenterY})
              scale(3)
              translate(${-(objCenterX * scale + offsetX)}, ${-(objCenterY * scale + offsetY)})
            `}
          >
            {/* Спрощена ілюстрація об'єкта під лупою */}
            <Rect
              x={object.xCm * scale + offsetX}
              y={object.yCm * scale + offsetY}
              width={object.widthCm * scale}
              height={object.heightCm * scale}
              fill={object.color || '#3b82f6'}
              stroke="#ffffff"
              strokeWidth={1}
            />
          </G>

          {/* Перехрестя лупи */}
          <Line
            x1={loupeCenterX - loupeRadius}
            y1={loupeCenterY}
            x2={loupeCenterX + loupeRadius}
            y2={loupeCenterY}
            stroke={crosshair}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <Line
            x1={loupeCenterX}
            y1={loupeCenterY - loupeRadius}
            x2={loupeCenterX}
            y2={loupeCenterY + loupeRadius}
            stroke={crosshair}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <Circle cx={loupeCenterX} cy={loupeCenterY} r={3} fill={border} />
        </G>

        {/* Числова панель координат під лупою */}
        <Rect
          x={loupeCenterX - 55}
          y={loupeCenterY + loupeRadius - 16}
          width={110}
          height={20}
          rx={5}
          fill={isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'}
          stroke={border}
          strokeWidth={1}
        />
        <SvgText
          x={loupeCenterX}
          y={loupeCenterY + loupeRadius - 2}
          fill={textColor}
          fontSize={10}
          fontWeight="bold"
          textAnchor="middle"
        >
          {`X: ${xM} м  Y: ${yM} м`}
        </SvgText>
      </Svg>
    </View>
  );
});
