import { useMemo, useRef } from 'react';
import { PanResponder, type GestureResponderHandlers } from 'react-native';

type CanvasGestureHandlers = GestureResponderHandlers;

type Options = {
  /** Поточний масштаб (для обмеження pinch). */
  getScale: () => number;
  onZoom: (factor: number) => void;
  onPan: (dxPx: number, dyPx: number) => void;
  /** Тап по порожньому місцю (знімає вибір). */
  onTapBackground: () => void;
  /** Чи зараз перетягується маркер (щоб не панити полотно). */
  isDragging: () => boolean;
};

/**
 * Жести самого полотна (не маркерів): пан одним пальцем по порожній області,
 * pinch-zoom двома пальцями (обмежений 0.3–4), тап — знімає вибір.
 * Маркери мають власний PanResponder і блокують пробублінг через capture.
 */
export function useCanvasGestures({
  getScale,
  onZoom,
  onPan,
  onTapBackground,
  isDragging,
}: Options): CanvasGestureHandlers {
  const startDist = useRef<number | null>(null);
  const startScale = useRef(1);
  const moved = useRef(false);
  const pinch = useRef(false);

  return useMemo(() => {
    const distance = (xs: number[], ys: number[]) => {
      const dx = xs[0] - xs[1];
      const dy = ys[0] - ys[1];
      return Math.sqrt(dx * dx + dy * dy);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => !isDragging() && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        moved.current = false;
      },
      onPanResponderMove: (evt, g) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          pinch.current = true;
          const dist = distance(
            [touches[0].pageX, touches[1].pageX],
            [touches[0].pageY, touches[1].pageY],
          );
          if (startDist.current == null) {
            startDist.current = dist;
            startScale.current = getScale();
            return;
          }
          if (startDist.current > 0) {
            const ratio = dist / startDist.current;
            const target = Math.min(4, Math.max(0.3, startScale.current * ratio));
            const factor = target / getScale();
            if (Math.abs(factor - 1) > 0.001) {
              onZoom(factor);
            }
          }
          return;
        }
        if (Math.abs(g.dx) > 1 || Math.abs(g.dy) > 1) {
          moved.current = true;
          onPan(g.dx, g.dy);
        }
      },
      onPanResponderRelease: () => {
        if (!moved.current && !pinch.current) {
          onTapBackground();
        }
        startDist.current = null;
        pinch.current = false;
      },
      onPanResponderTerminate: () => {
        startDist.current = null;
        pinch.current = false;
      },
    }).panHandlers;
  }, [getScale, onZoom, onPan, onTapBackground, isDragging]);
}
