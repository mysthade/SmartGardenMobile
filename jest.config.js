/** Unit tests cover pure logic (no React Native rendering) → ts-jest is enough. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-secure-store$': '<rootDir>/src/lib/__mocks__/expo-secure-store.ts',
    '^react-native$': '<rootDir>/src/lib/__mocks__/react-native.ts',
    // Map workspace packages to their TS sources (dist is ESM, Jest runs CJS)
    '^@smart-garden/api-client$': '<rootDir>/packages/api-client/src/index.ts',
    '^@smart-garden/types$': '<rootDir>/packages/types/src/index.ts',
    '^@smart-garden/validation$': '<rootDir>/packages/validation/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react' },
      },
    ],
  },
};
