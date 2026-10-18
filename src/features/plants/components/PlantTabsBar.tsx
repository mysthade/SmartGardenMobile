import { memo, useRef, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import { PLANT_TABS, type PlantTabKey } from '../lib/plant-helpers';

interface PlantTabsBarProps {
  activeTab: PlantTabKey;
  onSelectTab: (tab: PlantTabKey) => void;
  counts?: Partial<Record<PlantTabKey, number>>;
  theme: ThemeTokens;
}

function PlantTabsBarInner({
  activeTab,
  onSelectTab,
  counts = {},
  theme,
}: PlantTabsBarProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll active tab into view if needed
  }, [activeTab]);

  return (
    <View style={[styles.barContainer, { backgroundColor: theme.pn, borderBottomColor: theme.bd }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PLANT_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}${count !== undefined && count > 0 ? `, ${count}` : ''}`}
              onPress={() => onSelectTab(tab.key)}
              style={[
                styles.tabButton,
                isActive && [styles.activeTabButton, { backgroundColor: theme.ac3, borderColor: theme.ac }],
                !isActive && { borderColor: 'transparent' },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.tabText,
                  { color: isActive ? theme.ac : theme.mu },
                  isActive && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>

              {count !== undefined && count > 0 ? (
                <View
                  style={[
                    styles.counterBadge,
                    { backgroundColor: isActive ? theme.ac : theme.bd },
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.counterText,
                      { color: isActive ? '#ffffff' : theme.tx },
                    ]}
                  >
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const PlantTabsBar = memo(PlantTabsBarInner);

const styles = StyleSheet.create({
  barContainer: {
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  tabButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeTabButton: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  counterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
