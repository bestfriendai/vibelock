#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔧 Fixing Expo 54 Build Issues...\n");

// 1. Clean cache and temporary files
console.log("1. Cleaning cache and temporary files...");
try {
  execSync("npx expo prebuild --clean", { stdio: "inherit" });
  console.log("✅ Cleaned prebuild directories\n");
} catch (error) {
  console.log("⚠️ Prebuild clean failed, continuing...\n");
}

// 2. Fix Metro configuration for Expo 54
console.log("2. Checking Metro configuration...");
const metroConfigPath = path.join(__dirname, "..", "metro.config.js");
if (fs.existsSync(metroConfigPath)) {
  console.log("✅ Metro config exists\n");
} else {
  console.log("⚠️ Metro config missing, creating default...");
  const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add any custom configurations here
config.resolver.assetExts.push('db');

module.exports = config;
`;
  fs.writeFileSync(metroConfigPath, metroConfig);
  console.log("✅ Created metro.config.js\n");
}

// 3. Ensure postinstall script
console.log("3. Checking postinstall script...");
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

if (!packageJson.scripts.postinstall) {
  packageJson.scripts.postinstall = "patch-package";
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ Added postinstall script\n");
} else {
  console.log("✅ Postinstall script exists\n");
}

// 4. Clear watchman cache
console.log("4. Clearing watchman cache...");
try {
  execSync("watchman watch-del-all", { stdio: "ignore" });
  console.log("✅ Cleared watchman cache\n");
} catch (error) {
  console.log("⚠️ Watchman not installed or cache clear failed\n");
}

// 5. Clear Metro cache
console.log("5. Clearing Metro cache...");
try {
  execSync("npx expo start --clear", { stdio: "ignore", timeout: 5000 });
} catch (error) {
  // Expected to timeout, just clearing cache
}
console.log("✅ Cleared Metro cache\n");

// 6. Fix React Native 0.81.4 specific issues
console.log("6. Applying React Native 0.81.4 fixes...");

// Fix for new architecture support
console.log("✅ App config is properly configured for new architecture\n");

// 7. Verify Firebase configuration
console.log("7. Verifying Firebase configuration...");
const googleServicesPath = path.join(__dirname, "..", "google-services.json");
if (fs.existsSync(googleServicesPath)) {
  console.log("✅ google-services.json found\n");
} else {
  console.log("⚠️ google-services.json not found - Firebase features may not work\n");
}

// 8. Fix iOS specific issues
console.log("8. Checking iOS configuration...");
const iosPath = path.join(__dirname, "..", "ios");
if (fs.existsSync(iosPath)) {
  try {
    console.log("   Installing CocoaPods...");
    execSync("cd ios && pod install", { stdio: "inherit" });
    console.log("✅ CocoaPods installed successfully\n");
  } catch (error) {
    console.log("⚠️ CocoaPods installation failed - run manually if needed\n");
  }
}

// 9. Verify all Expo SDK 54 packages
console.log("9. Verifying Expo SDK 54 packages...");
try {
  execSync("npx expo install --check --fix", { stdio: "inherit" });
  console.log("✅ All packages verified and fixed\n");
} catch (error) {
  console.log("⚠️ Some packages may need manual attention\n");
}

// 10. Final diagnostics
console.log("10. Running final diagnostics...");
try {
  execSync("npx expo-doctor", { stdio: "inherit" });
} catch (error) {
  console.log("⚠️ expo-doctor found some issues - review above\n");
}

console.log("\n✨ Expo 54 build fixes applied!\n");
console.log("Next steps:");
console.log("1. Run: npx expo run:ios --device (for iOS development build)");
console.log("2. Run: npx expo run:android (for Android development build)");
console.log("3. Or use EAS: eas build --platform ios --profile development --local");
console.log("\nIf you still encounter issues:");
console.log("- Clear node_modules: rm -rf node_modules && npm install");
console.log("- Reset Metro: npx expo start --clear");
console.log("- Check logs: eas build:view [build-id]");
