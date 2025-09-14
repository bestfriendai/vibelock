module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
        },
      ],
      "nativewind/babel",
    ],
    // Use only the Worklets plugin (Reanimated v4+ integrates via worklets)
    // This plugin MUST be listed last!
    plugins: ["react-native-worklets/plugin"],
  };
};
