import { ApiClientError } from './api';

/**
 * Форматує помилку API у зрозуміле повідомлення (з урахуванням fieldErrors).
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
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
