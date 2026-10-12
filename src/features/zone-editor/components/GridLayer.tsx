import { memo, useMemo } from 'react';
import { Path } from 'react-native-svg';

type GridLayerProps = {
  widthM: number;
  heightM: number;
  pxPerMeter: number;
  gridStepM: number;
  /** Колір тонких суцільних ліній. */
  minorColor: string;
  /** Колір пунктирних «акцентних» ліній через кожні N кроків. */
  majorColor: string;
};

/**
 * Сітка зони. Малюється одним <Path> для ліній кожного кроку і другим <Path>
 * (пунктир) для акцентних ліній через кожні MAJOR_EVERY кроків — це дешевше,
 * ніж сотні окремих <Line>.
 */
function GridLayerInner({
  widthM,
  heightM,
  pxPerMeter,
  gridStepM,
  minorColor,
  majorColor,
}: GridLayerProps) {
  const { minorPath, majorPath } = useMemo(() => {
    const stepPx = gridStepM * pxPerMeter;
    const w = widthM * pxPerMeter;
    const h = heightM * pxPerMeter;
    if (stepPx <= 0 || w <= 0 || h <= 0) {
      return { minorPath: '', majorPath: '' };
    }

    const vLines = Math.round(widthM / gridStepM);
    const hLines = Math.round(heightM / gridStepM);

    const minor: string[] = [];
    const major: string[] = [];
    for (let i = 1; i < vLines; i++) {
      const x = +(i * stepPx).toFixed(2);
      const d = `M${x} 0L${x} ${h.toFixed(2)}`;
      if (i % MAJOR_EVERY === 0) {
        major.push(d);
      } else {
        minor.push(d);
      }
    }
    for (let j = 1; j < hLines; j++) {
      const y = +(j * stepPx).toFixed(2);
      const d = `M0 ${y}L${w.toFixed(2)} ${y}`;
      if (j % MAJOR_EVERY === 0) {
        major.push(d);
      } else {
        minor.push(d);
      }
    }
    return { minorPath: minor.join(''), majorPath: major.join('') };
  }, [widthM, heightM, pxPerMeter, gridStepM]);

  if (!minorPath && !majorPath) {
    return null;
  }

  return (
    <>
      {minorPath ? (
        <Path d={minorPath} stroke={minorColor} strokeWidth={1} fill="none" />
      ) : null}
      {majorPath ? (
        <Path
          d={majorPath}
          stroke={majorColor}
          strokeWidth={1.5}
          strokeDasharray="6 5"
          fill="none"
        />
      ) : null}
    </>
  );
}

/** Кожна 4-та лінія сітки — «акцентна» (пунктирна зелена). */
const MAJOR_EVERY = 4;

export const GridLayer = memo(GridLayerInner);
