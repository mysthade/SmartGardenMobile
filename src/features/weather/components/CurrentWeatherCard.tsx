import { StyleSheet, Text, View } from 'react-native';
import {
  Sun,
  Droplets,
  Wind,
  Thermometer,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Gauge,
  Sprout,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { WeatherData, WeatherSettings } from '../types';
import { getWeatherCodeInfo } from '../lib/weather-codes';
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
} from '../lib/weather-units';

interface CurrentWeatherCardProps {
  weather: WeatherData;
  settings: WeatherSettings;
}

export function CurrentWeatherCard({ weather, settings }: CurrentWeatherCardProps) {
  const { theme } = useTheme();
  const current = weather.current;
  const today = weather.daily[0];

  const codeInfo = getWeatherCodeInfo(current.weatherCode, current.isDay);

  // Render matching lucide icon
  const renderWeatherIcon = () => {
    const size = 64;
    const color = codeInfo.color;
    switch (codeInfo.iconName) {
      case 'sun':
        return <Sun size={size} color={color} />;
      case 'cloud':
        return <Cloud size={size} color={color} />;
      case 'cloud-rain':
        return <CloudRain size={size} color={color} />;
      case 'cloud-drizzle':
        return <CloudDrizzle size={size} color={color} />;
      case 'cloud-snow':
        return <CloudSnow size={size} color={color} />;
      case 'cloud-lightning':
        return <CloudLightning size={size} color={color} />;
      case 'cloud-fog':
        return <CloudFog size={size} color={color} />;
      case 'cloud-sun':
      default:
        return <CloudSun size={size} color={color} />;
    }
  };

  const currentTemp = formatTemperature(current.temperature, settings.tempUnit);
  const feelsLike = formatTemperature(current.apparentTemperature, settings.tempUnit);

  const minTemp = today ? formatTemperature(today.tempMin, settings.tempUnit) : '--';
  const maxTemp = today ? formatTemperature(today.tempMax, settings.tempUnit) : '--';

  // Garden soil data if available
  const currentHourly = weather.hourly[0];
  const hasSoilData =
    typeof currentHourly?.soilTemperature0cm === 'number' ||
    typeof currentHourly?.soilMoisture0to1cm === 'number';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.name === 'dark' ? '#142219' : '#eaf6ee',
          borderColor: theme.bd,
        },
      ]}
    >
      {/* Top Main Section */}
      <View style={styles.topRow}>
        <View style={styles.tempCol}>
          <Text style={[styles.locationLabel, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            {weather.location.name}
          </Text>
          <Text style={[styles.temp, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            {currentTemp}
          </Text>
          <Text style={[styles.condition, { color: theme.ac }]} maxFontSizeMultiplier={1.3}>
            {codeInfo.label}
          </Text>
          <Text style={[styles.feelsLike, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            Відчувається як {feelsLike}
          </Text>
        </View>

        <View style={styles.iconWrap}>{renderWeatherIcon()}</View>
      </View>

      {/* Primary Stats Divider & Row */}
      <View style={[styles.divider, { backgroundColor: theme.bd }]} />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Droplets size={16} color="#2980B9" />
          <Text style={[styles.statValue, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            {current.relativeHumidity}%
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            Вологість
          </Text>
        </View>

        <View style={styles.statItem}>
          <Wind size={16} color="#16A085" />
          <Text style={[styles.statValue, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            {formatWindSpeed(current.windSpeed, settings.windUnit)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            Вітер
          </Text>
        </View>

        <View style={styles.statItem}>
          <Thermometer size={16} color="#C0392B" />
          <Text style={[styles.statValue, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            {minTemp}…{maxTemp}
          </Text>
          <Text style={[styles.statLabel, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            Мін / Макс
          </Text>
        </View>
      </View>

      {/* Secondary Stats Row (Pressure & Rain) */}
      <View style={styles.secondaryStatsRow}>
        <View style={styles.subStatItem}>
          <Gauge size={14} color={theme.mu} />
          <Text style={[styles.subStatText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            Тиск: {Math.round(current.surfacePressure)} гПа
          </Text>
        </View>

        {current.precipitation > 0 && (
          <View style={styles.subStatItem}>
            <Droplets size={14} color="#2980B9" />
            <Text style={[styles.subStatText, { color: '#2980B9' }]} maxFontSizeMultiplier={1.3}>
              Опади: {formatPrecipitation(current.precipitation, settings.precipUnit)}
            </Text>
          </View>
        )}
      </View>

      {/* Garden Agro-Soil Indicators if present */}
      {hasSoilData && (
        <View
          style={[
            styles.soilBox,
            {
              backgroundColor: theme.name === 'dark' ? '#1c2d22' : '#dcf0e2',
              borderColor: theme.bd,
            },
          ]}
        >
          <View style={styles.soilHeader}>
            <Sprout size={14} color={theme.ac} />
            <Text style={[styles.soilTitle, { color: theme.ac }]} maxFontSizeMultiplier={1.3}>
              Ґрунтові показники саду
            </Text>
          </View>
          <View style={styles.soilGrid}>
            {typeof currentHourly?.soilTemperature0cm === 'number' && (
              <View style={styles.soilGridItem}>
                <Text style={[styles.soilItemLabel, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                  Темп. поверхні ґрунту:
                </Text>
                <Text style={[styles.soilItemValue, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                  {formatTemperature(currentHourly.soilTemperature0cm, settings.tempUnit)}
                </Text>
              </View>
            )}
            {typeof currentHourly?.soilMoisture0to1cm === 'number' && (
              <View style={styles.soilGridItem}>
                <Text style={[styles.soilItemLabel, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                  Вологість шару 0–1 см:
                </Text>
                <Text style={[styles.soilItemValue, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                  {Math.round(currentHourly.soilMoisture0to1cm * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tempCol: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  temp: {
    fontSize: 44,
    fontWeight: '800',
    marginTop: 4,
  },
  condition: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  feelsLike: {
    fontSize: 12,
    marginTop: 2,
  },
  iconWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  subStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subStatText: {
    fontSize: 12,
  },
  soilBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  soilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  soilTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  soilGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  soilGridItem: {
    flex: 1,
  },
  soilItemLabel: {
    fontSize: 11,
  },
  soilItemValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
