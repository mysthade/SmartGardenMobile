import type { TempUnit, WindUnit, PrecipUnit } from '../types';

export function convertTemperature(celsius: number, unit: TempUnit): number {
  if (unit === 'fahrenheit') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

export function formatTemperature(celsius: number, unit: TempUnit = 'celsius'): string {
  const converted = convertTemperature(celsius, unit);
  const sign = converted > 0 ? '+' : '';
  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';
  return `${sign}${converted}${unitSymbol}`;
}

export function convertWindSpeed(ms: number, unit: WindUnit): number {
  if (unit === 'kmh') {
    return Math.round(ms * 3.6 * 10) / 10;
  }
  if (unit === 'mph') {
    return Math.round(ms * 2.23694 * 10) / 10;
  }
  return Math.round(ms * 10) / 10;
}

export function formatWindSpeed(ms: number, unit: WindUnit = 'ms'): string {
  const val = convertWindSpeed(ms, unit);
  if (unit === 'kmh') return `${val} км/год`;
  if (unit === 'mph') return `${val} mph`;
  return `${val} м/с`;
}

export function convertPrecipitation(mm: number, unit: PrecipUnit): number {
  if (unit === 'inch') {
    return Math.round((mm / 25.4) * 100) / 100;
  }
  return Math.round(mm * 10) / 10;
}

export function formatPrecipitation(mm: number, unit: PrecipUnit = 'mm'): string {
  const val = convertPrecipitation(mm, unit);
  if (unit === 'inch') return `${val} in`;
  return `${val} мм`;
}

/**
 * Format ISO time (or date string) in the given timezone or using utc_offset_seconds
 */
export function formatTimeInTimezone(
  isoString: string,
  timeZone?: string,
  utcOffsetSeconds?: number
): { formattedTime: string; hour: number; dayLabel: string } {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return { formattedTime: '--:--', hour: 0, dayLabel: '' };
    }

    if (timeZone) {
      const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const hourFormatter = new Intl.DateTimeFormat('uk-UA', {
        timeZone,
        hour: 'numeric',
        hour12: false,
      });
      const dayFormatter = new Intl.DateTimeFormat('uk-UA', {
        timeZone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      const formattedTime = timeFormatter.format(date);
      const hour = parseInt(hourFormatter.format(date), 10) || 0;
      const dayLabel = dayFormatter.format(date);
      return { formattedTime, hour, dayLabel };
    }

    if (typeof utcOffsetSeconds === 'number') {
      const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
      const targetDate = new Date(utcMs + utcOffsetSeconds * 1000);
      const hours = targetDate.getHours().toString().padStart(2, '0');
      const minutes = targetDate.getMinutes().toString().padStart(2, '0');
      return { formattedTime: `${hours}:${minutes}`, hour: targetDate.getHours(), dayLabel: '' };
    }

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return { formattedTime: `${hours}:${minutes}`, hour: date.getHours(), dayLabel: '' };
  } catch {
    return { formattedTime: '--:--', hour: 0, dayLabel: '' };
  }
}

/**
 * Format day of week in Ukrainian
 */
export function formatDayLabel(dateString: string, index: number): string {
  if (index === 0) return 'Сьогодні';
  if (index === 1) return 'Завтра';

  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
      return days[d.getDay()] || dateString;
    }
  } catch {
    // fallback
  }
  return dateString;
}
