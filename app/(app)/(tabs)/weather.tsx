import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { useTheme } from '@/src/theme/theme-context';
import {
  CloudSun,
  Sun,
  Droplets,
  Wind,
  Thermometer,
  ShieldAlert,
  Sparkles,
  Calendar,
} from 'lucide-react-native';

export default function WeatherScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const weatherQuery = useQuery({
    queryKey: ['weather', 'current'],
    queryFn: async () => {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=50.4501&longitude=30.5234&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto'
      );
      if (!res.ok) throw new Error('Помилка завантаження погоди');
      const data = await res.json();
      return {
        temperature: data.current?.temperature_2m ?? 21,
        humidity: data.current?.relative_humidity_2m ?? 58,
        windSpeed: data.current?.wind_speed_10m ?? 3.5,
        condition: 'Сонячно з проясненнями',
      };
    },
    staleTime: 5 * 60_000,
  });

  const weather = weatherQuery.data;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={weatherQuery.isRefetching}
          onRefresh={() => void weatherQuery.refetch()}
          tintColor={theme.ac}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.tx }]}>Погода та рекомендації</Text>
          <Text style={[styles.subtitle, { color: theme.mu }]}>
            Метеорологічні дані для планування робіт
          </Text>
        </View>
      </View>

      {/* Main Weather Card */}
      <View
        style={[
          styles.mainWeatherCard,
          {
            backgroundColor: theme.name === 'dark' ? '#142219' : '#eaf6ee',
            borderColor: theme.bd,
          },
        ]}
      >
        <View style={styles.weatherTopRow}>
          <View>
            <Text style={[styles.location, { color: theme.mu }]}>Київ та область</Text>
            <Text style={[styles.temp, { color: theme.tx }]}>
              {weather ? `${Math.round(weather.temperature)}°C` : '+21°C'}
            </Text>
            <Text style={[styles.condition, { color: theme.ac }]}>
              {weather?.condition ?? 'Сонячно з проясненнями'}
            </Text>
          </View>
          <Sun size={64} color="#F39C12" />
        </View>

        {/* Stats Row */}
        <View style={[styles.statsDivider, { backgroundColor: theme.bd }]} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Droplets size={16} color="#2980B9" />
            <Text style={[styles.statValue, { color: theme.tx }]}>
              {weather?.humidity ?? '58'}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.mu }]}>Вологість</Text>
          </View>
          <View style={styles.statItem}>
            <Wind size={16} color="#16A085" />
            <Text style={[styles.statValue, { color: theme.tx }]}>
              {weather?.windSpeed ?? '3.5'} м/с
            </Text>
            <Text style={[styles.statLabel, { color: theme.mu }]}>Вітер</Text>
          </View>
          <View style={styles.statItem}>
            <Thermometer size={16} color="#C0392B" />
            <Text style={[styles.statValue, { color: theme.tx }]}>+14°…+23°</Text>
            <Text style={[styles.statLabel, { color: theme.mu }]}>Мін / Макс</Text>
          </View>
        </View>
      </View>

      {/* Agro Tips */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Sparkles size={18} color={theme.ac} />
          <Text style={[styles.sectionTitle, { color: theme.tx }]}>Садівничі поради на сьогодні</Text>
        </View>
      </View>

      <View style={[styles.tipCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={[styles.tipIconWrap, { backgroundColor: '#eaf6ee' }]}>
          <Droplets size={20} color="#2F8F57" />
        </View>
        <View style={styles.tipContent}>
          <Text style={[styles.tipTitle, { color: theme.tx }]}>Режим поливу</Text>
          <Text style={[styles.tipText, { color: theme.mu }]}>
            Сьогодні низька ймовірність опадів. Рекомендується вечірній полив кореневої зони томатів і перцю.
          </Text>
        </View>
      </View>

      <View style={[styles.tipCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={[styles.tipIconWrap, { backgroundColor: '#fef5e7' }]}>
          <ShieldAlert size={20} color="#D35400" />
        </View>
        <View style={styles.tipContent}>
          <Text style={[styles.tipTitle, { color: theme.tx }]}>Захист від шкідників</Text>
          <Text style={[styles.tipText, { color: theme.mu }]}>
            Помірний вітер (до 4 м/с) дозволяє проводити біологічну обробку листя в ранкові години.
          </Text>
        </View>
      </View>

      {/* 5-day Forecast */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Calendar size={18} color={theme.ac} />
          <Text style={[styles.sectionTitle, { color: theme.tx }]}>Прогноз на найближчі дні</Text>
        </View>
      </View>

      {[
        { day: 'Сьогодні', icon: '☀️', temp: '+21° / +14°', rain: '10%' },
        { day: 'Завтра', icon: '⛅', temp: '+22° / +15°', rain: '25%' },
        { day: 'Середа', icon: '🌦️', temp: '+19° / +12°', rain: '65%' },
        { day: 'Четвер', icon: '☀️', temp: '+20° / +11°', rain: '15%' },
        { day: 'Пʼятниця', icon: '🌤️', temp: '+23° / +13°', rain: '20%' },
      ].map((item, idx) => (
        <View
          key={idx}
          style={[styles.forecastRow, { backgroundColor: theme.pn, borderColor: theme.bd }]}
        >
          <Text style={[styles.forecastDay, { color: theme.tx }]}>{item.day}</Text>
          <Text style={styles.forecastIcon}>{item.icon}</Text>
          <Text style={[styles.forecastRain, { color: '#2980B9' }]}>💧 {item.rain}</Text>
          <Text style={[styles.forecastTemp, { color: theme.tx }]}>{item.temp}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  mainWeatherCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: { fontSize: 13, fontWeight: '600' },
  temp: { fontSize: 42, fontWeight: '800', marginTop: 4 },
  condition: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  statsDivider: { height: 1, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  sectionHeader: { marginTop: 12, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  tipIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  forecastDay: { fontSize: 15, fontWeight: '600', width: 90 },
  forecastIcon: { fontSize: 20 },
  forecastRain: { fontSize: 13, fontWeight: '600', width: 70 },
  forecastTemp: { fontSize: 14, fontWeight: '700' },
});
