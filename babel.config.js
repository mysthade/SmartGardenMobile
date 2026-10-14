// Babel config: Expo preset + worklets plugin for reanimated.
// The worklets plugin MUST be listed last (reanimated requirement).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
