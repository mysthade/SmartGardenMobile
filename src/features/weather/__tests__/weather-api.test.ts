import { fetchOpenMeteoForecast } from '../lib/weather-api';
import type { ResolvedLocation } from '../types';

describe('weather-api', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockLocation: ResolvedLocation = {
    id: 'loc_kyiv',
    name: 'Київ',
    country: 'Україна',
    latitude: 50.45,
    longitude: 30.52,
    source: 'manual',
    updatedAt: Date.now(),
  };

  const validResponse = {
    latitude: 50.45,
    longitude: 30.52,
    timezone: 'Europe/Kyiv',
    timezone_abbreviation: 'EEST',
    utc_offset_seconds: 10800,
    current: {
      time: '2026-10-22T14:00',
      temperature_2m: 19.5,
      apparent_temperature: 19.0,
      relative_humidity_2m: 52,
      precipitation: 0.0,
      weather_code: 1,
      wind_speed_10m: 4.2,
      wind_gusts_10m: 6.8,
      wind_direction_10m: 190,
      surface_pressure: 1015.2,
      is_day: 1,
    },
    hourly: {
      time: ['2026-10-22T14:00', '2026-10-22T15:00'],
      temperature_2m: [19.5, 19.1],
      precipitation_probability: [10, 15],
      precipitation: [0.0, 0.0],
      wind_speed_10m: [4.2, 4.0],
      weather_code: [1, 2],
      soil_temperature_0cm: [17.5, 17.2],
      soil_temperature_6cm: [15.8, 15.6],
      soil_moisture_0_to_1cm: [0.28, 0.28],
      et0_fao_evapotranspiration: [0.35, 0.32],
    },
    daily: {
      time: ['2026-10-22', '2026-10-23'],
      weather_code: [1, 2],
      temperature_2m_max: [21.0, 20.5],
      temperature_2m_min: [12.0, 11.5],
      precipitation_sum: [0.0, 1.2],
      precipitation_probability_max: [15, 35],
      sunrise: ['2026-10-22T07:28', '2026-10-23T07:30'],
      sunset: ['2026-10-22T17:58', '2026-10-23T17:56'],
      uv_index_max: [3.2, 2.8],
    },
  };

  it('successfully fetches, validates and maps weather forecast data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => validResponse,
    });

    const data = await fetchOpenMeteoForecast(mockLocation);

    expect(data.location.name).toBe('Київ');
    expect(data.timezone).toBe('Europe/Kyiv');
    expect(data.utcOffsetSeconds).toBe(10800);
    expect(data.current.temperature).toBe(19.5);
    expect(data.current.weatherCode).toBe(1);
    expect(data.current.windSpeed).toBe(4.2);
    expect(data.hourly.length).toBe(2);
    expect(data.daily.length).toBe(2);
    expect(data.daily[0].dayLabel).toBe('Сьогодні');
    expect(data.daily[1].dayLabel).toBe('Завтра');
    expect(data.agroTips.length).toBeGreaterThan(0);
  });

  it('rejects on HTTP error status code', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(fetchOpenMeteoForecast(mockLocation)).rejects.toThrow('Помилка сервера погоди (503)');
  });

  it('rejects when response fails Zod schema validation (corrupted payload)', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        corrupted: true,
      }),
    });

    await expect(fetchOpenMeteoForecast(mockLocation)).rejects.toThrow('Отримано некоректний формат метеоданих');
  });
});
