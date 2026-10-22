import React from 'react';
import { G } from 'react-native-svg';
import type { CanvasPlanObject } from '../../types';
import { PlanObjectSvg } from './PlanObjectSvg';

interface StaticObjectsLayerProps {
  objects: CanvasPlanObject[];
  scale: number;
  zoomBucket: number;
  isDark: boolean;
}

export const StaticObjectsLayer = React.memo(function StaticObjectsLayer({
  objects,
  scale,
  zoomBucket,
  isDark,
}: StaticObjectsLayerProps) {
  return (
    <G id="static-objects-layer">
      {objects.map((obj) => (
        <PlanObjectSvg
          key={obj.id}
          object={obj}
          isSelected={false}
          scale={scale}
          zoomBucket={zoomBucket}
          isDark={isDark}
        />
      ))}
    </G>
  );
}, (prev, next) => {
  if (prev.isDark !== next.isDark) return false;
  if (prev.zoomBucket !== next.zoomBucket) return false;
  if (prev.objects !== next.objects) return false;
  return true;
});
