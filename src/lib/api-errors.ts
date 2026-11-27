import { ApiClientError } from './api';

const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'failed to fetch',
  'fetch failed',
  'failed to connect',
  'connectexception',
  'networkerror',
  'load failed',
  'the internet connection appears to be offline',
  'network is unreachable',
  'timed out',
  'timeout',
  'econnrefused',
  'enotfound',
  'err_network',
];

/**
 * Перевіряє, чи є помилка мережевою (відсутній інтернет, таймаут, недоступний сервер).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof ApiClientError) return false;
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    const msg = error.message.toLowerCase();
    return NETWORK_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
  }
  return false;
}

/**
 * Форматує помилку API у зрозуміле повідомлення (з урахуванням fieldErrors та мережевих збоїв).
 */
export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.fieldErrors) {
      const details = Object.values(error.fieldErrors).flat().join('\n');
      if (details) {
        return details;
      }
    }
    return error.message || fallback;
  }
  if (isNetworkError(error)) {
    return 'Не вдалося зʼєднатися із сервером. Перевірте підключення до інтернету та доступність сервера.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
