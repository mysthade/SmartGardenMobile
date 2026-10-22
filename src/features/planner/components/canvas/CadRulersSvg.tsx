import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

interface CadRulersSvgProps {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  isDark: boolean;
}

export const CadRulersSvg = React.memo(function CadRulersSvg({
  width,
  height,
  offsetX,
  offsetY,
  scale,
  isDark,
}: CadRulersSvgProps) {
  const rulerSize = 24;

  // Обчислюємо оптимальний крок міток у метрах відповідно до поточного масштабу
  const { stepM, minorDivs } = useMemo(() => {
    const pxPerMeter = scale * 100; // скільки пікселів займає 1 метр на екрані
    if (pxPerMeter >= 140) {
      return { stepM: 0.5, minorDivs: 5 }; // кожні 0.5 м, дрібні кожні 0.1 м
    }
    if (pxPerMeter >= 60) {
      return { stepM: 1, minorDivs: 5 }; // кожні 1 м, дрібні кожні 0.2 м
    }
    if (pxPerMeter >= 25) {
      return { stepM: 2, minorDivs: 4 }; // кожні 2 м
    }
    if (pxPerMeter >= 10) {
      return { stepM: 5, minorDivs: 5 }; // кожні 5 м
    }
    return { stepM: 10, minorDivs: 5 }; // кожні 10 м
  }, [scale]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const border = isDark ? '#334155' : '#cbd5e1';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const minorTickColor = isDark ? '#475569' : '#94a3b8';
  const textColor = isDark ? '#cbd5e1' : '#475569';

  // 1. Горизонтальна лінійка (Top Ruler)
  const topTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    const minM = Math.floor((-offsetX) / (scale * 100 * stepM)) * stepM;
    const maxM = Math.ceil((width - offsetX) / (scale * 100 * stepM)) * stepM;

    for (let m = minM; m <= maxM; m += stepM) {
      const roundedM = Math.round(m * 10) / 10;
      const screenX = roundedM * 100 * scale + offsetX;
      if (screenX >= rulerSize && screenX <= width) {
        ticks.push(
          <G key={`top-tick-${roundedM}`}>
            <Line
              x1={screenX}
              y1={12}
              x2={screenX}
              y2={rulerSize}
              stroke={tickColor}
              strokeWidth={1}
            />
            <SvgText
              x={screenX + 3}
              y={9}
              fill={textColor}
              fontSize={8.5}
              fontWeight="bold"
            >
              {`${roundedM}м`}
            </SvgText>
          </G>,
        );

        // Дрібні засічки
        const minorStepM = stepM / minorDivs;
        for (let sub = 1; sub < minorDivs; sub++) {
          const subScreenX = (roundedM + sub * minorStepM) * 100 * scale + offsetX;
          if (subScreenX >= rulerSize && subScreenX <= width) {
            ticks.push(
              <Line
                key={`top-sub-${roundedM}-${sub}`}
                x1={subScreenX}
                y1={18}
                x2={subScreenX}
                y2={rulerSize}
                stroke={minorTickColor}
                strokeWidth={0.75}
              />,
            );
          }
        }
      }
    }
    return ticks;
  }, [width, offsetX, scale, stepM, minorDivs, tickColor, minorTickColor, textColor]);

  // 2. Вертикальна лінійка (Left Ruler)
  const leftTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    const minM = Math.floor((-offsetY) / (scale * 100 * stepM)) * stepM;
    const maxM = Math.ceil((height - offsetY) / (scale * 100 * stepM)) * stepM;

    for (let m = minM; m <= maxM; m += stepM) {
      const roundedM = Math.round(m * 10) / 10;
      const screenY = roundedM * 100 * scale + offsetY;
      if (screenY >= rulerSize && screenY <= height) {
        ticks.push(
          <G key={`left-tick-${roundedM}`}>
            <Line
              x1={12}
              y1={screenY}
              x2={rulerSize}
              y2={screenY}
              stroke={tickColor}
              strokeWidth={1}
            />
            <SvgText
              x={2}
              y={screenY - 2}
              fill={textColor}
              fontSize={8.5}
              fontWeight="bold"
            >
              {`${roundedM}м`}
            </SvgText>
          </G>,
        );

        // Дрібні засічки
        const minorStepM = stepM / minorDivs;
        for (let sub = 1; sub < minorDivs; sub++) {
          const subScreenY = (roundedM + sub * minorStepM) * 100 * scale + offsetY;
          if (subScreenY >= rulerSize && subScreenY <= height) {
            ticks.push(
              <Line
                key={`left-sub-${roundedM}-${sub}`}
                x1={18}
                y1={subScreenY}
                x2={rulerSize}
                y2={subScreenY}
                stroke={minorTickColor}
                strokeWidth={0.75}
              />,
            );
          }
        }
      }
    }
    return ticks;
  }, [height, offsetY, scale, stepM, minorDivs, tickColor, minorTickColor, textColor]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* Горизонтальна підкладка верхньої лінійки */}
        <Rect x={0} y={0} width={width} height={rulerSize} fill={bg} />
        <Line x1={0} y1={rulerSize} x2={width} y2={rulerSize} stroke={border} strokeWidth={1} />

        {/* Вертикальна підкладка лівої лінійки */}
        <Rect x={0} y={0} width={rulerSize} height={height} fill={bg} />
        <Line x1={rulerSize} y1={0} x2={rulerSize} y2={height} stroke={border} strokeWidth={1} />

        {/* Засічки та числові мітки */}
        {topTicks}
        {leftTicks}

        {/* Кутовий квадрат (0,0) з позначкою одиниці виміру */}
        <Rect x={0} y={0} width={rulerSize} height={rulerSize} fill={bg} />
        <Line x1={rulerSize} y1={0} x2={rulerSize} y2={rulerSize} stroke={border} strokeWidth={1} />
        <Line x1={0} y1={rulerSize} x2={rulerSize} y2={rulerSize} stroke={border} strokeWidth={1} />
        <SvgText
          x={rulerSize / 2}
          y={rulerSize / 2 + 4}
          fill={tickColor}
          fontSize={10}
          fontWeight="bold"
          textAnchor="middle"
        >
          м
        </SvgText>
      </Svg>
    </View>
  );
});
