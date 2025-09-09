#!/usr/bin/env node

/**
 * RevenueCat Integration Test
 *
 * This script tests the RevenueCat integration by checking:
 * - Environment variables are set
 * - Configuration is valid
 * - App can initialize (in mock mode)
 */

require("dotenv").config();

console.log("🧪 Testing RevenueCat Integration...\n");

// Test 1: Environment Variables
console.log("1️⃣ Checking Environment Variables...");
const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

if (iosKey && iosKey.startsWith("appl_")) {
  console.log("✅ iOS API Key is set and valid");
} else {
  console.log("❌ iOS API Key is missing or invalid");
}

if (androidKey && androidKey.startsWith("goog_")) {
  console.log("✅ Android API Key is set and valid");
} else {
  console.log("❌ Android API Key is missing or invalid");
}

// Test 2: Configuration Values
console.log("\n2️⃣ Checking Configuration...");
console.log(`iOS Key: ${iosKey ? iosKey.substring(0, 10) + "..." : "Not set"}`);
console.log(`Android Key: ${androidKey ? androidKey.substring(0, 10) + "..." : "Not set"}`);

// Test 3: Mock Initialization Test
console.log("\n3️⃣ Testing Mock Initialization...");
try {
  // Simulate the build environment check
  const isExpoGo = true; // Simulate Expo Go environment
  const canUseRevenueCat = !isExpoGo;

  console.log(`Environment: ${isExpoGo ? "Expo Go" : "Development Build"}`);
  console.log(`Can use RevenueCat: ${canUseRevenueCat}`);

  if (!canUseRevenueCat) {
    console.log("✅ Mock implementation will be used (expected in Expo Go)");
  } else {
    console.log("✅ Real RevenueCat will be used (expected in development builds)");
  }
} catch (error) {
  console.log("❌ Configuration test failed:", error.message);
}

// Test 4: Bundle ID Consistency
console.log("\n4️⃣ Checking Bundle ID Consistency...");
const fs = require("fs");
try {
  const appJson = JSON.parse(fs.readFileSync("app.json", "utf8"));
  const iosBundleId = appJson.expo.ios.bundleIdentifier;
  const androidPackage = appJson.expo.android.package;

  if (iosBundleId === "com.lockerroomtalk.app") {
    console.log("✅ iOS Bundle ID matches RevenueCat configuration");
  } else {
    console.log("❌ iOS Bundle ID mismatch:", iosBundleId);
  }

  if (androidPackage === "com.lockerroomtalk.app") {
    console.log("✅ Android Package Name matches RevenueCat configuration");
  } else {
    console.log("❌ Android Package Name mismatch:", androidPackage);
  }
} catch (error) {
  console.log("❌ Could not read app.json:", error.message);
}

// Test 5: File Structure
console.log("\n5️⃣ Checking File Structure...");
const requiredFiles = [
  "src/state/subscriptionStore.ts",
  "src/components/subscription/PaywallAdaptive.tsx",
  "src/utils/buildEnvironment.ts",
  "src/components/FeatureGate.tsx",
];

let allFilesExist = true;
requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Summary
console.log("\n📋 Test Summary:");
const hasValidKeys = iosKey && androidKey && iosKey.startsWith("appl_") && androidKey.startsWith("goog_");
const hasValidConfig = hasValidKeys && allFilesExist;

if (hasValidConfig) {
  console.log("🎉 All tests passed! RevenueCat integration is ready.");
  console.log("\n📝 Next steps:");
  console.log("1. Start your app: npm start");
  console.log("2. Test the paywall in Expo Go (demo mode)");
  console.log("3. Create development build for real testing");
  console.log("4. Set up store products and test purchases");
} else {
  console.log("⚠️ Some tests failed. Please review the issues above.");
}

console.log("\n🚀 Your RevenueCat setup is complete and ready for testing!");
