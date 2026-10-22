import React, { useMemo } from 'react';
import { Path } from 'react-native-svg';

interface GridSvgProps {
  widthCm: number;
  heightCm: number;
  gridStepCm: number;
  scale?: number;
  isDark: boolean;
}

/**
 * Отримує квантований рівень зуму (0.1м, 0.5м, 1м, 5м або 10м)
 * для запобігання перемальовуванню <Path> під час плавного жесту зуму.
 */
function getQuantizedGridStep(scale: number): { minorStepCm: number; majorStepCm: number } {
  if (scale >= 0.7) {
    return { minorStepCm: 10, majorStepCm: 50 }; // 0.1 м та 0.5 м
  }
  if (scale >= 0.28) {
    return { minorStepCm: 50, majorStepCm: 250 }; // 0.5 м та 2.5 м
  }
  if (scale >= 0.09) {
    return { minorStepCm: 100, majorStepCm: 500 }; // 1.0 м та 5.0 м
  }
  return { minorStepCm: 500, majorStepCm: 1000 }; // 5.0 м та 10.0 м
}

export const GridSvg = React.memo(function GridSvg({
  widthCm,
  heightCm,
  gridStepCm: _gridStepCm,
  scale = 0.25,
  isDark,
}: GridSvgProps) {
  const { minorStepCm, majorStepCm } = useMemo(
    () => getQuantizedGridStep(scale),
    [Math.round(scale >= 0.7 ? 3 : scale >= 0.28 ? 2 : scale >= 0.09 ? 1 : 0)],
  );

  const { minorPath, majorPath } = useMemo(() => {
    const w = Number.isFinite(widthCm) && widthCm > 0 ? widthCm : 2000;
    const h = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 1500;

    let minorD = '';
    let majorD = '';

    // Вертикальні лінії
    for (let x = minorStepCm; x < w; x += minorStepCm) {
      const isMajor = x % majorStepCm === 0;
      const segment = `M ${x} 0 L ${x} ${h} `;
      if (isMajor) {
        majorD += segment;
      } else {
        minorD += segment;
      }
    }

    // Горизонтальні лінії
    for (let y = minorStepCm; y < h; y += minorStepCm) {
      const isMajor = y % majorStepCm === 0;
      const segment = `M 0 ${y} L ${w} ${y} `;
      if (isMajor) {
        majorD += segment;
      } else {
        minorD += segment;
      }
    }

    return { minorPath: minorD, majorPath: majorD };
  }, [widthCm, heightCm, minorStepCm, majorStepCm]);

  // Дрібний рівень ледь помітний, крупний виразніший
  const minorColor = isDark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(0, 0, 0, 0.04)';
  const majorColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.14)';
  const minorStrokeW = Math.max(0.7, 0.9 / scale);
  const majorStrokeW = Math.max(1.1, 1.4 / scale);

  return (
    <>
      {minorPath ? (
        <Path d={minorPath} stroke={minorColor} strokeWidth={minorStrokeW} fill="none" />
      ) : null}
      {majorPath ? (
        <Path d={majorPath} stroke={majorColor} strokeWidth={majorStrokeW} fill="none" />
      ) : null}
    </>
  );
}, (prev, next) => {
  if (prev.isDark !== next.isDark) return false;
  if (prev.widthCm !== next.widthCm || prev.heightCm !== next.heightCm) return false;
  const pBucket = prev.scale ? (prev.scale >= 0.7 ? 3 : prev.scale >= 0.28 ? 2 : prev.scale >= 0.09 ? 1 : 0) : 0;
  const nBucket = next.scale ? (next.scale >= 0.7 ? 3 : next.scale >= 0.28 ? 2 : next.scale >= 0.09 ? 1 : 0) : 0;
  return pBucket === nBucket;
});

