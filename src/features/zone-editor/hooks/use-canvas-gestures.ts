import { useMemo } from 'react';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import { runOnJS, type SharedValue } from 'react-native-reanimated';

type Options = {
  /** Поточний масштаб (для обмеження pinch). */
  getScale: () => number;
  onZoomEnd: (factor: number) => void;
  onPanEnd: (dxPx: number, dyPx: number) => void;
  /** Тап по порожньому місцю (знімає вибір). */
  onTapBackground: () => void;
  /** SharedValue прапорця перетягування маркера (щоб не панити полотно на UI-ниті). */
  isDragging?: SharedValue<boolean>;
  /** SharedValues для переміщення полотна на UI-потоці без ререндерів React. */
  panTranslateX: SharedValue<number>;
  panTranslateY: SharedValue<number>;
  pinchScale: SharedValue<number>;
};

/** Поріг руху для початку пану (px). */
const PAN_MIN_DISTANCE = 3;
/** Мінімальна відносна зміна масштабу, щоб вважати pinch активним. */
const ZOOM_EPSILON = 0.001;

/**
 * Жести самого полотна (не маркерів): пан одним пальцем по порожній області,
 * pinch-zoom двома пальцями (обмежений 0.3–4), тап — знімає вибір.
 * Рух та масштабування виконуються на UI-потоці через SharedValues,
 * а фіксація у стейт стору — лише на завершенні жесту.
 */
export function useCanvasGestures({
  getScale,
  onZoomEnd,
  onPanEnd,
  onTapBackground,
  isDragging,
  panTranslateX,
  panTranslateY,
  pinchScale,
}: Options): ComposedGesture {
  return useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(PAN_MIN_DISTANCE)
      .maxPointers(1)
      .onStart(() => {
        'worklet';
        panTranslateX.value = 0;
        panTranslateY.value = 0;
      })
      .onUpdate((e) => {
        'worklet';
        if (isDragging && isDragging.value) {
          return;
        }
        panTranslateX.value = e.translationX;
        panTranslateY.value = e.translationY;
      })
      .onEnd((e) => {
        'worklet';
        if (isDragging && isDragging.value) {
          return;
        }
        const dx = e.translationX;
        const dy = e.translationY;
        panTranslateX.value = 0;
        panTranslateY.value = 0;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          runOnJS(onPanEnd)(dx, dy);
        }
      })
      .onFinalize(() => {
        'worklet';
        panTranslateX.value = 0;
        panTranslateY.value = 0;
      });

    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        pinchScale.value = 1;
      })
      .onUpdate((e) => {
        'worklet';
        if (e.scale > 0 && Number.isFinite(e.scale)) {
          pinchScale.value = e.scale;
        }
      })
      .onEnd((e) => {
        'worklet';
        const rawScale = e.scale;
        pinchScale.value = 1;
        if (Number.isFinite(rawScale) && rawScale > 0 && Math.abs(rawScale - 1) > ZOOM_EPSILON) {
          runOnJS(onZoomEnd)(rawScale);
        }
      })
      .onFinalize(() => {
        'worklet';
        pinchScale.value = 1;
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
  }, [
    getScale,
    onZoomEnd,
    onPanEnd,
    onTapBackground,
    isDragging,
    panTranslateX,
    panTranslateY,
    pinchScale,
  ]);
}

