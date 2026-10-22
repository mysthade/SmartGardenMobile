import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import type { PlannerViewMode } from '../../types';

interface ViewModeSwitcherProps {
  viewMode: PlannerViewMode;
  onSelectMode: (mode: PlannerViewMode) => void;
  theme: ThemeTokens;
}

const MODES: Array<{ id: PlannerViewMode; label: string }> = [
  { id: '2D', label: '2D' },
  { id: '2.5D', label: '2.5D' },
  { id: '3D', label: '3D' },
];

export const ViewModeSwitcher = React.memo(function ViewModeSwitcher({
  viewMode,
  onSelectMode,
  theme,
}: ViewModeSwitcherProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          borderColor: theme.bd,
        },
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Перемикач режимів перегляду"
    >
      {MODES.map((item) => {
        const isActive = viewMode === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Режим ${item.label}`}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={[
              styles.tabBtn,
              isActive && [
                styles.tabBtnActive,
                {
                  backgroundColor: theme.ac,
                  shadowColor: theme.ac,
                },
              ],
            ]}
            onPress={() => onSelectMode(item.id)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? '#ffffff' : theme.tx,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    padding: 2,
    alignSelf: 'center',
  },
  tabBtn: {
    minWidth: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
  },
});
