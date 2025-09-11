module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          reactCompiler: true,
        },
      ],
      "nativewind/babel",
    ],
    plugins: [
      // This plugin MUST be listed last!
      "react-native-reanimated/plugin",
    ],
  };
};
