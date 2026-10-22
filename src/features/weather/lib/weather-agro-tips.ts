import type { AgroTip, DailyForecastItem, CurrentWeather, HourlyForecastItem } from '../types';

export const AGRO_THRESHOLDS = {
  FROST_TEMP_MAX: 0, // <= 0°C
  FROST_DAYS_AHEAD: 3,
  HEAT_TEMP_MIN: 30, // > 30°C
  STRONG_WIND_SPEED_MS: 10, // > 10 m/s
  STORM_GUSTS_MS: 15, // > 15 m/s
  RAIN_PRECIP_THRESHOLD_MM: 5, // >= 5mm today
  RAIN_PROBABILITY_THRESHOLD_PCT: 65, // >= 65%
  HAIL_STORM_CODES: [95, 96, 99],
  DRY_SOIL_MOISTURE_M3M3: 0.22, // < 0.22 m3/m3
  HIGH_ET0_MM_DAY: 4.0, // > 4 mm/day
};

export function generateAgroTips(
  current: CurrentWeather,
  daily: DailyForecastItem[],
  hourly: HourlyForecastItem[]
): AgroTip[] {
  const tips: AgroTip[] = [];

  // 1. Frost Warning (next 3 nights)
  const next3Days = daily.slice(0, AGRO_THRESHOLDS.FROST_DAYS_AHEAD);
  const frostDay = next3Days.find((d) => d.tempMin <= AGRO_THRESHOLDS.FROST_TEMP_MAX);
  if (frostDay) {
    tips.push({
      id: 'tip-frost',
      type: 'frost',
      severity: 'alert',
      title: 'Загроза заморозків',
      description: `Очікується зниження температури до ${Math.round(frostDay.tempMin)}°C (${frostDay.dayLabel}). Рекомендується укрити агроволокном теплолюбні культури та чутливу розсаду.`,
      iconName: 'thermometer-snowflake',
      bgColorLight: '#FADBD8',
      bgColorDark: '#3A1E1D',
      iconColor: '#C0392B',
    });
  }

  // 2. Heat Wave (> 30°C)
  const todayOrTomorrow = daily.slice(0, 2);
  const hotDay = todayOrTomorrow.find((d) => d.tempMax >= AGRO_THRESHOLDS.HEAT_TEMP_MIN);
  if (hotDay) {
    tips.push({
      id: 'tip-heat',
      type: 'heat',
      severity: 'warning',
      title: 'Спекотна погода',
      description: `Максимальна температура сягне +${Math.round(hotDay.tempMax)}°C. Подбайте про притінення чутливих рослин, мульчування ґрунту та полив виключно на світанку або ввечері.`,
      iconName: 'sun',
      bgColorLight: '#FDEBD0',
      bgColorDark: '#3E2F13',
      iconColor: '#D35400',
    });
  }

  // 3. Hail / Severe Thunderstorm Alert
  const todayStorm = AGRO_THRESHOLDS.HAIL_STORM_CODES.includes(current.weatherCode) ||
    (daily[0] && AGRO_THRESHOLDS.HAIL_STORM_CODES.includes(daily[0].weatherCode));
  if (todayStorm) {
    tips.push({
      id: 'tip-storm',
      type: 'storm',
      severity: 'alert',
      title: 'Гроза та ризик граду',
      description: 'Висока ймовірність грози з можливим градом та шквалами. Захистіть плівкові теплиці, перевірте кріплення високих рослин.',
      iconName: 'cloud-lightning',
      bgColorLight: '#EBDEF0',
      bgColorDark: '#2C1B38',
      iconColor: '#8E44AD',
    });
  }

  // 4. Strong Wind
  if (current.windSpeed >= AGRO_THRESHOLDS.STRONG_WIND_SPEED_MS || current.windGusts >= AGRO_THRESHOLDS.STORM_GUSTS_MS) {
    tips.push({
      id: 'tip-wind',
      type: 'wind',
      severity: 'warning',
      title: 'Сильний поривчастий вітер',
      description: `Швидкість вітру ${Math.round(current.windSpeed)} м/с (пориви до ${Math.round(current.windGusts)} м/с). Утримайтеся від обприскування та підв'яжіть високорослі рослини.`,
      iconName: 'wind',
      bgColorLight: '#E8F8F5',
      bgColorDark: '#12302A',
      iconColor: '#16A085',
    });
  }

  // 5. Rain & Watering Advice
  const todayDaily = daily[0];
  const next12Hours = hourly.slice(0, 12);
  const rainSum12h = next12Hours.reduce((acc, h) => acc + (h.precipitation || 0), 0);
  const willRainSubstantially = (todayDaily && todayDaily.precipitationSum >= AGRO_THRESHOLDS.RAIN_PRECIP_THRESHOLD_MM) ||
    rainSum12h >= AGRO_THRESHOLDS.RAIN_PRECIP_THRESHOLD_MM ||
    (todayDaily && todayDaily.precipitationProbabilityMax >= AGRO_THRESHOLDS.RAIN_PROBABILITY_THRESHOLD_PCT);

  if (willRainSubstantially) {
    tips.push({
      id: 'tip-rain-watering',
      type: 'rain',
      severity: 'info',
      title: 'Дощ очікується — полив можна пропустити',
      description: `Сьогодні прогнозується ${todayDaily ? Math.round(todayDaily.precipitationSum * 10) / 10 : Math.round(rainSum12h * 10) / 10} мм опадів (імовірність до ${todayDaily?.precipitationProbabilityMax ?? 70}%). Природного зволоження буде достатньо.`,
      iconName: 'cloud-rain',
      bgColorLight: '#EBF5FB',
      bgColorDark: '#172B3C',
      iconColor: '#2980B9',
    });
  } else {
    // Check soil moisture & ET0 if available
    const avgMoisture = next12Hours.find((h) => typeof h.soilMoisture0to1cm === 'number')?.soilMoisture0to1cm;
    const isDrySoil = typeof avgMoisture === 'number' && avgMoisture < AGRO_THRESHOLDS.DRY_SOIL_MOISTURE_M3M3;

    if (isDrySoil) {
      tips.push({
        id: 'tip-soil-dry',
        type: 'watering',
        severity: 'warning',
        title: 'Сухий верхній шар ґрунту',
        description: `Вологість верхнього шару ґрунту низька (${Math.round((avgMoisture ?? 0) * 100)}%). Рекомендується ретельний вечірній полив кореневої зони.`,
        iconName: 'droplets',
        bgColorLight: '#FEF9E7',
        bgColorDark: '#363013',
        iconColor: '#B7950B',
      });
    } else {
      // Standard optimal conditions tip
      tips.push({
        id: 'tip-standard-care',
        type: 'watering',
        severity: 'info',
        title: 'Режим поливу та догляду',
        description: 'Сприятливі умови для стандартного догляду. Полив проводити у вечірній час під корінь для зменшення випаровування.',
        iconName: 'droplets',
        bgColorLight: '#EAF6EE',
        bgColorDark: '#14281B',
        iconColor: '#2F8F57',
      });
    }
  }

  return tips;
}
