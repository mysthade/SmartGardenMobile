import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers } from 'lucide-react-native';
import type { PlanObjectLayer } from '@smart-garden/types';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface LegendOverlayProps {
  isDark: boolean;
}

const LAYER_CONFIG: Record<PlanObjectLayer, { label: string; color: string }> = {
  BUILDINGS: { label: 'Будівлі', color: '#c0653a' },
  UTILITIES: { label: 'Комунікації', color: '#0284c7' },
  PLANTS: { label: 'Рослини', color: '#16a34a' },
  PATHS: { label: 'Доріжки/Огорожі', color: '#78716c' },
  OTHER: { label: 'Інше', color: '#71717a' },
};

export const LegendOverlay = React.memo(function LegendOverlay({ isDark }: LegendOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const objects = useGardenPlannerStore((s) => s.objects);
  const objectIds = useGardenPlannerStore((s) => s.objectIds);
  const layersVisibility = useGardenPlannerStore((s) => s.layersVisibility);
  const toggleLayerVisibility = useGardenPlannerStore((s) => s.toggleLayerVisibility);

  const layerCounts = useMemo(() => {
    const counts: Record<PlanObjectLayer, number> = {
      BUILDINGS: 0,
      UTILITIES: 0,
      PLANTS: 0,
      PATHS: 0,
      OTHER: 0,
    };
    for (const id of objectIds) {
      const obj = objects[id];
      if (obj && !obj.deleted) {
        counts[obj.layer] = (counts[obj.layer] || 0) + 1;
      }
    }
    return counts;
  }, [objects, objectIds]);

  const totalCount = useMemo(() => {
    return Object.values(layerCounts).reduce((a, b) => a + b, 0);
  }, [layerCounts]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.94)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
        },
      ]}
    >
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Легенда шарів, всього ${totalCount} обʼєктів`}
      >
        <Layers size={14} color={isDark ? '#94a3b8' : '#64748b'} />
        <Text style={[styles.title, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
          Обʼєктів: {totalCount}
        </Text>
        {expanded ? (
          <ChevronUp size={14} color={isDark ? '#94a3b8' : '#64748b'} />
        ) : (
          <ChevronDown size={14} color={isDark ? '#94a3b8' : '#64748b'} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {(Object.keys(LAYER_CONFIG) as PlanObjectLayer[]).map((layer) => {
            const count = layerCounts[layer] || 0;
            const config = LAYER_CONFIG[layer];
            const isVisible = layersVisibility[layer];

            return (
              <Pressable
                key={layer}
                style={[styles.row, !isVisible && { opacity: 0.45 }]}
                onPress={() => toggleLayerVisibility(layer)}
                accessibilityRole="button"
                accessibilityLabel={`${config.label}: ${count} обʼєктів, ${isVisible ? 'видимий' : 'прихований'}`}
              >
                <View style={[styles.dot, { backgroundColor: config.color }]} />
                <Text style={[styles.layerName, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                  {config.label}
                </Text>
                <Text style={[styles.count, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  {count}
                </Text>
                {isVisible ? (
                  <Eye size={12} color={isDark ? '#94a3b8' : '#64748b'} />
                ) : (
                  <EyeOff size={12} color={isDark ? '#ef4444' : '#dc2626'} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  layerName: {
    fontSize: 11,
    flex: 1,
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
});
