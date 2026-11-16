import React from 'react';
import { ApiClientError } from '@smart-garden/api-client';
import { OfflineScreen } from '@/src/components/OfflineScreen';
import { QueryErrorCard } from '@/src/components/QueryErrorCard';
import { formatApiError, isNetworkError } from '@/src/lib/api-errors';
import { computeIsOffline } from '../network-context';
import { darkTheme, lightTheme } from '@/src/theme/tokens';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (element: React.ReactElement) => string;
};

let currentTheme = lightTheme;

jest.mock('@/src/theme/theme-context', () => ({
  useTheme: () => ({
    theme: currentTheme,
    toggleTheme: jest.fn(),
  }),
}));

describe('Робота без інтернету та з ним (Offline & Online Handling)', () => {
  beforeEach(() => {
    currentTheme = lightTheme;
  });

  describe('isNetworkError & formatApiError', () => {
    it('розпізнає типові мережеві помилки fetch/RN', () => {
      expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
      expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('NetworkError when attempting to fetch resource'))).toBe(true);

      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      expect(isNetworkError(abortErr)).toBe(true);
    });

    it('не вважає ApiClientError мережевою помилкою', () => {
      const apiErr = new ApiClientError({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Невірний email або пароль',
        requestId: 'req-1',
      });
      expect(isNetworkError(apiErr)).toBe(false);
      expect(formatApiError(apiErr, 'Fallback')).toBe('Невірний email або пароль');
    });

    it('форматує мережеву помилку зрозумілим українським текстом', () => {
      const msg = formatApiError(new TypeError('Network request failed'), 'Fallback');
      expect(msg).toContain('Не вдалося зʼєднатися із сервером');
    });
  });

  describe('computeIsOffline', () => {
    it('повертає true, якщо isConnected === false', () => {
      expect(computeIsOffline({ isConnected: false, isInternetReachable: false })).toBe(true);
      expect(computeIsOffline({ isConnected: false, isInternetReachable: null })).toBe(true);
    });

    it('повертає true, якщо Wi-Fi є, але isInternetReachable === false', () => {
      expect(computeIsOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
    });

    it('повертає false, коли мережа доступна або стан ще визначається', () => {
      expect(computeIsOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
      expect(computeIsOffline({ isConnected: true, isInternetReachable: null })).toBe(false);
    });
  });

  describe('OfflineScreen', () => {
    it('рендерить сторінку без інтернету з кнопкою повтору у світлій темі', () => {
      const markup = renderToStaticMarkup(
        React.createElement(OfflineScreen, {
          onRetry: jest.fn(),
        }),
      );
      expect(markup).toContain('Немає підключення до інтернету');
      expect(markup).toContain('Спробувати знову');
      expect(markup).not.toContain('Переглянути збережені дані');
    });

    it('показує кнопку перегляду збережених даних для авторизованого користувача у темній темі', () => {
      currentTheme = darkTheme;
      const markup = renderToStaticMarkup(
        React.createElement(OfflineScreen, {
          onRetry: jest.fn(),
          canContinueOffline: true,
          onContinueOffline: jest.fn(),
        }),
      );
      expect(markup).toContain('Немає підключення до інтернету');
      expect(markup).toContain('Переглянути збережені дані');
    });
  });

  describe('QueryErrorCard', () => {
    it('відображає дружнє повідомлення при мережевій помилці', () => {
      const markup = renderToStaticMarkup(
        React.createElement(QueryErrorCard, {
          error: new TypeError('Network request failed'),
          onRetry: jest.fn(),
        }),
      );
      expect(markup).toContain('Немає зʼєднання з сервером');
      expect(markup).toContain('Повторити');
    });

    it('відображає повідомлення сервера для ApiClientError', () => {
      const markup = renderToStaticMarkup(
        React.createElement(QueryErrorCard, {
          error: new ApiClientError({
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message: 'Сервер тимчасово недоступний',
            requestId: 'req-2',
          }),
          onRetry: jest.fn(),
        }),
      );
      expect(markup).toContain('Помилка завантаження');
      expect(markup).toContain('Сервер тимчасово недоступний');
    });
  });
});
