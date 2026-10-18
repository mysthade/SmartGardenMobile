import { Fragment, memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { computePxPerMeter } from '@/src/features/zone-editor/lib/geometry';
import { api } from '@/src/lib/api';
import { CATEGORY_EMOJI } from '@/src/lib/zone-labels';
import { GridLayer } from './GridLayer';

const MINIMAP_PADDING_DP = 12;
const MIN_MARKER_RADIUS_DP = 7; // Візуальний мінімум 14 dp

type Theme = { name: string; bd: string; mu: string; ac: string };

type Props = {
  zoneId: string;
  /** Максимальна доступна ширина картки (без горизонтальних падінгів). */
  availableWidth: number;
  /** id рослини, підсвіченої зі списку (під час тапу по рядку). */
  highlightedId: string | null;
  onPress: () => void;
  theme: Theme;
};

/**
 * Міні-схема зони в картці (перегляд зі збереженням пропорцій та центруванням).
 * Використовує ту саму геометрію, що й основний редактор.
 */
function ZoneMiniMapInner({ zoneId, availableWidth, highlightedId, onPress, theme }: Props) {
  const layoutQuery = useQuery({
    queryKey: ['bed-layout', zoneId],
    queryFn: () => api.getBedLayout(zoneId),
    enabled: Boolean(zoneId) && availableWidth > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const layout = layoutQuery.data;
  const widthM = Number(layout?.zone.width) || 4;
  const heightM = Number(layout?.zone.height) || 2;

  // Висота слота під міні-схему (від 90 до 190 dp) пропорційно реальному співвідношенню сторін
  const slotHeight = useMemo(() => {
    if (availableWidth <= 0 || widthM <= 0 || heightM <= 0) return 130;
    const aspect = heightM / widthM;
    const computedH = availableWidth * aspect + MINIMAP_PADDING_DP * 2;
    return Math.max(90, Math.min(Math.round(computedH), 190));
  }, [availableWidth, widthM, heightM]);

  // Масштаб через ту саму функцію computePxPerMeter
  const pxPerMeter = useMemo(() => {
    if (availableWidth <= 0 || widthM <= 0 || heightM <= 0) return 1;
    const availW = Math.max(0, availableWidth - MINIMAP_PADDING_DP * 2);
    const availH = Math.max(0, slotHeight - MINIMAP_PADDING_DP * 2);
    return computePxPerMeter({
      stageWidthPx: availW,
      stageHeightPx: availH,
      bedWidthM: widthM,
      bedHeightM: heightM,
      padding: 1.0,
      scale: 1,
    });
  }, [availableWidth, slotHeight, widthM, heightM]);

  const drawW = widthM * pxPerMeter;
  const drawH = heightM * pxPerMeter;
  // Відцентроване розташування зони на міні-карті
  const originX = Math.max(0, (availableWidth - drawW) / 2);
  const originY = Math.max(0, (slotHeight - drawH) / 2);

  const plants = useMemo(
    () => (layout?.plants ?? []).filter((p) => p.positionX != null && p.positionY != null),
    [layout],
  );

  if (availableWidth <= 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrap,
        {
          width: availableWidth,
          height: slotHeight,
          backgroundColor: theme.name === 'dark' ? '#121a15' : '#f2ede4',
          borderColor: theme.bd,
        },
      ]}
    >
      {layoutQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.mu} />
        </View>
      ) : layout ? (
        <Svg width={availableWidth} height={slotHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`mm-${zoneId}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.name === 'dark' ? '#2a3a2c' : '#c7a17a'} />
              <Stop offset="1" stopColor={theme.name === 'dark' ? '#1d2a1f' : '#a97e52'} />
            </LinearGradient>
          </Defs>
          <Rect
            x={originX}
            y={originY}
            width={drawW}
            height={drawH}
            rx={Math.min(10, drawW * 0.04)}
            fill={`url(#mm-${zoneId})`}
            stroke={theme.bd}
            strokeWidth={1}
          />
          <GridLayer
            widthM={widthM}
            heightM={heightM}
            pxPerMeter={pxPerMeter}
            gridStepM={0.25}
            minorColor={theme.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
            majorColor={theme.name === 'dark' ? 'rgba(63,174,109,0.35)' : 'rgba(47,143,87,0.35)'}
            originX={originX}
            originY={originY}
          />
          {plants.map((plant) => {
            const rawPlantSize = Number(plant.size) || 0.4;
            const r = Math.max(MIN_MARKER_RADIUS_DP, (rawPlantSize * pxPerMeter) / 2);
            // Центр маркера клампиться з урахуванням радіуса, щоб не обрізався на краях
            const cx = Math.min(
              Math.max(originX + Number(plant.positionX) * pxPerMeter, originX + r),
              originX + drawW - r,
            );
            const cy = Math.min(
              Math.max(originY + Number(plant.positionY) * pxPerMeter, originY + r),
              originY + drawH - r,
            );
            const active = highlightedId === plant.id;
            const emoji =
              CATEGORY_EMOJI[plant.plantType.category] ?? plant.plantType.name.slice(0, 1);

            return (
              <Fragment key={plant.id}>
                {/* Круглий білий маркер з помаранчевою рамкою */}
                <Rect
                  x={cx - r}
                  y={cy - r}
                  width={r * 2}
                  height={r * 2}
                  rx={r}
                  fill="#ffffff"
                  stroke={active ? theme.ac : '#e67e22'}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <SvgText
                  x={cx}
                  y={cy + r * 0.38}
                  fontSize={Math.max(8, r * 1.1)}
                  textAnchor="middle"
                >
                  {emoji}
                </SvgText>
              </Fragment>
            );
          })}
        </Svg>
      ) : (
        <View style={styles.center}>
          <Pressable onPress={onPress} hitSlop={8}>
            <Text style={[styles.fallbackText, { color: theme.mu }]}>
              Схеми немає · відкрити редактор
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { fontSize: 11, fontWeight: '600' },
});

export const ZoneMiniMap = memo(ZoneMiniMapInner, (prev, next) => {
  return (
    prev.zoneId === next.zoneId &&
    Math.round(prev.availableWidth) === Math.round(next.availableWidth) &&
    prev.highlightedId === next.highlightedId &&
    prev.theme.name === next.theme.name &&
    prev.theme.bd === next.theme.bd &&
    prev.theme.ac === next.theme.ac &&
    prev.theme.mu === next.theme.mu
  );
});
