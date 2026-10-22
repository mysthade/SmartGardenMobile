import { useWeatherStore, getCoordinateKey } from '../lib/weather-store';
import type { ResolvedLocation, WeatherData } from '../types';

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

describe('weather-store', () => {
  beforeEach(() => {
    useWeatherStore.setState({
      settings: {
        autoDetectIp: true,
        tempUnit: 'celsius',
        windUnit: 'ms',
        precipUnit: 'mm',
        savedLocations: [],
        activeLocationId: 'current',
        gardenLocationBindings: {},
        alertsEnabled: true,
        quietHoursStart: 22,
        quietHoursEnd: 7,
      },
      isLoaded: true,
      activeLocation: null,
      currentIpLocation: null,
    });
  });

  it('calculates rounded coordinate key to 2 decimal places', () => {
    expect(getCoordinateKey(50.45466, 30.5238)).toBe('50.45_30.52');
    expect(getCoordinateKey(48.9226, 24.7111)).toBe('48.92_24.71');
  });

  it('sets active location and updates saved locations list', async () => {
    const loc: ResolvedLocation = {
      id: 'loc_1',
      name: 'Івано-Франківськ',
      country: 'Україна',
      latitude: 48.92,
      longitude: 24.71,
      source: 'manual',
      updatedAt: Date.now(),
    };

    await useWeatherStore.getState().setActiveLocation(loc);

    const state = useWeatherStore.getState();
    expect(state.activeLocation?.id).toBe('loc_1');
    expect(state.settings.activeLocationId).toBe('loc_1');
    expect(state.settings.savedLocations.some((l) => l.id === 'loc_1')).toBe(true);
  });

  it('limits saved locations list to 10 items', async () => {
    for (let i = 1; i <= 12; i++) {
      const loc: ResolvedLocation = {
        id: `loc_${i}`,
        name: `Місце ${i}`,
        country: 'Україна',
        latitude: 50 + i * 0.1,
        longitude: 30 + i * 0.1,
        source: 'manual',
        updatedAt: Date.now(),
      };
      await useWeatherStore.getState().addSavedLocation(loc);
    }

    const state = useWeatherStore.getState();
    expect(state.settings.savedLocations.length).toBeLessThanOrEqual(10);
  });

  it('removes saved location correctly', async () => {
    const loc: ResolvedLocation = {
      id: 'loc_to_remove',
      name: 'Село Залісся',
      country: 'Україна',
      latitude: 50.1,
      longitude: 30.1,
      source: 'manual',
      updatedAt: Date.now(),
    };

    await useWeatherStore.getState().addSavedLocation(loc);
    expect(useWeatherStore.getState().settings.savedLocations.some((l) => l.id === 'loc_to_remove')).toBe(true);

    await useWeatherStore.getState().removeSavedLocation('loc_to_remove');
    expect(useWeatherStore.getState().settings.savedLocations.some((l) => l.id === 'loc_to_remove')).toBe(false);
  });

  it('renames saved location label', async () => {
    const loc: ResolvedLocation = {
      id: 'loc_rename',
      name: 'Координати (50.1, 30.1)',
      country: 'Україна',
      latitude: 50.1,
      longitude: 30.1,
      source: 'manual',
      updatedAt: Date.now(),
    };

    await useWeatherStore.getState().setActiveLocation(loc);
    await useWeatherStore.getState().renameSavedLocation('loc_rename', 'Моя дача');

    const state = useWeatherStore.getState();
    expect(state.activeLocation?.customLabel).toBe('Моя дача');
    expect(state.activeLocation?.name).toBe('Моя дача');
  });

  it('binds garden to a resolved location', async () => {
    const loc: ResolvedLocation = {
      id: 'loc_garden',
      name: 'Селище Садове',
      country: 'Україна',
      latitude: 49.5,
      longitude: 25.5,
      source: 'manual',
      updatedAt: Date.now(),
    };

    await useWeatherStore.getState().bindGardenLocation('garden_123', loc);

    const state = useWeatherStore.getState();
    expect(state.settings.gardenLocationBindings['garden_123']).toBeDefined();
    expect(state.settings.gardenLocationBindings['garden_123'].source).toBe('garden');
  });

  it('does not overwrite user manual active location with auto IP detection', () => {
    const manualLoc: ResolvedLocation = {
      id: 'manual_selected',
      name: 'Чернівці',
      country: 'Україна',
      latitude: 48.29,
      longitude: 25.93,
      source: 'manual',
      updatedAt: Date.now(),
    };

    useWeatherStore.setState({
      activeLocation: manualLoc,
      settings: {
        ...useWeatherStore.getState().settings,
        activeLocationId: 'manual_selected',
      },
    });

    const ipLoc: ResolvedLocation = {
      id: 'ip_detected',
      name: 'Одеса',
      country: 'Україна',
      latitude: 46.48,
      longitude: 30.72,
      source: 'ip',
      updatedAt: Date.now(),
    };

    useWeatherStore.getState().setCurrentIpLocation(ipLoc);

    // Active location remains manual selection!
    const state = useWeatherStore.getState();
    expect(state.activeLocation?.id).toBe('manual_selected');
    expect(state.currentIpLocation?.id).toBe('ip_detected');
  });

  it('persists and retrieves offline weather data cache', async () => {
    const coordKey = '50.45_30.52';
    const mockData: WeatherData = {
      location: {
        id: 'loc_test',
        name: 'Київ',
        country: 'Україна',
        latitude: 50.45,
        longitude: 30.52,
        source: 'manual',
        updatedAt: Date.now(),
      },
      current: {
        time: '2026-10-22T12:00:00Z',
        temperature: 18,
        apparentTemperature: 18,
        relativeHumidity: 60,
        precipitation: 0,
        weatherCode: 1,
        windSpeed: 4,
        windGusts: 6,
        windDirection: 200,
        surfacePressure: 1012,
        isDay: true,
      },
      hourly: [],
      daily: [],
      agroTips: [],
      timezone: 'Europe/Kyiv',
      utcOffsetSeconds: 10800,
      fetchedAt: Date.now(),
    };

    await useWeatherStore.getState().saveOfflineWeatherCache(coordKey, mockData);
    const retrieved = await useWeatherStore.getState().getOfflineWeatherCache(coordKey);

    expect(retrieved).toBeDefined();
    expect(retrieved?.location.name).toBe('Київ');
    expect(retrieved?.current.temperature).toBe(18);
  });
});
