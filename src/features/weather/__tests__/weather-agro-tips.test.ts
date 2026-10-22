import { generateAgroTips, AGRO_THRESHOLDS } from '../lib/weather-agro-tips';
import type { CurrentWeather, DailyForecastItem, HourlyForecastItem } from '../types';

describe('weather-agro-tips', () => {
  const baseCurrent: CurrentWeather = {
    time: '2026-10-22T12:00:00Z',
    temperature: 20,
    apparentTemperature: 20,
    relativeHumidity: 55,
    precipitation: 0,
    weatherCode: 1,
    windSpeed: 3.5,
    windGusts: 5,
    windDirection: 180,
    surfacePressure: 1013,
    isDay: true,
  };

  const baseDaily: DailyForecastItem[] = [
    {
      date: '2026-10-22',
      dayLabel: 'Сьогодні',
      weatherCode: 1,
      tempMax: 22,
      tempMin: 12,
      precipitationSum: 0,
      precipitationProbabilityMax: 10,
    },
    {
      date: '2026-10-23',
      dayLabel: 'Завтра',
      weatherCode: 2,
      tempMax: 21,
      tempMin: 11,
      precipitationSum: 0,
      precipitationProbabilityMax: 15,
    },
    {
      date: '2026-10-24',
      dayLabel: 'Субота',
      weatherCode: 0,
      tempMax: 23,
      tempMin: 10,
      precipitationSum: 0,
      precipitationProbabilityMax: 5,
    },
  ];

  const baseHourly: HourlyForecastItem[] = [
    {
      time: '12:00',
      isoTime: '2026-10-22T12:00:00Z',
      hour: 12,
      temperature: 20,
      precipitationProbability: 0,
      precipitation: 0,
      windSpeed: 3.5,
      soilMoisture0to1cm: 0.35,
    },
  ];

  it('exports expected agro thresholds constants', () => {
    expect(AGRO_THRESHOLDS.FROST_TEMP_MAX).toBe(0);
    expect(AGRO_THRESHOLDS.HEAT_TEMP_MIN).toBe(30);
    expect(AGRO_THRESHOLDS.STRONG_WIND_SPEED_MS).toBe(10);
    expect(AGRO_THRESHOLDS.RAIN_PRECIP_THRESHOLD_MM).toBe(5);
  });

  it('generates standard care tip under optimal weather conditions', () => {
    const tips = generateAgroTips(baseCurrent, baseDaily, baseHourly);
    expect(tips.some((t) => t.id === 'tip-standard-care')).toBe(true);
    expect(tips.some((t) => t.id === 'tip-frost')).toBe(false);
    expect(tips.some((t) => t.id === 'tip-heat')).toBe(false);
  });

  it('generates frost alert when min temperature <= 0 in next 3 days', () => {
    const dailyWithFrost: DailyForecastItem[] = [
      ...baseDaily.slice(0, 1),
      {
        ...baseDaily[1],
        tempMin: -2,
      },
      ...baseDaily.slice(2),
    ];

    const tips = generateAgroTips(baseCurrent, dailyWithFrost, baseHourly);
    const frostTip = tips.find((t) => t.id === 'tip-frost');
    expect(frostTip).toBeDefined();
    expect(frostTip?.severity).toBe('alert');
    expect(frostTip?.description).toContain('-2°C');
  });

  it('generates heat alert when max temperature >= 30°C', () => {
    const dailyWithHeat: DailyForecastItem[] = [
      {
        ...baseDaily[0],
        tempMax: 33,
      },
      ...baseDaily.slice(1),
    ];

    const tips = generateAgroTips(baseCurrent, dailyWithHeat, baseHourly);
    const heatTip = tips.find((t) => t.id === 'tip-heat');
    expect(heatTip).toBeDefined();
    expect(heatTip?.severity).toBe('warning');
    expect(heatTip?.description).toContain('+33°C');
  });

  it('generates hail / storm alert when weather code is 95, 96 or 99', () => {
    const currentStorm: CurrentWeather = {
      ...baseCurrent,
      weatherCode: 95,
    };

    const tips = generateAgroTips(currentStorm, baseDaily, baseHourly);
    const stormTip = tips.find((t) => t.id === 'tip-storm');
    expect(stormTip).toBeDefined();
    expect(stormTip?.severity).toBe('alert');
    expect(stormTip?.title).toContain('Гроза та ризик граду');
  });

  it('generates wind warning when wind speed >= 10 m/s', () => {
    const windyCurrent: CurrentWeather = {
      ...baseCurrent,
      windSpeed: 12,
      windGusts: 18,
    };

    const tips = generateAgroTips(windyCurrent, baseDaily, baseHourly);
    const windTip = tips.find((t) => t.id === 'tip-wind');
    expect(windTip).toBeDefined();
    expect(windTip?.description).toContain('12 м/с');
  });

  it('advises skipping watering when substantial rain is forecast', () => {
    const rainyDaily: DailyForecastItem[] = [
      {
        ...baseDaily[0],
        precipitationSum: 8.5,
        precipitationProbabilityMax: 80,
      },
      ...baseDaily.slice(1),
    ];

    const tips = generateAgroTips(baseCurrent, rainyDaily, baseHourly);
    const rainTip = tips.find((t) => t.id === 'tip-rain-watering');
    expect(rainTip).toBeDefined();
    expect(rainTip?.title).toContain('Дощ очікується — полив можна пропустити');
  });

  it('advises watering when soil is dry (< 0.22 m3/m3)', () => {
    const dryHourly: HourlyForecastItem[] = [
      {
        ...baseHourly[0],
        soilMoisture0to1cm: 0.15,
      },
    ];

    const tips = generateAgroTips(baseCurrent, baseDaily, dryHourly);
    const soilTip = tips.find((t) => t.id === 'tip-soil-dry');
    expect(soilTip).toBeDefined();
    expect(soilTip?.title).toContain('Сухий верхній шар ґрунту');
  });
});
