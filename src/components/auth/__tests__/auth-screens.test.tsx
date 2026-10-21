import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (element: React.ReactElement) => string;
};
import LoginScreen from '@/app/login';
import RegisterScreen from '@/app/register';
import { PasswordStrengthMeter } from '../password-strength';
import { AuthScreenLayout } from '../AuthScreenLayout';
import { AuthField } from '../auth-fields';
import { lightTheme } from '@/src/theme/tokens';

// Mock auth context
jest.mock('@/src/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'anonymous',
    user: null,
    login: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue('Перевірте пошту для активації акаунту'),
    logout: jest.fn().mockResolvedValue(undefined),
    setUser: jest.fn(),
  }),
}));

// Mock theme context
jest.mock('@/src/theme/theme-context', () => ({
  useTheme: () => ({
    theme: lightTheme,
    toggleTheme: jest.fn(),
  }),
}));

describe('Auth Screens - Рендер та валідація компонентів', () => {
  it('LoginScreen коректно створює дерево компонентів', () => {
    const element = React.createElement(LoginScreen);
    expect(element).toBeDefined();
    expect(element.type).toBe(LoginScreen);
  });

  it('RegisterScreen коректно створює дерево компонентів', () => {
    const element = React.createElement(RegisterScreen);
    expect(element).toBeDefined();
    expect(element.type).toBe(RegisterScreen);
  });

  it('RegisterScreen містить поле підтвердження пароля', () => {
    const markup = renderToStaticMarkup(React.createElement(RegisterScreen));
    expect(markup).toContain('Повторіть пароль');
    expect(markup).toContain('register-confirm-password');
  });

  it('AuthField відображає success стан та повідомлення про збіг паролів', () => {
    const markup = renderToStaticMarkup(
      React.createElement(AuthField, {
        label: 'Повторіть пароль',
        value: 'Pass1234',
        onChangeText: jest.fn(),
        leadingIcon: '🔒',
        focused: false,
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        success: true,
        successMessage: '✓ Паролі збігаються',
        testID: 'confirm-pwd',
      })
    );
    expect(markup).toContain('✓ Паролі збігаються');
    expect(markup).toContain('confirm-pwd-success');
  });

  it('AuthField відображає error стан та повідомлення про розбіжність', () => {
    const markup = renderToStaticMarkup(
      React.createElement(AuthField, {
        label: 'Повторіть пароль',
        value: 'PassDifferent',
        onChangeText: jest.fn(),
        leadingIcon: '🔒',
        focused: false,
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        error: 'Паролі не збігаються',
        testID: 'confirm-pwd',
      })
    );
    expect(markup).toContain('Паролі не збігаються');
    expect(markup).toContain('confirm-pwd-error');
  });

  it('PasswordStrengthMeter рендериться з підказкою за замовчуванням', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PasswordStrengthMeter, {
        password: '',
        hint: 'Щонайменше 8 символів',
      })
    );
    expect(markup).toContain('Щонайменше 8 символів');
  });

  it('PasswordStrengthMeter показує червону підказку при помилці', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PasswordStrengthMeter, {
        password: '123',
        hasError: true,
        errorMessage: 'Пароль занадто короткий',
      })
    );
    expect(markup).toContain('Пароль занадто короткий');
    expect(markup).toContain('Слабкий');
  });

  it('AuthScreenLayout підтримує вкладений контент і testID', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AuthScreenLayout,
        { testID: 'test-layout' },
        React.createElement('div', { testID: 'child' }, 'Контент')
      )
    );
    expect(markup).toContain('Smart Garden');
    expect(markup).toContain('Контент');
  });

  it('Snapshot для LoginScreen', () => {
    const markup = renderToStaticMarkup(React.createElement(LoginScreen));
    expect(markup).toMatchSnapshot();
  });

  it('Snapshot для RegisterScreen', () => {
    const markup = renderToStaticMarkup(React.createElement(RegisterScreen));
    expect(markup).toMatchSnapshot();
  });
});
