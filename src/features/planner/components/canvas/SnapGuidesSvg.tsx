import React from 'react';
import { G, Line } from 'react-native-svg';
import type { SnapGuide } from '@smart-garden/validation';

interface SnapGuidesSvgProps {
  guides: SnapGuide[];
  scale: number;
}

export const SnapGuidesSvg = React.memo(function SnapGuidesSvg({
  guides,
  scale,
}: SnapGuidesSvgProps) {
  if (!guides.length) return null;

  const strokeW = Math.max(1, 1.5 / scale);

  return (
    <G id="snap-guides-overlay">
      {guides.map((g, idx) => {
        if (g.type === 'vertical') {
          return (
            <Line
              key={`guide-${idx}`}
              x1={g.posCm}
              y1={g.startCm}
              x2={g.posCm}
              y2={g.endCm}
              stroke="#f59e0b"
              strokeWidth={strokeW}
              strokeDasharray={`${6 / scale},${4 / scale}`}
            />
          );
        }
        return (
          <Line
            key={`guide-${idx}`}
            x1={g.startCm}
            y1={g.posCm}
            x2={g.endCm}
            y2={g.posCm}
            stroke="#f59e0b"
            strokeWidth={strokeW}
            strokeDasharray={`${6 / scale},${4 / scale}`}
          />
        );
      })}
    </G>
  );
});
