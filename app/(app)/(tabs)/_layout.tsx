import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Trees, ClipboardList, CloudSun, Menu } from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import { useDashboardSummary } from '@/src/hooks/use-dashboard-summary';

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const summary = useDashboardSummary();

  const tasksBadge = summary.data?.tasksTodayCount && summary.data.tasksTodayCount > 0
    ? summary.data.tasksTodayCount
    : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.ac,
        tabBarInactiveTintColor: theme.mu,
        tabBarStyle: {
          backgroundColor: theme.pn,
          borderTopColor: theme.bd,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Огляд',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="gardens"
        options={{
          title: 'Сади',
          tabBarIcon: ({ color, size }) => <Trees size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Завдання',
          tabBarBadge: tasksBadge,
          tabBarBadgeStyle: {
            backgroundColor: theme.ac,
            color: '#ffffff',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Погода',
          tabBarIcon: ({ color, size }) => <CloudSun size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Більше',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
