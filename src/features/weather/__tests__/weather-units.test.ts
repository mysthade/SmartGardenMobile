import {
  convertTemperature,
  formatTemperature,
  convertWindSpeed,
  formatWindSpeed,
  convertPrecipitation,
  formatPrecipitation,
  formatTimeInTimezone,
  formatDayLabel,
} from '../lib/weather-units';

describe('weather-units', () => {
  describe('Temperature conversion and formatting', () => {
    it('converts Celsius to Celsius and Fahrenheit accurately', () => {
      expect(convertTemperature(0, 'celsius')).toBe(0);
      expect(convertTemperature(20, 'celsius')).toBe(20);
      expect(convertTemperature(0, 'fahrenheit')).toBe(32);
      expect(convertTemperature(100, 'fahrenheit')).toBe(212);
      expect(convertTemperature(-10, 'fahrenheit')).toBe(14);
    });

    it('formats temperature strings with sign and unit', () => {
      expect(formatTemperature(21.4, 'celsius')).toBe('+21°C');
      expect(formatTemperature(0, 'celsius')).toBe('0°C');
      expect(formatTemperature(-5.2, 'celsius')).toBe('-5°C');
      expect(formatTemperature(20, 'fahrenheit')).toBe('+68°F');
    });
  });

  describe('Wind speed conversion and formatting', () => {
    it('converts m/s to km/h and mph', () => {
      expect(convertWindSpeed(10, 'ms')).toBe(10);
      expect(convertWindSpeed(10, 'kmh')).toBe(36);
      expect(convertWindSpeed(10, 'mph')).toBe(22.4);
    });

    it('formats wind speed with appropriate labels', () => {
      expect(formatWindSpeed(5.5, 'ms')).toBe('5.5 м/с');
      expect(formatWindSpeed(10, 'kmh')).toBe('36 км/год');
      expect(formatWindSpeed(10, 'mph')).toBe('22.4 mph');
    });
  });

  describe('Precipitation conversion and formatting', () => {
    it('converts mm to inches', () => {
      expect(convertPrecipitation(25.4, 'inch')).toBe(1);
      expect(convertPrecipitation(10, 'mm')).toBe(10);
    });

    it('formats precipitation strings', () => {
      expect(formatPrecipitation(5.2, 'mm')).toBe('5.2 мм');
      expect(formatPrecipitation(25.4, 'inch')).toBe('1 in');
    });
  });

  describe('Timezone formatting', () => {
    it('formats time with utcOffsetSeconds', () => {
      // 2026-10-22T12:00:00Z with UTC+3 (10800s)
      const res = formatTimeInTimezone('2026-10-22T12:00:00Z', undefined, 10800);
      expect(res.formattedTime).toBe('15:00');
      expect(res.hour).toBe(15);
    });

    it('handles invalid dates gracefully', () => {
      const res = formatTimeInTimezone('invalid-date');
      expect(res.formattedTime).toBe('--:--');
    });
  });

  describe('Day label formatting', () => {
    it('formats index 0 as Сьогодні and index 1 as Завтра', () => {
      expect(formatDayLabel('2026-10-22', 0)).toBe('Сьогодні');
      expect(formatDayLabel('2026-10-23', 1)).toBe('Завтра');
    });

    it('formats subsequent days as Ukrainian day of week', () => {
      // 2026-10-25 is Sunday
      expect(formatDayLabel('2026-10-25', 3)).toBe('Неділя');
    });
  });
});
