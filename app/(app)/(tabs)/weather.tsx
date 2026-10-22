import { useState, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  RotateCw,
  Sparkles,
  MapPin,
} from 'lucide-react-native';

import { useTheme } from '@/src/theme/theme-context';
import { api } from '@/src/lib/api';
import { useWeather } from '@/src/features/weather/hooks/use-weather';
import { useWeatherStore } from '@/src/features/weather/lib/weather-store';
import { WeatherHeader } from '@/src/features/weather/components/WeatherHeader';
import { CurrentWeatherCard } from '@/src/features/weather/components/CurrentWeatherCard';
import { HourlyForecastScroll } from '@/src/features/weather/components/HourlyForecastScroll';
import { DailyForecastList } from '@/src/features/weather/components/DailyForecastList';
import { AgroTipsCards } from '@/src/features/weather/components/AgroTipsCards';
import { WeatherSkeleton } from '@/src/features/weather/components/WeatherSkeleton';
import { LocationSelectModal } from '@/src/features/weather/components/LocationSelectModal';
import { WeatherSettingsModal } from '@/src/features/weather/components/WeatherSettingsModal';
import type { ResolvedLocation } from '@/src/features/weather/types';

export default function WeatherScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [locationMode, setLocationMode] = useState<'my_location' | 'my_garden'>('my_location');
  const [targetBindingGardenId, setTargetBindingGardenId] = useState<string | null>(null);

  const { bindGardenLocation, setActiveLocation } = useWeatherStore();

  // Query user's gardens
  const gardensQuery = useQuery({
    queryKey: ['gardens', 'list'],
    queryFn: () => api.listGardens({ limit: 20 }),
    staleTime: 60_000,
  });

  const firstGarden = gardensQuery.data?.data?.[0];

  // Resolve garden location (from garden coordinates or local binding)
  const gardenLocation = useMemo<ResolvedLocation | null>(() => {
    if (!firstGarden) return null;

    // 1. If garden has coordinates in backend
    if (firstGarden.latitude && firstGarden.longitude) {
      const lat = parseFloat(firstGarden.latitude);
      const lon = parseFloat(firstGarden.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        return {
          id: `garden_${firstGarden.id}`,
          name: firstGarden.name,
          customLabel: firstGarden.locationName || `Сад: ${firstGarden.name}`,
          country: 'Україна',
          latitude: lat,
          longitude: lon,
          source: 'garden',
          isIpEstimate: false,
          updatedAt: Date.now(),
          gardenId: firstGarden.id,
        };
      }
    }

    // 2. If locally bound
    const { settings } = useWeatherStore.getState();
    if (settings.gardenLocationBindings[firstGarden.id]) {
      return settings.gardenLocationBindings[firstGarden.id];
    }

    return null;
  }, [firstGarden]);

  // Target location based on mode switch
  const customTargetLocation = locationMode === 'my_garden' && gardenLocation ? gardenLocation : undefined;

  const {
    weather,
    isLoading,
    isRefetching,
    isError,
    error,
    isOnline,
    isOfflineCached,
    formattedFetchedAt,
    isDifferentTimezone,
    activeLocation,
    settings,
    refetch,
  } = useWeather(customTargetLocation);

  const handleLocationSelected = async (loc: ResolvedLocation) => {
    if (targetBindingGardenId) {
      await bindGardenLocation(targetBindingGardenId, loc);
      setTargetBindingGardenId(null);
      setLocationMode('my_garden');
    } else {
      await setActiveLocation(loc);
    }
  };

  const handlePromptBindGarden = () => {
    if (firstGarden) {
      setTargetBindingGardenId(firstGarden.id);
      setLocationModalVisible(true);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={theme.ac}
        />
      }
    >
      {/* Garden / My Location Mode Switcher (if user has a garden) */}
      {firstGarden && (
        <View style={[styles.modeSwitcherContainer, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Pressable
            style={[
              styles.modeTab,
              locationMode === 'my_location' && [styles.modeTabActive, { backgroundColor: theme.ac }],
            ]}
            onPress={() => setLocationMode('my_location')}
            accessibilityRole="tab"
            accessibilityLabel="Моє поточне місце"
          >
            <MapPin size={14} color={locationMode === 'my_location' ? '#ffffff' : theme.mu} />
            <Text
              style={[
                styles.modeTabText,
                { color: locationMode === 'my_location' ? '#ffffff' : theme.tx },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Моє місце
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.modeTab,
              locationMode === 'my_garden' && [styles.modeTabActive, { backgroundColor: theme.ac }],
            ]}
            onPress={() => {
              if (!gardenLocation) {
                handlePromptBindGarden();
              } else {
                setLocationMode('my_garden');
              }
            }}
            accessibilityRole="tab"
            accessibilityLabel={`Мій сад: ${firstGarden.name}`}
          >
            <Sparkles size={14} color={locationMode === 'my_garden' ? '#ffffff' : theme.mu} />
            <Text
              style={[
                styles.modeTabText,
                { color: locationMode === 'my_garden' ? '#ffffff' : theme.tx },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {gardenLocation ? `Сад: ${firstGarden.name}` : `Привʼязати «${firstGarden.name}»`}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Header */}
      <WeatherHeader
        location={weather?.location ?? activeLocation}
        settings={settings}
        isOnline={isOnline}
        isOfflineCached={isOfflineCached}
        formattedFetchedAt={formattedFetchedAt}
        isDifferentTimezone={isDifferentTimezone}
        timezoneName={weather?.timezone}
        onOpenLocationSelect={() => {
          setTargetBindingGardenId(null);
          setLocationModalVisible(true);
        }}
        onOpenSettings={() => setSettingsModalVisible(true)}
        onSelectSavedLocation={(loc) => void setActiveLocation(loc)}
      />

      {/* Loading Skeleton */}
      {isLoading && <WeatherSkeleton />}

      {/* Error Card */}
      {isError && !weather && (
        <View style={[styles.errorCard, { backgroundColor: theme.pn, borderColor: '#E74C3C' }]}>
          <AlertTriangle size={32} color="#E74C3C" />
          <Text style={[styles.errorTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            Не вдалося завантажити погоду
          </Text>
          <Text style={[styles.errorDesc, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            {error instanceof Error ? error.message : 'Перевірте інтернет-зʼєднання або виберіть інше місце.'}
          </Text>
          <View style={styles.errorActions}>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.ac }]}
              onPress={() => void refetch()}
            >
              <RotateCw size={16} color="#ffffff" />
              <Text style={styles.retryButtonText} maxFontSizeMultiplier={1.3}>
                Повторити
              </Text>
            </Pressable>
            <Pressable
              style={[styles.changeLocBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={[styles.changeLocText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                Вибрати місце вручну
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Weather Content */}
      {weather && (
        <>
          {isTablet ? (
            // 2-Column Responsive Layout for Tablets / Wide Screens
            <View style={styles.tabletGrid}>
              <View style={styles.tabletCol}>
                <CurrentWeatherCard weather={weather} settings={settings} />
                <HourlyForecastScroll hourly={weather.hourly} settings={settings} />
              </View>
              <View style={styles.tabletCol}>
                <AgroTipsCards tips={weather.agroTips} />
                <DailyForecastList daily={weather.daily} settings={settings} />
              </View>
            </View>
          ) : (
            // Standard Single Column Mobile Layout
            <>
              <CurrentWeatherCard weather={weather} settings={settings} />
              <HourlyForecastScroll hourly={weather.hourly} settings={settings} />
              <AgroTipsCards tips={weather.agroTips} />
              <DailyForecastList daily={weather.daily} settings={settings} />
            </>
          )}
        </>
      )}

      {/* Modals */}
      <LocationSelectModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSelected={handleLocationSelected}
      />

      <WeatherSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
    minHeight: 38,
  },
  modeTabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  errorDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 280,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  changeLocBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  changeLocText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabletGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletCol: {
    flex: 1,
  },
});
