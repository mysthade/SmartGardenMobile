import React, { useMemo } from 'react';
import { Polygon } from 'react-native-svg';
import { getEffectiveBoundary, type BoundaryPoint } from '@smart-garden/validation';

interface PlotBoundarySvgProps {
  plan: {
    widthCm: number;
    heightCm: number;
    boundary: BoundaryPoint[] | null;
  };
  isDark: boolean;
}

export const PlotBoundarySvg = React.memo(function PlotBoundarySvg({
  plan,
  isDark,
}: PlotBoundarySvgProps) {
  const boundary = useMemo(() => {
    return getEffectiveBoundary(plan);
  }, [plan]);

  const pointsString = useMemo(() => {
    if (!boundary || !boundary.length) return '';
    return boundary.map((p) => `${p.xCm},${p.yCm}`).join(' ');
  }, [boundary]);

  // Кольори ділянки
  const plotFill = isDark ? '#1a2e20' : '#d2e7cf';
  const plotStroke = isDark ? '#274b33' : '#a3c99e';

  if (!pointsString) return null;

  return (
    <Polygon
      points={pointsString}
      fill={plotFill}
      stroke={plotStroke}
      strokeWidth={3}
    />
  );
});
