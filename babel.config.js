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
          jsxImportSource: "nativewind",
          // Enhanced Hermes compatibility
          ...(isHermes && {
            unstable_transformProfile: "hermes-stable",
          }),
        },
      ],
      "nativewind/babel",
    ],
    plugins: [
      // Property definition safety transforms for Hermes
      ...(isHermes
        ? [
            // Transform Object.defineProperty calls to be safer in Hermes
            [
              require.resolve("./babel-plugins/hermes-property-safety.js"),
              {
                // Options for property safety transformation
                wrapDefineProperty: true,
                addConfigurabilityChecks: true,
                enableLogging: process.env.NODE_ENV === "development",
              },
            ],
          ]
        : []),

      // Use only the Worklets plugin (Reanimated v4+ integrates via worklets)
      // This plugin MUST be listed last!
      "react-native-worklets/plugin",
    ],
  };

  // Log configuration for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[Babel] Hermes detected:", isHermes);
    console.log("[Babel] Configuration:", JSON.stringify(config, null, 2));
  }

  return config;
};
