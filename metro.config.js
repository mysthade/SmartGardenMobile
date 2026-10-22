/* eslint-disable @typescript-eslint/no-require-imports */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force single instance of three.js across monorepo and packages
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  three: path.resolve(__dirname, 'node_modules/three'),
};

// Enable inline requires for faster startup and reduced memory usage
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
