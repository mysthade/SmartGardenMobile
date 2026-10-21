import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Compass, MapPin } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';

export default function PlannerGatewayScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const gardensQuery = useQuery({
    queryKey: ['gardens', 'list'],
    queryFn: () => api.listGardens({ limit: 50 }),
    staleTime: 30_000,
  });

  const gardens = gardensQuery.data?.data ?? [];

  // If there's only 1 garden, automatically forward to its planner
  useEffect(() => {
    if (!gardensQuery.isLoading && gardens.length === 1 && gardens[0]) {
      router.replace(`/gardens/${gardens[0].id}/planner` as never);
    }
  }, [gardensQuery.isLoading, gardens]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* Safe Area Top */}
      <View style={{ height: insets.top, backgroundColor: theme.pn }} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.pn, borderBottomColor: theme.bd }]}>
        <Pressable
          accessibilityLabel="Назад"
          accessibilityRole="button"
          style={[styles.backBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.tx} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.tx }]}>Планувальник території</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {gardensQuery.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.ac} />
          <Text style={[styles.loadingText, { color: theme.tx }]}>Завантаження садів...</Text>
        </View>
      ) : gardens.length === 0 ? (
        <View style={[styles.centerContainer, { padding: 24 }]}>
          <Compass size={60} color={theme.ac} />
          <Text style={[styles.emptyTitle, { color: theme.tx }]}>Садів ще не створено</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
            Щоб використовувати 2D-планувальник території, спочатку створіть сад у розділі «Сади».
          </Text>
          <Pressable
            style={[styles.btnAction, { backgroundColor: theme.ac }]}
            onPress={() => router.push('/(tabs)/gardens' as never)}
          >
            <Text style={styles.btnActionText}>Перейти до створення саду</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerNotice}>
            <Text style={[styles.noticeTitle, { color: theme.tx }]}>Виберіть сад для планування</Text>
            <Text style={[styles.noticeSubtitle, { color: theme.mu }]}>
              Планувальник дозволяє малювати схеми території, грядки, будівлі та комунікації окремо для кожного саду.
            </Text>
          </View>

          <View style={styles.gardensList}>
            {gardens.map((g) => (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityLabel={`Відкрити планувальник для саду ${g.name}`}
                style={({ pressed }) => [
                  styles.gardenCard,
                  {
                    backgroundColor: theme.pn,
                    borderColor: theme.bd,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => router.push(`/gardens/${g.id}/planner` as never)}
              >
                <View style={[styles.gardenIconWrap, { backgroundColor: theme.ac + '20' }]}>
                  <Compass size={24} color={theme.ac} />
                </View>

                <View style={styles.gardenInfo}>
                  <Text style={[styles.gardenName, { color: theme.tx }]}>{g.name}</Text>
                  {g.locationName ? (
                    <View style={styles.locationRow}>
                      <MapPin size={13} color={theme.mu} />
                      <Text style={[styles.gardenLocation, { color: theme.mu }]}>
                        {g.locationName}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.gardenLocation, { color: theme.mu }]}>
                      Ділянка саду
                    </Text>
                  )}
                </View>

                <ChevronRight size={20} color={theme.mu} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 320,
  },
  btnAction: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerNotice: {
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noticeSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  gardensList: {
    gap: 12,
  },
  gardenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  gardenIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gardenInfo: {
    flex: 1,
  },
  gardenName: {
    fontSize: 15,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  gardenLocation: {
    fontSize: 13,
  },
});
