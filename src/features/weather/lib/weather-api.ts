import { z } from 'zod';
import type {
  WeatherData,
  ResolvedLocation,
  CurrentWeather,
  HourlyForecastItem,
  DailyForecastItem,
} from '../types';
import { generateAgroTips } from './weather-agro-tips';
import { formatDayLabel, formatTimeInTimezone } from './weather-units';

const OpenMeteoForecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  timezone_abbreviation: z.string().optional(),
  utc_offset_seconds: z.number(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number().optional(),
    relative_humidity_2m: z.number(),
    precipitation: z.number().optional().default(0),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number().optional(),
    wind_direction_10m: z.number().optional(),
    surface_pressure: z.number().optional(),
    is_day: z.number().optional().default(1),
  }),
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: z.array(z.number()),
      precipitation_probability: z.array(z.number().nullable().optional()).optional(),
      precipitation: z.array(z.number().nullable().optional()).optional(),
      wind_speed_10m: z.array(z.number().nullable().optional()).optional(),
      weather_code: z.array(z.number().nullable().optional()).optional(),
      soil_temperature_0cm: z.array(z.number().nullable().optional()).optional(),
      soil_temperature_6cm: z.array(z.number().nullable().optional()).optional(),
      soil_moisture_0_to_1cm: z.array(z.number().nullable().optional()).optional(),
      et0_fao_evapotranspiration: z.array(z.number().nullable().optional()).optional(),
    })
    .optional(),
  daily: z
    .object({
      time: z.array(z.string()),
      weather_code: z.array(z.number()),
      temperature_2m_max: z.array(z.number()),
      temperature_2m_min: z.array(z.number()),
      precipitation_sum: z.array(z.number().nullable().optional()).optional(),
      precipitation_probability_max: z.array(z.number().nullable().optional()).optional(),
      sunrise: z.array(z.string().nullable().optional()).optional(),
      sunset: z.array(z.string().nullable().optional()).optional(),
      uv_index_max: z.array(z.number().nullable().optional()).optional(),
    })
    .optional(),
});

export async function fetchOpenMeteoForecast(
  location: ResolvedLocation,
  signal?: AbortSignal
): Promise<WeatherData> {
  const { latitude, longitude } = location;

  const currentVars = [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'surface_pressure',
    'is_day',
  ].join(',');

  const hourlyVars = [
    'temperature_2m',
    'precipitation_probability',
    'precipitation',
    'wind_speed_10m',
    'weather_code',
    'soil_temperature_0cm',
    'soil_temperature_6cm',
    'soil_moisture_0_to_1cm',
    'et0_fao_evapotranspiration',
  ].join(',');

  const dailyVars = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'sunrise',
    'sunset',
    'uv_index_max',
  ].join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentVars}&hourly=${hourlyVars}&daily=${dailyVars}&forecast_days=10&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5s timeout

  try {
    const activeSignal = signal || controller.signal;
    const res = await fetch(url, { signal: activeSignal });

    if (!res.ok) {
      throw new Error(`Помилка сервера погоди (${res.status})`);
    }

    const rawJson = await res.json();
    const parseResult = OpenMeteoForecastResponseSchema.safeParse(rawJson);

    if (!parseResult.success) {
      throw new Error('Отримано некоректний формат метеоданих');
    }

    const data = parseResult.data;
    const timezone = data.timezone;
    const utcOffsetSeconds = data.utc_offset_seconds;

    // Current
    const current: CurrentWeather = {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature ?? data.current.temperature_2m,
      relativeHumidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation ?? 0,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windGusts: data.current.wind_gusts_10m ?? data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m ?? 0,
      surfacePressure: data.current.surface_pressure ?? 1013,
      isDay: data.current.is_day === 1,
    };

    // Hourly (next 48 hours)
    const hourly: HourlyForecastItem[] = [];
    if (data.hourly && data.hourly.time) {
      const limit = Math.min(data.hourly.time.length, 48);
      for (let i = 0; i < limit; i++) {
        const isoTime = data.hourly.time[i];
        const timeInfo = formatTimeInTimezone(isoTime, timezone, utcOffsetSeconds);
        hourly.push({
          time: timeInfo.formattedTime,
          isoTime,
          hour: timeInfo.hour,
          temperature: data.hourly.temperature_2m[i] ?? 0,
          precipitationProbability: data.hourly.precipitation_probability?.[i] ?? 0,
          precipitation: data.hourly.precipitation?.[i] ?? 0,
          windSpeed: data.hourly.wind_speed_10m?.[i] ?? 0,
          weatherCode: data.hourly.weather_code?.[i] ?? undefined,
          soilTemperature0cm: data.hourly.soil_temperature_0cm?.[i] ?? undefined,
          soilTemperature6cm: data.hourly.soil_temperature_6cm?.[i] ?? undefined,
          soilMoisture0to1cm: data.hourly.soil_moisture_0_to_1cm?.[i] ?? undefined,
          et0: data.hourly.et0_fao_evapotranspiration?.[i] ?? undefined,
        });
      }
    }

    // Daily (up to 10 days)
    const daily: DailyForecastItem[] = [];
    if (data.daily && data.daily.time) {
      for (let i = 0; i < data.daily.time.length; i++) {
        const dateStr = data.daily.time[i];
        daily.push({
          date: dateStr,
          dayLabel: formatDayLabel(dateStr, i),
          weatherCode: data.daily.weather_code[i] ?? 0,
          tempMax: data.daily.temperature_2m_max[i] ?? 0,
          tempMin: data.daily.temperature_2m_min[i] ?? 0,
          precipitationSum: data.daily.precipitation_sum?.[i] ?? 0,
          precipitationProbabilityMax: data.daily.precipitation_probability_max?.[i] ?? 0,
          sunrise: data.daily.sunrise?.[i] ?? undefined,
          sunset: data.daily.sunset?.[i] ?? undefined,
          uvIndexMax: data.daily.uv_index_max?.[i] ?? undefined,
        });
      }
    }

    const agroTips = generateAgroTips(current, daily, hourly);

    return {
      location,
      current,
      hourly,
      daily,
      agroTips,
      timezone,
      timezoneAbbreviation: data.timezone_abbreviation,
      utcOffsetSeconds,
      fetchedAt: Date.now(),
      isOfflineCached: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
