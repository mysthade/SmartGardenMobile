import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ResolvedLocation, WeatherSettings, WeatherData } from '../types';

const SETTINGS_STORAGE_KEY = 'sg_weather_settings_v1';
const OFFLINE_WEATHER_CACHE_PREFIX = 'sg_weather_cache_';

const DEFAULT_SETTINGS: WeatherSettings = {
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
};

interface WeatherStoreState {
  settings: WeatherSettings;
  isLoaded: boolean;
  activeLocation: ResolvedLocation | null;
  currentIpLocation: ResolvedLocation | null;
  loadSettings: () => Promise<void>;
  updateSettings: (updater: (prev: WeatherSettings) => Partial<WeatherSettings>) => Promise<void>;
  setActiveLocation: (location: ResolvedLocation) => Promise<void>;
  setCurrentIpLocation: (location: ResolvedLocation | null) => void;
  addSavedLocation: (location: ResolvedLocation) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
  renameSavedLocation: (id: string, newLabel: string) => Promise<void>;
  bindGardenLocation: (gardenId: string, location: ResolvedLocation) => Promise<void>;
  saveOfflineWeatherCache: (coordKey: string, data: WeatherData) => Promise<void>;
  getOfflineWeatherCache: (coordKey: string) => Promise<WeatherData | null>;
}

export function getCoordinateKey(lat: number, lon: number): string {
  const roundLat = Math.round(lat * 100) / 100;
  const roundLon = Math.round(lon * 100) / 100;
  return `${roundLat.toFixed(2)}_${roundLon.toFixed(2)}`;
}

export const useWeatherStore = create<WeatherStoreState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  activeLocation: null,
  currentIpLocation: null,

  loadSettings: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged: WeatherSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          savedLocations: Array.isArray(parsed.savedLocations) ? parsed.savedLocations : [],
          gardenLocationBindings: parsed.gardenLocationBindings || {},
        };

        // Determine active location
        let activeLoc: ResolvedLocation | null = null;
        if (merged.activeLocationId !== 'current') {
          activeLoc = merged.savedLocations.find((l) => l.id === merged.activeLocationId) || null;
        }

        set({ settings: merged, activeLocation: activeLoc, isLoaded: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ settings: DEFAULT_SETTINGS, isLoaded: true });
  },

  updateSettings: async (updater) => {
    const prev = get().settings;
    const partial = updater(prev);
    const updated: WeatherSettings = { ...prev, ...partial };

    set({ settings: updated });
    try {
      await SecureStore.setItemAsync(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // fallback
    }
  },

  setActiveLocation: async (location: ResolvedLocation) => {
    const { settings, updateSettings } = get();

    // Check if this location is in saved list or needs to be tracked
    const existing = settings.savedLocations.find((l) => l.id === location.id);
    let updatedSaved = [...settings.savedLocations];

    if (!existing && location.source === 'manual') {
      // Auto add up to 10 saved
      if (updatedSaved.length >= 10) {
        updatedSaved = updatedSaved.slice(0, 9);
      }
      updatedSaved = [location, ...updatedSaved];
    } else if (existing) {
      // update timestamp
      updatedSaved = updatedSaved.map((l) => (l.id === location.id ? { ...location, updatedAt: Date.now() } : l));
    }

    set({ activeLocation: location });

    await updateSettings(() => ({
      activeLocationId: location.id,
      savedLocations: updatedSaved,
    }));
  },

  setCurrentIpLocation: (location) => {
    set({ currentIpLocation: location });
    const { activeLocation, settings } = get();
    // Only set as active location if user has not picked a manual/saved one
    if (!activeLocation || settings.activeLocationId === 'current') {
      if (location) {
        set({ activeLocation: location });
      }
    }
  },

  addSavedLocation: async (location) => {
    const { settings, updateSettings } = get();
    const filtered = settings.savedLocations.filter((l) => l.id !== location.id);
    const updated = [location, ...filtered].slice(0, 10);
    await updateSettings(() => ({ savedLocations: updated }));
  },

  removeSavedLocation: async (id) => {
    const { settings, activeLocation, currentIpLocation, updateSettings } = get();
    const updated = settings.savedLocations.filter((l) => l.id !== id);

    let nextActive = activeLocation;
    let nextActiveId = settings.activeLocationId;

    if (activeLocation?.id === id) {
      nextActive = updated[0] || currentIpLocation || null;
      nextActiveId = nextActive ? nextActive.id : 'current';
    }

    set({ activeLocation: nextActive });
    await updateSettings(() => ({
      savedLocations: updated,
      activeLocationId: nextActiveId,
    }));
  },

  renameSavedLocation: async (id, newLabel) => {
    const { settings, activeLocation, updateSettings } = get();
    const updated = settings.savedLocations.map((l) =>
      l.id === id ? { ...l, customLabel: newLabel, name: newLabel || l.name } : l
    );

    let nextActive = activeLocation;
    if (activeLocation?.id === id) {
      nextActive = { ...activeLocation, customLabel: newLabel, name: newLabel || activeLocation.name };
    }

    set({ activeLocation: nextActive });
    await updateSettings(() => ({ savedLocations: updated }));
  },

  bindGardenLocation: async (gardenId, location) => {
    const { settings, updateSettings } = get();
    const updatedBindings = {
      ...settings.gardenLocationBindings,
      [gardenId]: { ...location, gardenId, source: 'garden' as const },
    };
    await updateSettings(() => ({
      gardenLocationBindings: updatedBindings,
    }));
  },

  saveOfflineWeatherCache: async (coordKey, data) => {
    try {
      const key = `${OFFLINE_WEATHER_CACHE_PREFIX}${coordKey}`;
      await SecureStore.setItemAsync(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  },

  getOfflineWeatherCache: async (coordKey) => {
    try {
      const key = `${OFFLINE_WEATHER_CACHE_PREFIX}${coordKey}`;
      const raw = await SecureStore.getItemAsync(key);
      if (raw) {
        return JSON.parse(raw) as WeatherData;
      }
    } catch {
      // ignore
    }
    return null;
  },
}));
