import base from '@smart-garden/config/eslint/base';

export default [
  {
    ignores: ['node_modules/**', 'packages/*/dist/**', '.expo/**', 'coverage/**'],
  },
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // React Native JSX runtime is provided by babel-preset-expo
      'react/react-in-jsx-scope': 'off',
    },
  },
];
