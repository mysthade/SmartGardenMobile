import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { z } from 'zod';
import type { ResolvedLocation, GeocodingResult } from '../types';

const IP_CACHE_KEY = 'sg_weather_ip_location_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory fallback for web or SecureStore errors
let memoryIpCache: { location: ResolvedLocation; cachedAt: number; ip?: string } | null = null;

// Rate-limiting timestamp for Nominatim (1 req/sec policy)
let lastNominatimRequestTime = 0;

/**
 * Zod Schemas for external API responses
 */
const IpWhoIsSchema = z.object({
  success: z.boolean(),
  ip: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z
    .object({
      id: z.string().optional(),
    })
    .optional(),
});

const IpApiCoSchema = z.object({
  ip: z.string().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country_name: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string().nullable().optional(),
  error: z.boolean().optional(),
});

const OpenMeteoGeocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
        admin2: z.string().optional(),
        timezone: z.string().optional(),
        population: z.number().optional(),
      })
    )
    .optional(),
});

const NominatimItemSchema = z.object({
  place_id: z.union([z.number(), z.string()]),
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
  name: z.string().optional(),
  address: z
    .object({
      village: z.string().optional(),
      hamlet: z.string().optional(),
      town: z.string().optional(),
      city: z.string().optional(),
      municipality: z.string().optional(),
      county: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
    })
    .optional(),
});

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const signal = options.signal
      ? // Combine signals if caller passed one
        (options.signal as AbortSignal)
      : controller.signal;

    const res = await fetch(url, { ...options, signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Rate-limiting sleep to comply with Nominatim policy (1 req/sec)
 */
async function waitForNominatimSlot(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();
}

/**
 * Resolves location using Primary HTTPS IP service (ipwho.is)
 */
async function fetchFromIpWhoIs(): Promise<ResolvedLocation | null> {
  try {
    const res = await fetchWithTimeout('https://ipwho.is/', {}, 4000);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = IpWhoIsSchema.safeParse(json);
    if (!parsed.success || !parsed.data.success) return null;

    const data = parsed.data;
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;

    const name = data.city || data.region || 'Визначене місце';
    return {
      id: `ip_${data.latitude.toFixed(2)}_${data.longitude.toFixed(2)}`,
      name,
      admin1: data.region,
      country: data.country || 'Україна',
      countryCode: data.country_code || 'UA',
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id || 'Europe/Kyiv',
      source: 'ip',
      isIpEstimate: true,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves location using Fallback HTTPS IP service (ipapi.co)
 */
async function fetchFromIpApiCo(): Promise<ResolvedLocation | null> {
  try {
    const res = await fetchWithTimeout('https://ipapi.co/json/', {}, 4000);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = IpApiCoSchema.safeParse(json);
    if (!parsed.success || parsed.data.error) return null;

    const data = parsed.data;
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;

    const name = data.city || data.region || 'Визначене місце';
    return {
      id: `ip_${data.latitude.toFixed(2)}_${data.longitude.toFixed(2)}`,
      name,
      admin1: data.region || undefined,
      country: data.country_name || 'Україна',
      countryCode: data.country_code || 'UA',
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone || 'Europe/Kyiv',
      source: 'ip',
      isIpEstimate: true,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Get IP location from cache
 */
export async function getCachedIpLocation(): Promise<ResolvedLocation | null> {
  try {
    if (memoryIpCache && Date.now() - memoryIpCache.cachedAt < CACHE_TTL_MS) {
      return memoryIpCache.location;
    }
    const raw = await SecureStore.getItemAsync(IP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt < CACHE_TTL_MS && parsed.location) {
      memoryIpCache = parsed;
      return parsed.location;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Save IP location to cache
 */
async function saveIpLocationToCache(location: ResolvedLocation): Promise<void> {
  const item = { location, cachedAt: Date.now() };
  memoryIpCache = item;
  try {
    await SecureStore.setItemAsync(IP_CACHE_KEY, JSON.stringify(item));
  } catch {
    // SecureStore fallback
  }
}

/**
 * Resolve location via IP with primary & fallback service and 24h caching.
 */
export async function resolveIpLocation(forceRefresh = false): Promise<ResolvedLocation | null> {
  if (!forceRefresh) {
    const cached = await getCachedIpLocation();
    if (cached) return cached;
  }

  // 1. Try primary service (ipwho.is)
  const primary = await fetchFromIpWhoIs();
  if (primary) {
    await saveIpLocationToCache(primary);
    return primary;
  }

  // 2. Try fallback service (ipapi.co)
  const fallback = await fetchFromIpApiCo();
  if (fallback) {
    await saveIpLocationToCache(fallback);
    return fallback;
  }

  // 3. Fallback to stale cached if available and not forced
  if (!forceRefresh && memoryIpCache?.location) {
    return memoryIpCache.location;
  }

  return null;
}

export function clearIpLocationCache(): void {
  memoryIpCache = null;
}

/**
 * Search locations via Open-Meteo Geocoding API (count=20, language=uk)
 */
export async function searchOpenMeteoGeocoding(
  query: string,
  signal?: AbortSignal
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=20&language=uk&format=json`;

  const res = await fetch(url, { signal });
  if (!res.ok) return [];

  const json = await res.json();
  const parsed = OpenMeteoGeocodingSchema.safeParse(json);
  if (!parsed.success || !parsed.data.results) return [];

  return parsed.data.results.map((item) => ({
    id: `om_${item.id}`,
    name: item.name,
    admin1: item.admin1,
    admin2: item.admin2,
    country: item.country || '',
    countryCode: item.country_code,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
    population: item.population,
    source: 'open-meteo' as const,
  }));
}

/**
 * Fallback search via OpenStreetMap Nominatim for rare villages / small settlements
 */
export async function searchNominatimGeocoding(
  query: string,
  signal?: AbortSignal
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  await waitForNominatimSlot();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    trimmed
  )}&format=jsonv2&addressdetails=1&accept-language=uk`;

  const res = await fetch(url, {
    signal,
    headers: {
      'User-Agent': 'SmartGardenMobile/1.0 (contact@smartgarden.app)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) return [];

  const json = await res.json();
  if (!Array.isArray(json)) return [];

  const results: GeocodingResult[] = [];
  for (const raw of json) {
    const parsed = NominatimItemSchema.safeParse(raw);
    if (!parsed.success) continue;

    const item = parsed.data;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lon)) continue;

    const addr = item.address;
    const name =
      addr?.village ||
      addr?.hamlet ||
      addr?.town ||
      addr?.city ||
      addr?.municipality ||
      item.name ||
      item.display_name.split(',')[0].trim();

    results.push({
      id: `nom_${item.place_id}`,
      name,
      admin1: addr?.state,
      admin2: addr?.county,
      country: addr?.country || 'Україна',
      countryCode: addr?.country_code?.toUpperCase(),
      latitude: lat,
      longitude: lon,
      source: 'nominatim' as const,
    });
  }

  return results;
}

/**
 * Reverse geocode coordinates via Nominatim
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<{ name: string; admin1?: string; country: string }> {
  try {
    await waitForNominatimSlot();
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=14&addressdetails=1&accept-language=uk`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SmartGardenMobile/1.0 (contact@smartgarden.app)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error('Nominatim reverse error');
    const json = await res.json();
    const parsed = NominatimItemSchema.safeParse(json);
    if (parsed.success && parsed.data.address) {
      const addr = parsed.data.address;
      const name =
        addr.village ||
        addr.hamlet ||
        addr.town ||
        addr.city ||
        addr.municipality ||
        parsed.data.name ||
        `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

      return {
        name,
        admin1: addr.state,
        country: addr.country || 'Україна',
      };
    }
  } catch {
    // fallback
  }

  return {
    name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    country: 'Україна',
  };
}

/**
 * Resolve device GPS location using expo-location with balanced accuracy
 */
export async function resolveGpsLocation(): Promise<{
  location: ResolvedLocation | null;
  error?: string;
}> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        location: null,
        error: 'Дозвіл не надано, виберіть місце вручну',
      };
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const reverse = await reverseGeocodeCoordinates(lat, lon);

    const location: ResolvedLocation = {
      id: `gps_${lat.toFixed(3)}_${lon.toFixed(3)}`,
      name: reverse.name,
      admin1: reverse.admin1,
      country: reverse.country,
      latitude: lat,
      longitude: lon,
      source: 'gps',
      isIpEstimate: false,
      updatedAt: Date.now(),
    };

    return { location };
  } catch (err) {
    return {
      location: null,
      error: err instanceof Error ? err.message : 'Не вдалося визначити GPS координати',
    };
  }
}

/**
 * Parse and validate manual coordinates string
 * Handles both:
 * - Single combined string: "50.45, 30.52" or "50,45 / 30,52"
 * - Two separate strings: latStr and lonStr
 */
export function parseManualCoordinates(
  latInput: string,
  lonInput?: string,
  customLabel?: string
): { location: ResolvedLocation | null; error?: string } {
  let latRaw = latInput.trim();
  let lonRaw = lonInput?.trim() || '';

  // If only latInput provided, check if it contains both coordinates
  if (!lonRaw && (latRaw.includes(',') || latRaw.includes('/') || latRaw.includes(';'))) {
    const parts = latRaw
      .split(/[/;]|\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length === 2) {
      latRaw = parts[0];
      lonRaw = parts[1];
    } else {
      // Check comma separated: e.g. "50.45, 30.52" or "50,45, 30,52"
      const commaParts = latRaw.split(',').map((s) => s.trim()).filter(Boolean);
      if (commaParts.length === 2) {
        latRaw = commaParts[0];
        lonRaw = commaParts[1];
      } else if (commaParts.length === 4) {
        // e.g. "50, 45, 30, 52" with decimal commas
        latRaw = `${commaParts[0]}.${commaParts[1]}`;
        lonRaw = `${commaParts[2]}.${commaParts[3]}`;
      }
    }
  }

  // Normalize commas to dots for decimal point
  const normalizedLat = latRaw.replace(',', '.');
  const normalizedLon = lonRaw.replace(',', '.');

  const lat = parseFloat(normalizedLat);
  const lon = parseFloat(normalizedLon);

  if (isNaN(lat) || isNaN(lon)) {
    return {
      location: null,
      error: 'Введіть коректні числові координати (наприклад: 50.45 / 30.52)',
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      location: null,
      error: 'Широта має бути в діапазоні від -90 до 90',
    };
  }

  if (lon < -180 || lon > 180) {
    return {
      location: null,
      error: 'Довгота має бути в діапазоні від -180 до 180',
    };
  }

  const name = customLabel?.trim() || `Координати (${lat.toFixed(3)}, ${lon.toFixed(3)})`;

  const location: ResolvedLocation = {
    id: `manual_${lat.toFixed(4)}_${lon.toFixed(4)}`,
    name,
    customLabel: customLabel?.trim() || undefined,
    country: 'Україна',
    latitude: lat,
    longitude: lon,
    source: 'manual',
    isIpEstimate: false,
    updatedAt: Date.now(),
  };

  return { location };
}
