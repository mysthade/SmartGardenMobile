import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useWeatherStore, getCoordinateKey } from '../lib/weather-store';
import { resolveIpLocation } from '../lib/location';
import { fetchOpenMeteoForecast } from '../lib/weather-api';
import type { WeatherData, ResolvedLocation } from '../types';

export function useWeather(customLocation?: ResolvedLocation | null) {
  const {
    settings,
    activeLocation,
    currentIpLocation,
    isLoaded,
    loadSettings,
    setCurrentIpLocation,
    setActiveLocation,
    saveOfflineWeatherCache,
    getOfflineWeatherCache,
  } = useWeatherStore();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineData, setOfflineData] = useState<WeatherData | null>(null);
  const lastNetworkTypeRef = useRef<string | null>(null);

  // 1. Initial store loading
  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  // 2. NetInfo listener & IP re-resolution on network change
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);

      // Check if network changed and user is on auto IP
      const currentNetType = `${state.type}_${state.details ? JSON.stringify(state.details) : ''}`;
      if (lastNetworkTypeRef.current && lastNetworkTypeRef.current !== currentNetType && online) {
        if (settings.autoDetectIp && (!activeLocation || activeLocation.source === 'ip')) {
          void resolveIpLocation(true).then((newLoc) => {
            if (newLoc) {
              setCurrentIpLocation(newLoc);
            }
          });
        }
      }
      lastNetworkTypeRef.current = currentNetType;
    });

    return () => {
      unsubscribe();
    };
  }, [settings.autoDetectIp, activeLocation, setCurrentIpLocation]);

  // 3. Resolve initial IP location if autoDetectIp is on and no manual location is picked
  useEffect(() => {
    if (!isLoaded) return;
    if (customLocation) return;

    if (!activeLocation && settings.autoDetectIp && !currentIpLocation) {
      void resolveIpLocation(false).then((loc) => {
        if (loc) {
          setCurrentIpLocation(loc);
        }
      });
    }
  }, [isLoaded, activeLocation, settings.autoDetectIp, currentIpLocation, customLocation, setCurrentIpLocation]);

  const targetLocation = customLocation !== undefined ? customLocation : activeLocation;
  const coordKey = targetLocation ? getCoordinateKey(targetLocation.latitude, targetLocation.longitude) : 'none';

  // 4. Load offline cache on mount or location change
  useEffect(() => {
    if (!targetLocation) return;
    let isCancelled = false;

    void getOfflineWeatherCache(coordKey).then((cached) => {
      if (!isCancelled && cached) {
        setOfflineData({ ...cached, isOfflineCached: true });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [coordKey, targetLocation, getOfflineWeatherCache]);

  // 5. React Query for weather forecast
  const weatherQuery = useQuery({
    queryKey: ['weather', 'forecast', coordKey],
    queryFn: async ({ signal }) => {
      if (!targetLocation) {
        throw new Error('Місцезнаходження не вибрано');
      }
      const data = await fetchOpenMeteoForecast(targetLocation, signal);
      // Cache for offline
      await saveOfflineWeatherCache(coordKey, data);
      setOfflineData(null); // live data available
      return data;
    },
    enabled: Boolean(targetLocation),
    staleTime: 12 * 60_000, // 12 minutes
    gcTime: 60 * 60_000, // 1 hour
    retry: (failureCount) => {
      if (!isOnline) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Pick live data or offline cached fallback
  const finalData: WeatherData | null = weatherQuery.data ?? (offlineData ? offlineData : null);

  // Check if timezone differs from device timezone
  let isDifferentTimezone = false;
  if (finalData?.timezone) {
    try {
      const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (deviceTz && finalData.timezone !== deviceTz) {
        isDifferentTimezone = true;
      }
    } catch {
      // ignore
    }
  }

  // Format fetchedAt time
  let formattedFetchedAt = '';
  if (finalData?.fetchedAt) {
    try {
      const d = new Date(finalData.fetchedAt);
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      formattedFetchedAt = `${hours}:${mins}`;
    } catch {
      formattedFetchedAt = '';
    }
  }

  return {
    weather: finalData,
    isLoading: weatherQuery.isLoading && !finalData,
    isRefetching: weatherQuery.isRefetching,
    isError: weatherQuery.isError && !finalData,
    error: weatherQuery.error,
    isOnline,
    isOfflineCached: Boolean(!weatherQuery.data && offlineData),
    formattedFetchedAt,
    isDifferentTimezone,
    targetLocation,
    activeLocation,
    settings,
    refetch: () => weatherQuery.refetch(),
    setActiveLocation,
  };
}
