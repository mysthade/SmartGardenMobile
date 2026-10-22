import { StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { DailyForecastItem, WeatherSettings } from '../types';
import { getWeatherCodeInfo } from '../lib/weather-codes';
import { formatTemperature } from '../lib/weather-units';

interface DailyForecastListProps {
  daily: DailyForecastItem[];
  settings: WeatherSettings;
}

export function DailyForecastList({ daily, settings }: DailyForecastListProps) {
  const { theme } = useTheme();

  if (!daily || daily.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Calendar size={18} color={theme.ac} />
        <Text style={[styles.sectionTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
          Прогноз на 10 днів
        </Text>
      </View>

      {daily.map((item, idx) => {
        const codeInfo = getWeatherCodeInfo(item.weatherCode);
        const maxTemp = formatTemperature(item.tempMax, settings.tempUnit);
        const minTemp = formatTemperature(item.tempMin, settings.tempUnit);

        const hasRain = item.precipitationProbabilityMax > 0 || item.precipitationSum > 0;
        const rainLabel = item.precipitationSum > 0.5
          ? `${Math.round(item.precipitationSum * 10) / 10} мм`
          : `${item.precipitationProbabilityMax}%`;

        return (
          <View
            key={`${item.date}_${idx}`}
            style={[
              styles.forecastRow,
              {
                backgroundColor: theme.pn,
                borderColor: theme.bd,
              },
            ]}
          >
            <View style={styles.dayCol}>
              <Text
                style={[styles.forecastDay, { color: theme.tx }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.3}
              >
                {item.dayLabel}
              </Text>
              {typeof item.uvIndexMax === 'number' && item.uvIndexMax >= 3 && (
                <Text style={styles.uvText} maxFontSizeMultiplier={1.3}>
                  УФ: {Math.round(item.uvIndexMax)}
                </Text>
              )}
            </View>

            <Text style={styles.forecastIcon}>{codeInfo.emoji}</Text>

            <View style={styles.rainCol}>
              {hasRain ? (
                <Text style={styles.forecastRain} maxFontSizeMultiplier={1.3}>
                  💧 {rainLabel}
                </Text>
              ) : (
                <Text style={[styles.forecastNoRain, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                  Без опадів
                </Text>
              )}
            </View>

            <Text style={[styles.forecastTemp, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
              {maxTemp} / {minTemp}
            </Text>
          </View>
        );
      })}
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
  dayCol: {
    width: 95,
  },
  forecastDay: {
    fontSize: 15,
    fontWeight: '600',
  },
  uvText: {
    fontSize: 11,
    color: '#E67E22',
    fontWeight: '700',
    marginTop: 2,
  },
  forecastIcon: {
    fontSize: 22,
  },
  rainCol: {
    width: 85,
    alignItems: 'flex-start',
  },
  forecastRain: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2980B9',
  },
  forecastNoRain: {
    fontSize: 11,
  },
  forecastTemp: {
    fontSize: 14,
    fontWeight: '700',
  },
});
