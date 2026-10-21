import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Compass } from 'lucide-react-native';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface NorthArrowProps {
  isDark: boolean;
}

export const NorthArrow = React.memo(function NorthArrow({ isDark }: NorthArrowProps) {
  const northAngleDeg = useGardenPlannerStore((s) => s.plan.northAngleDeg);
  const setNorthAngle = useGardenPlannerStore((s) => s.setNorthAngle);

  const handlePress = () => {
    // Циклічний поворот півночі на 90 градусів або скидання
    const nextAngle = (northAngleDeg + 90) % 360;
    setNorthAngle(nextAngle);
  };

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
        },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Північ: ${northAngleDeg}°`}
    >
      <View style={{ transform: [{ rotate: `${northAngleDeg}deg` }] }}>
        <Compass size={22} color="#ef4444" />
      </View>
      <Text style={[styles.label, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>Пн</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: -2,
  },
});
