import React, { useMemo } from 'react';
import { Path } from 'react-native-svg';

interface GridSvgProps {
  widthCm: number;
  heightCm: number;
  gridStepCm: number;
  isDark: boolean;
}

/**
 * Оптимізована сітка планувальника:
 * малюється одним <Path> для максимальної швидкості рендеру в SVG.
 */
export const GridSvg = React.memo(function GridSvg({
  widthCm,
  heightCm,
  gridStepCm,
  isDark,
}: GridSvgProps) {
  const { minorPath, majorPath } = useMemo(() => {
    const step = Number.isFinite(gridStepCm) && gridStepCm >= 10 ? gridStepCm : 50;
    const w = Number.isFinite(widthCm) && widthCm > 0 ? widthCm : 2000;
    const h = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 1500;

    let minorD = '';
    let majorD = '';
    const majorStepCm = step * 5;

    // Вертикальні лінії
    for (let x = step; x < w; x += step) {
      const isMajor = x % majorStepCm === 0;
      const segment = `M ${x} 0 L ${x} ${h} `;
      if (isMajor) {
        majorD += segment;
      } else {
        minorD += segment;
      }
    }

    // Горизонтальні лінії
    for (let y = step; y < h; y += step) {
      const isMajor = y % majorStepCm === 0;
      const segment = `M 0 ${y} L ${w} ${y} `;
      if (isMajor) {
        majorD += segment;
      } else {
        minorD += segment;
      }
    }

    return { minorPath: minorD, majorPath: majorD };
  }, [widthCm, heightCm, gridStepCm]);

  const minorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
  const majorColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.20)';

  return (
    <>
      {minorPath ? (
        <Path d={minorPath} stroke={minorColor} strokeWidth={1} fill="none" />
      ) : null}
      {majorPath ? (
        <Path d={majorPath} stroke={majorColor} strokeWidth={1.5} fill="none" />
      ) : null}
    </>
  );
});
