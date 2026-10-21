import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface ScaleBarProps {
  isDark: boolean;
}

export const ScaleBar = React.memo(function ScaleBar({ isDark }: ScaleBarProps) {
  const scale = useGardenPlannerStore((s) => s.view.scale);

  const { barWidthPx, label } = useMemo(() => {
    // Шукаємо красиве кругле значення в метрах (1, 2, 5, 10, 20, 50, 100)
    const meterOptions = [0.5, 1, 2, 5, 10, 20, 50, 100];
    let chosenMeters = 5;

    for (const m of meterOptions) {
      const px = m * 100 * scale;
      if (px >= 50 && px <= 140) {
        chosenMeters = m;
        break;
      }
      if (px > 140) {
        break;
      }
      chosenMeters = m;
    }

    const width = chosenMeters * 100 * scale;
    const text = chosenMeters < 1 ? `${chosenMeters * 100} см` : `${chosenMeters} м`;

    return { barWidthPx: width, label: text };
  }, [scale]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>{label}</Text>
      <View style={[styles.bar, { width: barWidthPx, borderColor: isDark ? '#94a3b8' : '#334155' }]}>
        <View style={[styles.tickLeft, { backgroundColor: isDark ? '#94a3b8' : '#334155' }]} />
        <View style={[styles.tickRight, { backgroundColor: isDark ? '#94a3b8' : '#334155' }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  bar: {
    height: 4,
    borderBottomWidth: 2,
    position: 'relative',
  },
  tickLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 2,
    height: 6,
  },
  tickRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 2,
    height: 6,
  },
});
