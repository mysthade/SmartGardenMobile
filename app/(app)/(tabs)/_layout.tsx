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
          height: Platform.OS === 'ios' ? 88 : 70 + (insets.bottom > 0 ? insets.bottom : 4),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.06,
          shadowRadius: 6,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Огляд',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="gardens"
        options={{
          title: 'Сади',
          tabBarIcon: ({ color }) => <Trees size={22} color={color} strokeWidth={2.2} />,
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
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Погода',
          tabBarIcon: ({ color }) => <CloudSun size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Більше',
          tabBarIcon: ({ color }) => <Menu size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
