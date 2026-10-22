import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  MapPin,
  WifiOff,
  Navigation,
  Globe,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { ResolvedLocation, WeatherSettings } from '../types';

interface WeatherHeaderProps {
  location: ResolvedLocation | null;
  settings: WeatherSettings;
  isOnline: boolean;
  isOfflineCached: boolean;
  formattedFetchedAt: string;
  isDifferentTimezone: boolean;
  timezoneName?: string;
  onOpenLocationSelect: () => void;
  onOpenSettings: () => void;
  onSelectSavedLocation: (loc: ResolvedLocation) => void;
}

export function WeatherHeader({
  location,
  settings,
  isOnline,
  isOfflineCached,
  formattedFetchedAt,
  isDifferentTimezone,
  timezoneName,
  onOpenLocationSelect,
  onOpenSettings,
  onSelectSavedLocation,
}: WeatherHeaderProps) {
  const { theme } = useTheme();

  // Location source label and icon
  const getSourceBadge = () => {
    if (!location) return null;
    switch (location.source) {
      case 'ip':
        return {
          icon: <Globe size={12} color="#D35400" />,
          label: 'Визначено за IP (може бути неточним)',
          bg: theme.name === 'dark' ? '#2f1a0e' : '#fef5e7',
          color: '#D35400',
        };
      case 'gps':
        return {
          icon: <Navigation size={12} color="#2980B9" />,
          label: 'За GPS',
          bg: theme.name === 'dark' ? '#142533' : '#eaf2f8',
          color: '#2980B9',
        };
      case 'garden':
        return {
          icon: <Sparkles size={12} color={theme.ac} />,
          label: 'Локація саду',
          bg: theme.name === 'dark' ? '#17281f' : '#eaf6ee',
          color: theme.ac,
        };
      case 'manual':
      default:
        return {
          icon: <MapPin size={12} color="#16A085" />,
          label: 'Вибрано вручну',
          bg: theme.name === 'dark' ? '#112924' : '#e8f8f5',
          color: '#16A085',
        };
    }
  };

  const badge = getSourceBadge();
  const locationTitle = location?.customLabel || location?.name || 'Локація не вибрана';
  const locationRegion = location
    ? [location.admin1, location.country].filter(Boolean).join(', ')
    : 'Виберіть місце для отримання погоди';

  return (
    <View style={styles.container}>
      {/* Offline / Cache Banner */}
      {(!isOnline || isOfflineCached) && (
        <View
          style={[
            styles.offlineBanner,
            { backgroundColor: theme.name === 'dark' ? '#331d1d' : '#fdedec', borderColor: '#E74C3C' },
          ]}
        >
          <WifiOff size={16} color="#E74C3C" />
          <Text style={[styles.offlineText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
            {!isOnline ? 'Немає мережі' : 'Автономний режим'}
            {formattedFetchedAt ? ` • Дані на ${formattedFetchedAt}` : ''}
          </Text>
        </View>
      )}

      {/* Main Header Row */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View style={styles.locationRow}>
            <MapPin size={22} color={theme.ac} />
            <Text
              style={[styles.locationName, { color: theme.tx }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.3}
            >
              {locationTitle}
            </Text>
          </View>
          <Text
            style={[styles.locationSubtitle, { color: theme.mu }]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
          >
            {locationRegion}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          <Pressable
            style={[styles.iconButton, { backgroundColor: theme.pn, borderColor: theme.bd }]}
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Налаштування погоди"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Sliders size={20} color={theme.tx} />
          </Pressable>
        </View>
      </View>

      {/* Location Source Badge & "Змінити місце" CTA */}
      <View style={styles.badgeRow}>
        {badge && (
          <View style={[styles.sourceBadge, { backgroundColor: badge.bg }]}>
            {badge.icon}
            <Text
              style={[styles.sourceBadgeText, { color: badge.color }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.3}
            >
              {badge.label}
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.changeLocationButton, { borderColor: theme.ac, backgroundColor: theme.pn }]}
          onPress={onOpenLocationSelect}
          accessibilityRole="button"
          accessibilityLabel="Змінити місцезнаходження"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.changeLocationText, { color: theme.ac }]} maxFontSizeMultiplier={1.3}>
            Змінити
          </Text>
        </Pressable>
      </View>

      {/* Different Timezone Alert */}
      {isDifferentTimezone && timezoneName && (
        <View style={styles.tzNoticeRow}>
          <Text style={[styles.tzNoticeText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
            🕒 Час відображається за поясом локації: {timezoneName}
          </Text>
        </View>
      )}

      {/* Quick Switching Chips (Saved locations) */}
      {settings.savedLocations.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {settings.savedLocations.map((loc) => {
            const isSelected = location?.id === loc.id;
            return (
              <Pressable
                key={loc.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.ac : theme.pn,
                    borderColor: isSelected ? theme.ac : theme.bd,
                  },
                ]}
                onPress={() => onSelectSavedLocation(loc)}
                accessibilityRole="button"
                accessibilityLabel={`Вибрати ${loc.customLabel || loc.name}`}
              >
                <MapPin size={12} color={isSelected ? '#ffffff' : theme.mu} />
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#ffffff' : theme.tx, fontWeight: isSelected ? '700' : '500' },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {loc.customLabel || loc.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
  },
  locationSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginLeft: 28,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginLeft: 28,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 1,
    marginRight: 8,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  changeLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeLocationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tzNoticeRow: {
    marginTop: 6,
    marginLeft: 28,
  },
  tzNoticeText: {
    fontSize: 11,
  },
  chipsScroll: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
  },
  chipText: {
    fontSize: 13,
  },
});
