/** Unit tests cover pure logic (no React Native rendering) → ts-jest is enough. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-secure-store$': '<rootDir>/src/lib/__mocks__/expo-secure-store.ts',
    '^expo-constants$': '<rootDir>/src/lib/__mocks__/expo-constants.ts',
    '^react-native$': '<rootDir>/src/lib/__mocks__/react-native.ts',
    '^react-native-safe-area-context$': '<rootDir>/src/lib/__mocks__/react-native-safe-area-context.ts',
    '^expo-linear-gradient$': '<rootDir>/src/lib/__mocks__/expo-linear-gradient.ts',
    '^expo-status-bar$': '<rootDir>/src/lib/__mocks__/expo-status-bar.ts',
    '^expo-router$': '<rootDir>/src/lib/__mocks__/expo-router.ts',
    '^react-native-svg$': '<rootDir>/src/lib/__mocks__/react-native-svg.ts',
    '^lucide-react-native$': '<rootDir>/src/lib/__mocks__/lucide-react-native.ts',
    // Map workspace packages to their TS sources (dist is ESM, Jest runs CJS)
    '^@smart-garden/api-client$': '<rootDir>/packages/api-client/src/index.ts',
    '^@smart-garden/types$': '<rootDir>/packages/types/src/index.ts',
    '^@smart-garden/validation$': '<rootDir>/packages/validation/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' },
      },
    ],
  },
};
