import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/auth-context';
import { useTheme } from '@/src/theme/theme-context';
import {
  Compass,
  BookOpen,
  Wheat,
  AlertTriangle,
  BarChart3,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react-native';

export default function MoreMenuScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.tx }]}>Меню та сервіси</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Додаткові розділи та налаштування Smart Garden
          </Text>
        </View>
      </View>

      {/* User Card */}
      <View style={[styles.userCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={[styles.avatarWrap, { backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee' }]}>
          <User size={24} color={theme.ac} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.tx }]}>
            {user?.name || 'Садівник'}
          </Text>
          <Text style={[styles.userEmail, { color: theme.mu }]}>{user?.email || ''}</Text>
        </View>
      </View>

      {/* Section: Звітність та аналітика */}
      <Text style={[styles.sectionTitle, { color: theme.mu }]}>ЗВІТНІСТЬ ТА ЖУРНАЛ</Text>
      <View style={[styles.menuBlock, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <MenuItem
          icon={<BookOpen size={20} color="#2980B9" />}
          title="Фото-щоденник"
          subtitle="Записи росту, фото та спостереження"
          onPress={() => router.push('/(app)/journal' as any)}
          theme={theme}
        />
        <View style={[styles.divider, { backgroundColor: theme.bd }]} />
        <MenuItem
          icon={<Wheat size={20} color="#D35400" />}
          title="Облік урожаю"
          subtitle="Фіксація зборів та статистика"
          onPress={() => router.push('/(app)/harvests' as any)}
          theme={theme}
        />
        <View style={[styles.divider, { backgroundColor: theme.bd }]} />
        <MenuItem
          icon={<AlertTriangle size={20} color="#E74C3C" />}
          title="Проблеми та шкідники"
          subtitle="Симптоми, хвороби та лікування"
          onPress={() => router.push('/(app)/problems' as any)}
          theme={theme}
        />
        <View style={[styles.divider, { backgroundColor: theme.bd }]} />
        <MenuItem
          icon={<BarChart3 size={20} color="#8E44AD" />}
          title="Аналітика продуктивності"
          subtitle="Графіки догляду та показники саду"
          onPress={() => router.push('/(app)/analytics' as any)}
          theme={theme}
        />
      </View>

      {/* Section: Планування */}
      <Text style={[styles.sectionTitle, { color: theme.mu }]}>ПЛАНУВАННЯ</Text>
      <View style={[styles.menuBlock, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <MenuItem
          icon={<Compass size={20} color={theme.ac} />}
          title="Планувальник території"
          subtitle="2D/3D схеми ділянки та розташування грядок"
          onPress={() => router.push('/(app)/planner' as any)}
          theme={theme}
        />
      </View>

      {/* Section: Налаштування та тема */}
      <Text style={[styles.sectionTitle, { color: theme.mu }]}>НАЛАШТУВАННЯ</Text>
      <View style={[styles.menuBlock, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <MenuItem
          icon={theme.name === 'dark' ? <Sun size={20} color="#F39C12" /> : <Moon size={20} color="#34495E" />}
          title="Тема оформлення"
          subtitle={theme.name === 'dark' ? 'Темна тема (увімкнено)' : 'Світла тема (увімкнено)'}
          onPress={toggleTheme}
          theme={theme}
        />
      </View>

      {/* Logout */}
      <Pressable
        style={[styles.logoutBtn, { borderColor: theme.bd, backgroundColor: theme.pn }]}
        onPress={() => void handleLogout()}
      >
        <LogOut size={18} color="#C0392B" />
        <Text style={styles.logoutText}>Вийти з облікового запису</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemIcon}>{icon}</View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemTitle, { color: theme.tx }]}>{title}</Text>
        <Text style={[styles.menuItemSubtitle, { color: theme.mu }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={theme.mu} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 50 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },
  menuBlock: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemIcon: { width: 28, alignItems: 'center' },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '700' },
  menuItemSubtitle: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: { color: '#C0392B', fontSize: 15, fontWeight: '700' },
});
