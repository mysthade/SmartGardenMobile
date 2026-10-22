export type LocationSource = 'ip' | 'gps' | 'manual' | 'garden';

export interface ResolvedLocation {
  id: string;
  name: string;
  admin1?: string; // Oblast / Region
  admin2?: string; // Raion / District
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string; // e.g. "Europe/Kyiv"
  source: LocationSource;
  isIpEstimate?: boolean;
  updatedAt: number;
  customLabel?: string;
  gardenId?: string; // if bound to a garden
}

export type TempUnit = 'celsius' | 'fahrenheit';
export type WindUnit = 'ms' | 'kmh' | 'mph';
export type PrecipUnit = 'mm' | 'inch';

export interface WeatherSettings {
  autoDetectIp: boolean;
  tempUnit: TempUnit;
  windUnit: WindUnit;
  precipUnit: PrecipUnit;
  savedLocations: ResolvedLocation[];
  activeLocationId: string; // 'current' or specific location id
  gardenLocationBindings: Record<string, ResolvedLocation>;
  alertsEnabled: boolean;
  quietHoursStart: number; // e.g. 22
  quietHoursEnd: number; // e.g. 7
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number; // in m/s from Open-Meteo by default
  windGusts: number;
  windDirection: number;
  surfacePressure: number;
  isDay: boolean;
}

export interface HourlyForecastItem {
  time: string; // formatted in location timezone
  isoTime: string;
  hour: number;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  soilTemperature0cm?: number;
  soilTemperature6cm?: number;
  soilMoisture0to1cm?: number;
  et0?: number;
  weatherCode?: number;
}

export interface DailyForecastItem {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Сьогодні", "Завтра", "Середа", etc.
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  sunrise?: string;
  sunset?: string;
  uvIndexMax?: number;
}

export interface AgroTip {
  id: string;
  type: 'frost' | 'heat' | 'rain' | 'wind' | 'storm' | 'watering';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  description: string;
  iconName: string;
  bgColorLight: string;
  bgColorDark: string;
  iconColor: string;
}

export interface WeatherData {
  location: ResolvedLocation;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  agroTips: AgroTip[];
  timezone: string;
  timezoneAbbreviation?: string;
  utcOffsetSeconds: number;
  fetchedAt: number;
  isOfflineCached?: boolean;
}

export interface GeocodingResult {
  id: string;
  name: string;
  admin1?: string;
  admin2?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
  source: 'open-meteo' | 'nominatim';
}
