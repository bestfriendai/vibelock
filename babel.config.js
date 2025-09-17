module.exports = function (api) {
  api.cache(true);

  // Detect if running on Hermes for conditional transformations
  const isHermes =
    process.env.HERMES === "true" || process.env.JS_ENGINE === "hermes" || process.env.NODE_ENV === "production";

  const config = {
    presets: [
      [
        "babel-preset-expo",
        {
          // Use automatic JSX runtime for React 19 compatibility
          jsxRuntime: "automatic",
          // Enhanced Hermes compatibility
          ...(isHermes && {
            unstable_transformProfile: "hermes-stable",
          }),
        },
      ],
      "nativewind/babel",
    ],
    plugins: [
      // Reanimated plugin is automatically configured by babel-preset-expo for SDK 54
      // Do not manually add react-native-reanimated/plugin
    ],
  };

  // Log configuration for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[Babel] Hermes detected:", isHermes);
    console.log("[Babel] Configuration:", JSON.stringify(config, null, 2));
  }

  return config;
};
