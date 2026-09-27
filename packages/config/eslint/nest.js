import base from './base.js';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // NestJS DI / emitDecoratorMetadata requires value imports for injected classes
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
