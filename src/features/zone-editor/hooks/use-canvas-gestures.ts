import { useMemo } from 'react';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

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

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
/** Поріг руху для початку пану (px). */
const PAN_MIN_DISTANCE = 3;
/** Мінімальна відносна зміна масштабу, щоб вважати pinch активним. */
const ZOOM_EPSILON = 0.001;

/**
 * Жести самого полотна (не маркерів): пан одним пальцем по порожній області,
 * pinch-zoom двома пальцями (обмежений 0.3–4), тап — знімає вибір.
 * Маркери мають власні дочірні GestureDetector, тож отримують пріоритет.
 *
 * Синхронні колбеки JS (стейт стору) викликаються через runOnJS, бо самі
 * колбеки жестів виконуються в worklet-потоці UI-нитки.
 */
export function useCanvasGestures({
  getScale,
  onZoom,
  onPan,
  onTapBackground,
  isDragging,
}: Options): ComposedGesture {
  // Попередні значення translation, щоб рахувати інкремент кожного кадру.
  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);
  // Попередній cumulative scale жесту pinch (для відносного фактору).
  const prevScale = useSharedValue(1);

  return useMemo(() => {
    /** Застосовує фактор масштабу з клампом 0.3–4 (на JS-стороні). */
    const applyZoom = (rawFactor: number) => {
      const current = getScale();
      const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * rawFactor));
      const factor = target / current;
      if (Math.abs(factor - 1) > ZOOM_EPSILON) {
        onZoom(factor);
      }
    };

    const pan = Gesture.Pan()
      .minDistance(PAN_MIN_DISTANCE)
      .maxPointers(1)
      .onStart(() => {
        'worklet';
        prevTX.value = 0;
        prevTY.value = 0;
      })
      .onUpdate((e) => {
        'worklet';
        if (isDragging()) {
          return;
        }
        const dx = e.translationX - prevTX.value;
        const dy = e.translationY - prevTY.value;
        prevTX.value = e.translationX;
        prevTY.value = e.translationY;
        if (dx !== 0 || dy !== 0) {
          runOnJS(onPan)(dx, dy);
        }
      });

    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        prevScale.value = 1;
      })
      .onUpdate((e) => {
        'worklet';
        const raw = e.scale / prevScale.value;
        prevScale.value = e.scale;
        if (Math.abs(raw - 1) > ZOOM_EPSILON) {
          runOnJS(applyZoom)(raw);
        }
      });

    const tapBackground = Gesture.Tap()
      .maxDuration(300)
      .onEnd((_e, success) => {
        'worklet';
        if (success) {
          runOnJS(onTapBackground)();
        }
      });

    // Пан/пінч працюють одночасно (різна кількість пальців); тап — запасний варіант.
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tapBackground);
  }, [getScale, onZoom, onPan, onTapBackground, isDragging, prevTX, prevTY, prevScale]);
}
