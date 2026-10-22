import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { HourlyForecastItem, WeatherSettings } from '../types';
import { getWeatherCodeInfo } from '../lib/weather-codes';
import { formatTemperature } from '../lib/weather-units';

interface HourlyForecastScrollProps {
  hourly: HourlyForecastItem[];
  settings: WeatherSettings;
}

export function HourlyForecastScroll({ hourly, settings }: HourlyForecastScrollProps) {
  const { theme } = useTheme();

  if (!hourly || hourly.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Clock size={18} color={theme.ac} />
        <Text style={[styles.sectionTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
          Погодинний прогноз на 48 годин
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {hourly.map((item, idx) => {
          const codeInfo = getWeatherCodeInfo(item.weatherCode ?? 0);
          const temp = formatTemperature(item.temperature, settings.tempUnit);
          const hasRain = item.precipitationProbability > 0 || item.precipitation > 0;

          return (
            <View
              key={`${item.isoTime}_${idx}`}
              style={[
                styles.hourlyCard,
                {
                  backgroundColor: theme.pn,
                  borderColor: theme.bd,
                },
              ]}
            >
              <Text style={[styles.timeText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                {item.time}
              </Text>

              <Text style={styles.emojiText}>{codeInfo.emoji}</Text>

              <Text style={[styles.tempText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                {temp}
              </Text>

              {hasRain ? (
                <Text style={styles.rainText} maxFontSizeMultiplier={1.3}>
                  💧 {item.precipitationProbability}%
                </Text>
              ) : (
                <Text style={[styles.windText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                  {Math.round(item.windSpeed)} м/с
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollList: {
    gap: 10,
    paddingRight: 10,
  },
  hourlyCard: {
    width: 78,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emojiText: {
    fontSize: 22,
    marginVertical: 4,
  },
  tempText: {
    fontSize: 15,
    fontWeight: '800',
  },
  rainText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2980B9',
    marginTop: 4,
  },
  windText: {
    fontSize: 11,
    marginTop: 4,
  },
});
