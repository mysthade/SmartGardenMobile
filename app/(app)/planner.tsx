import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/theme-context';
import { ArrowLeft, Compass, Grid, Layers, Sparkles } from 'lucide-react-native';

export default function PlannerScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={theme.tx} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Планувальник саду</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee',
            borderColor: theme.bd,
          },
        ]}
      >
        <Compass size={24} color={theme.ac} />
        <View style={styles.bannerTextWrap}>
          <Text style={[styles.bannerTitle, { color: theme.tx }]}>2D/3D Схема території</Text>
          <Text style={[styles.bannerDesc, { color: theme.mu }]}>
            Схематичний вигляд ваших грядок та зон з веб-планувальника
          </Text>
        </View>
      </View>

      {/* Grid Canvas Preview */}
      <View style={[styles.canvasCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.canvasHeader}>
          <Text style={[styles.canvasTitle, { color: theme.tx }]}>Активна ділянка</Text>
          <View style={[styles.canvasBadge, { backgroundColor: '#eaf6ee' }]}>
            <Text style={{ color: theme.ac, fontSize: 12, fontWeight: '700' }}>Масштаб 1:50</Text>
          </View>
        </View>

        {/* Visual Map Mockup */}
        <View
          style={[
            styles.schematicCanvas,
            { backgroundColor: theme.name === 'dark' ? '#152019' : '#f0f5f1' },
          ]}
        >
          {/* Zone 1: Теплиця */}
          <View style={[styles.zoneBlock, styles.greenhouse]}>
            <Text style={styles.zoneBlockText}>🏠 Теплиця (3x6м)</Text>
          </View>

          {/* Zone 2: Грядки */}
          <View style={styles.bedsRow}>
            <View style={[styles.zoneBlock, styles.bed]}>
              <Text style={styles.zoneBlockText}>🌱 Томати</Text>
            </View>
            <View style={[styles.zoneBlock, styles.bed]}>
              <Text style={styles.zoneBlockText}>🥒 Огірки</Text>
            </View>
            <View style={[styles.zoneBlock, styles.bed]}>
              <Text style={styles.zoneBlockText}>🥕 Морква</Text>
            </View>
          </View>

          {/* Zone 3: Сад */}
          <View style={[styles.zoneBlock, styles.orchard]}>
            <Text style={styles.zoneBlockText}>🌳 Яблуневий сад</Text>
          </View>
        </View>
      </View>

      {/* Sync tip */}
      <View style={[styles.tipCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <Sparkles size={20} color={theme.ac} />
        <Text style={[styles.tipText, { color: theme.mu }]}>
          Повне 3D редагування з перетягуванням об'єктів оптимізовано для веб-версії Smart Garden на ПК, а тут ви можете переглядати поточну схему та прив'язані рослини.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 18, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700' },
  bannerDesc: { fontSize: 12, marginTop: 2 },
  canvasCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  canvasTitle: { fontSize: 16, fontWeight: '700' },
  canvasBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  schematicCanvas: {
    height: 280,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
  },
  zoneBlock: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenhouse: { backgroundColor: '#76d7c4' },
  bedsRow: { flexDirection: 'row', gap: 8 },
  bed: { flex: 1, backgroundColor: '#82e0aa', paddingVertical: 20 },
  orchard: { backgroundColor: '#58d68d' },
  zoneBlockText: { fontSize: 12, fontWeight: '700', color: '#145a32' },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  tipText: { fontSize: 13, lineHeight: 18, flex: 1 },
});
