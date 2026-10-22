import {
  parseManualCoordinates,
  resolveIpLocation,
  searchOpenMeteoGeocoding,
  searchNominatimGeocoding,
  reverseGeocodeCoordinates,
  resolveGpsLocation,
} from '../lib/location';

// Mock SecureStore
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

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 49.8383,
      longitude: 24.0232,
    },
  }),
  Accuracy: {
    Balanced: 3,
  },
}));

describe('weather-location', () => {
  describe('parseManualCoordinates', () => {
    it('parses valid coordinates with dot separators', () => {
      const res = parseManualCoordinates('50.4501', '30.5234');
      expect(res.error).toBeUndefined();
      expect(res.location).toBeDefined();
      expect(res.location?.latitude).toBeCloseTo(50.4501);
      expect(res.location?.longitude).toBeCloseTo(30.5234);
      expect(res.location?.source).toBe('manual');
    });

    it('parses valid coordinates with comma separators', () => {
      const res = parseManualCoordinates('48,9226', '24,7111');
      expect(res.error).toBeUndefined();
      expect(res.location).toBeDefined();
      expect(res.location?.latitude).toBeCloseTo(48.9226);
      expect(res.location?.longitude).toBeCloseTo(24.7111);
    });

    it('parses combined single-string format with slash or comma', () => {
      const res1 = parseManualCoordinates('50.45 / 30.52');
      expect(res1.location?.latitude).toBeCloseTo(50.45);
      expect(res1.location?.longitude).toBeCloseTo(30.52);

      const res2 = parseManualCoordinates('49.8383, 24.0232');
      expect(res2.location?.latitude).toBeCloseTo(49.8383);
      expect(res2.location?.longitude).toBeCloseTo(24.0232);
    });

    it('parses four-comma decimal format (50, 45, 30, 52)', () => {
      const res = parseManualCoordinates('50,45, 30,52');
      expect(res.location?.latitude).toBeCloseTo(50.45);
      expect(res.location?.longitude).toBeCloseTo(30.52);
    });

    it('applies custom label when provided', () => {
      const res = parseManualCoordinates('50.45', '30.52', 'Дача біля лісу');
      expect(res.location?.customLabel).toBe('Дача біля лісу');
      expect(res.location?.name).toBe('Дача біля лісу');
    });

    it('validates latitude boundaries (-90 to 90)', () => {
      const res = parseManualCoordinates('95.0', '30.0');
      expect(res.location).toBeNull();
      expect(res.error).toContain('Широта має бути в діапазоні');
    });

    it('validates longitude boundaries (-180 to 180)', () => {
      const res = parseManualCoordinates('50.0', '195.0');
      expect(res.location).toBeNull();
      expect(res.error).toContain('Довгота має бути в діапазоні');
    });

    it('returns friendly error for invalid strings', () => {
      const res = parseManualCoordinates('abc', 'xyz');
      expect(res.location).toBeNull();
      expect(res.error).toContain('Введіть коректні числові координати');
    });
  });

  describe('resolveIpLocation', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('resolves location from primary service (ipwho.is)', async () => {
      globalThis.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('ipwho.is')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              city: 'Івано-Франківськ',
              region: 'Івано-Франківська область',
              country: 'Україна',
              country_code: 'UA',
              latitude: 48.9226,
              longitude: 24.7111,
              timezone: { id: 'Europe/Kyiv' },
            }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const loc = await resolveIpLocation(true);
      expect(loc).toBeDefined();
      expect(loc?.name).toBe('Івано-Франківськ');
      expect(loc?.admin1).toBe('Івано-Франківська область');
      expect(loc?.latitude).toBeCloseTo(48.9226);
      expect(loc?.source).toBe('ip');
      expect(loc?.isIpEstimate).toBe(true);
    });

    it('falls back to secondary service (ipapi.co) when primary fails', async () => {
      globalThis.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('ipwho.is')) {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        if (url.includes('ipapi.co')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              city: 'Львів',
              region: 'Львівська область',
              country_name: 'Україна',
              country_code: 'UA',
              latitude: 49.8383,
              longitude: 24.0232,
              timezone: 'Europe/Kyiv',
            }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const loc = await resolveIpLocation(true);
      expect(loc).toBeDefined();
      expect(loc?.name).toBe('Львів');
      expect(loc?.admin1).toBe('Львівська область');
      expect(loc?.latitude).toBeCloseTo(49.8383);
    });

    it('returns null gracefully without crashing when all services fail', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));
      const loc = await resolveIpLocation(true);
      expect(loc).toBeNull();
    });
  });

  describe('Geocoding search', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('parses Open-Meteo search results with admin1 and admin2', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 703448,
              name: 'Київ',
              latitude: 50.45466,
              longitude: 30.5238,
              country: 'Україна',
              country_code: 'UA',
              admin1: 'Місто Київ',
              population: 2797553,
            },
          ],
        }),
      });

      const results = await searchOpenMeteoGeocoding('Київ');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Київ');
      expect(results[0].admin1).toBe('Місто Київ');
      expect(results[0].source).toBe('open-meteo');
    });

    it('parses Nominatim village results with full address details', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            place_id: 12345,
            lat: '48.8833',
            lon: '24.7167',
            display_name: 'Опришівці, Івано-Франківська область, Україна',
            address: {
              village: 'Опришівці',
              county: 'Івано-Франківський район',
              state: 'Івано-Франківська область',
              country: 'Україна',
              country_code: 'ua',
            },
          },
        ],
      });

      const results = await searchNominatimGeocoding('Опришівці');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Опришівці');
      expect(results[0].admin1).toBe('Івано-Франківська область');
      expect(results[0].admin2).toBe('Івано-Франківський район');
      expect(results[0].source).toBe('nominatim');
    });

    it('reverse geocodes coordinates via Nominatim', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          place_id: 67890,
          lat: '49.8383',
          lon: '24.0232',
          display_name: 'Львів, Львівська область, Україна',
          address: {
            city: 'Львів',
            state: 'Львівська область',
            country: 'Україна',
          },
        }),
      });

      const res = await reverseGeocodeCoordinates(49.8383, 24.0232);
      expect(res.name).toBe('Львів');
      expect(res.admin1).toBe('Львівська область');
    });
  });

  describe('resolveGpsLocation', () => {
    it('resolves location using GPS when permission is granted', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          place_id: 111,
          lat: '49.8383',
          lon: '24.0232',
          display_name: 'Львів, Україна',
          address: { city: 'Львів', country: 'Україна' },
        }),
      });

      const res = await resolveGpsLocation();
      expect(res.error).toBeUndefined();
      expect(res.location).toBeDefined();
      expect(res.location?.source).toBe('gps');
      expect(res.location?.latitude).toBeCloseTo(49.8383);
    });

    it('returns friendly message when permission is denied', async () => {
      const Location = jest.requireMock('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const res = await resolveGpsLocation();
      expect(res.location).toBeNull();
      expect(res.error).toBe('Дозвіл не надано, виберіть місце вручну');
    });
  });
});
