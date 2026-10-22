import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ThemeTokens } from '@/src/theme/tokens';
import type { HarvestMonthlyPoint } from '../lib/harvest-calculations';

interface HarvestChartsSvgProps {
  monthlyData: HarvestMonthlyPoint[];
  theme: ThemeTokens;
  year: number;
}

type ChartMetric = 'mass' | 'pieces' | 'liters';

function HarvestChartsSvgInner({ monthlyData, theme, year }: HarvestChartsSvgProps) {
  const [metric, setMetric] = useState<ChartMetric>('mass');

  const unitLabel = metric === 'mass' ? 'кг' : metric === 'pieces' ? 'шт' : 'л';

  const values = monthlyData.map((d) => (metric === 'mass' ? d.massKg : metric === 'pieces' ? d.pieces : d.liters));
  const rawMax = Math.max(...values, 1);
  const maxVal = Math.ceil(rawMax * 1.15);

  const chartHeight = 180;
  const chartWidth = 320;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 28;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const barWidth = Math.max(16, innerWidth / monthlyData.length - 12);

  // Y-axis ticks
  const yTicks = [
    { value: maxVal, y: paddingTop },
    { value: Math.round(maxVal / 2), y: paddingTop + innerHeight / 2 },
    { value: 0, y: paddingTop + innerHeight },
  ];

  // Cumulative line points
  const cumPoints = monthlyData.map((d, index) => {
    const val = metric === 'mass' ? d.massKg : metric === 'pieces' ? d.pieces : d.liters;
    const x = paddingLeft + (index + 0.5) * (innerWidth / monthlyData.length);
    const y = paddingTop + innerHeight - (maxVal > 0 ? (val / maxVal) * innerHeight : 0);
    return { x, y, val };
  });

  const pathD = cumPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const totalSum = values.reduce((a, b) => a + b, 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
      {/* Metric Selector Tabs */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.tx }]}>Динаміка збору ({year})</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Всього за сезон: {Math.round(totalSum * 10) / 10} {unitLabel}
          </Text>
        </View>

        <View style={styles.segmentWrap}>
          {(
            [
              { key: 'mass', label: 'Маса (кг)' },
              { key: 'pieces', label: 'Штуки' },
              { key: 'liters', label: 'Літри' },
            ] as const
          ).map((t) => {
            const isSelected = metric === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setMetric(t.key)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: isSelected ? theme.ac : theme.bg,
                    borderColor: isSelected ? theme.ac : theme.bd,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: isSelected ? '#ffffff' : theme.tx },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgContainer}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Horizontal Grid lines */}
          {yTicks.map((tick, i) => (
            <Line
              key={i}
              x1={paddingLeft}
              y1={tick.y}
              x2={chartWidth - paddingRight}
              y2={tick.y}
              stroke={theme.bd}
              strokeDasharray={i === 2 ? undefined : '3 3'}
              strokeWidth={i === 2 ? '1.5' : '1'}
            />
          ))}

          {/* Y Axis text labels */}
          {yTicks.map((tick, i) => (
            <SvgText
              key={i}
              x={paddingLeft - 6}
              y={tick.y + 4}
              fontSize="10"
              fontWeight="600"
              fill={theme.mu}
              textAnchor="end"
            >
              {tick.value}
            </SvgText>
          ))}

          {/* Bars */}
          {monthlyData.map((d, index) => {
            const val = metric === 'mass' ? d.massKg : metric === 'pieces' ? d.pieces : d.liters;
            const barHeight = maxVal > 0 ? (val / maxVal) * innerHeight : 0;
            const x = paddingLeft + index * (innerWidth / monthlyData.length) + (innerWidth / monthlyData.length - barWidth) / 2;
            const y = paddingTop + innerHeight - barHeight;

            return (
              <View key={d.period}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, val > 0 ? 3 : 0)}
                  rx="4"
                  ry="4"
                  fill={val > 0 ? theme.ac : 'transparent'}
                />

                {/* Top value label */}
                {val > 0 ? (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 5}
                    fontSize="10"
                    fontWeight="700"
                    fill={theme.tx}
                    textAnchor="middle"
                  >
                    {val}
                  </SvgText>
                ) : null}

                {/* Month label on bottom */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight - 8}
                  fontSize="11"
                  fontWeight="600"
                  fill={theme.mu}
                  textAnchor="middle"
                >
                  {d.monthLabel}
                </SvgText>
              </View>
            );
          })}

          {/* Cumulative trend line */}
          {pathD && totalSum > 0 ? (
            <Path
              d={pathD}
              fill="none"
              stroke="#D35400"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ) : null}

          {/* Trend dots */}
          {totalSum > 0 && cumPoints.map((pt, idx) => (
            pt.val > 0 ? (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="#D35400"
              />
            ) : null
          ))}
        </Svg>
      </View>
    </View>
  );
}

export const HarvestChartsSvg = memo(HarvestChartsSvgInner);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 14,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
