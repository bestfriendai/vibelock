#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Load environment variables from .env.production
const envPath = path.join(__dirname, "..", ".env.production");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

const REQUIRED_KEYS = {
  // Critical - App won't work without these
  CRITICAL: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"],

  // Required for monetization
  MONETIZATION: [
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    "EXPO_PUBLIC_ADMOB_BANNER_IOS",
    "EXPO_PUBLIC_ADMOB_BANNER_ANDROID",
    "EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS",
    "EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID",
    "EXPO_PUBLIC_ADMOB_APP_OPEN_IOS",
    "EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID",
  ],

  // Required for push notifications
  PUSH_NOTIFICATIONS: [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
  ],

  // Required for production monitoring
  MONITORING: ["EXPO_PUBLIC_SENTRY_DSN"],

  // Required files
  FILES: ["google-services.json", "privacy-policy.md", "terms-of-service.md", "assets/icon-1024.png"],
};

console.log("🔍 Verifying API Keys and Configuration for App Store Submission...\n");
console.log("=".repeat(60));

let hasErrors = false;
let hasWarnings = false;

// Check environment variables
Object.entries(REQUIRED_KEYS).forEach(([category, keys]) => {
  if (category === "FILES") return;

  console.log(`\n${category} Keys:`);
  let categoryComplete = true;

  // Use explicit environment variable access instead of dynamic access
  const envValues = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
    REVENUECAT_WEBHOOK_SECRET: process.env.REVENUECAT_WEBHOOK_SECRET,
    ADMOB_APP_ID: process.env.ADMOB_APP_ID,
    ADMOB_BANNER_ID: process.env.ADMOB_BANNER_ID,
    ADMOB_INTERSTITIAL_ID: process.env.ADMOB_INTERSTITIAL_ID,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GROK_API_KEY: process.env.GROK_API_KEY,
  };

  keys.forEach((key) => {
    const value = envValues[key];
    if (!value) {
      if (category === "CRITICAL") {
        console.log(`  ❌ ${key} - MISSING (CRITICAL)`);
        hasErrors = true;
      } else {
        console.log(`  ⚠️  ${key} - Missing`);
        hasWarnings = true;
      }
      categoryComplete = false;
    } else {
      const masked = value.substring(0, 10) + "...";
      console.log(`  ✅ ${key} - Set (${masked})`);
    }
  });

  if (categoryComplete) {
    console.log(`  ✨ All ${category.toLowerCase()} keys configured!`);
  }
});

// Check required files
console.log("\n\nRequired Files:");
REQUIRED_KEYS.FILES.forEach((file) => {
  const fullPath = path.join(__dirname, "..", file);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    const size = (stat.size / 1024).toFixed(2);
    console.log(`  ✅ ${file} (${size} KB)`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Service-specific validations
console.log("\n\nService Validations:");

// Validate Supabase URL format
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  if (!supabaseUrl.includes(".supabase.co")) {
    console.log('  ⚠️  Supabase URL might be invalid - should include ".supabase.co"');
    hasWarnings = true;
  } else {
    console.log("  ✅ Supabase URL format valid");
  }
}

// Validate AdMob format
const admobBanner = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;
if (admobBanner) {
  if (!admobBanner.startsWith("ca-app-pub-")) {
    console.log('  ⚠️  AdMob ID format might be invalid - should start with "ca-app-pub-"');
    hasWarnings = true;
  } else {
    console.log("  ✅ AdMob ID format valid");
  }
}

// Validate RevenueCat keys
const rcIOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const rcAndroid = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
if (rcIOS && rcAndroid) {
  if (rcIOS.startsWith("appl_") && rcAndroid.startsWith("goog_")) {
    console.log("  ✅ RevenueCat keys format valid");
  } else {
    console.log("  ⚠️  RevenueCat key format might be invalid");
    hasWarnings = true;
  }
}

// Check app.json configuration
console.log("\n\nApp Configuration:");
const appJsonPath = path.join(__dirname, "..", "app.json");
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

  // Check basic app info
  if (appJson.expo) {
    console.log(`  ✅ App Name: ${appJson.expo.name}`);
    console.log(`  ✅ Bundle ID: ${appJson.expo.ios?.bundleIdentifier || "Not set"}`);
    console.log(`  ✅ Package: ${appJson.expo.android?.package || "Not set"}`);
    console.log(`  ✅ Version: ${appJson.expo.version}`);

    // Check AdMob config
    if (appJson.expo.plugins) {
      const admobPlugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-ads-admob");
      if (admobPlugin) {
        console.log("  ✅ AdMob plugin configured");
      }
    }
  }
} else {
  console.log("  ❌ app.json not found");
  hasErrors = true;
}

// Check EAS configuration
console.log("\n\nEAS Build Configuration:");
const easJsonPath = path.join(__dirname, "..", "eas.json");
if (fs.existsSync(easJsonPath)) {
  const easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf8"));

  if (easJson.build && easJson.build.production) {
    console.log("  ✅ Production build profile configured");

    // Check for environment
    if (easJson.build.production.env?.NODE_ENV === "production") {
      console.log("  ✅ NODE_ENV set to production");
    } else {
      console.log("  ⚠️  NODE_ENV not explicitly set to production");
      hasWarnings = true;
    }

    // Check resource class
    const iosResourceClass = easJson.build.production.ios?.resourceClass;
    const androidResourceClass = easJson.build.production.android?.resourceClass;

    if (iosResourceClass && androidResourceClass) {
      console.log(`  ✅ Build resources: iOS (${iosResourceClass}), Android (${androidResourceClass})`);
    }
  } else {
    console.log("  ❌ Production build profile not found in eas.json");
    hasErrors = true;
  }

  if (easJson.submit) {
    console.log("  ✅ Submit configuration found");
  } else {
    console.log("  ⚠️  Submit configuration not found - will need manual submission");
    hasWarnings = true;
  }
} else {
  console.log("  ❌ eas.json not found");
  hasErrors = true;
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("\n📊 VERIFICATION SUMMARY\n");

const criticalKeys = REQUIRED_KEYS.CRITICAL.filter((key) => !process.env[key]);
const monetizationKeys = REQUIRED_KEYS.MONETIZATION.filter((key) => !process.env[key]);
const pushKeys = REQUIRED_KEYS.PUSH_NOTIFICATIONS.filter((key) => !process.env[key]);
const monitoringKeys = REQUIRED_KEYS.MONITORING.filter((key) => !process.env[key]);

if (criticalKeys.length > 0) {
  console.log("🚨 CRITICAL ISSUES (Must fix before submission):");
  console.log(`  - Missing ${criticalKeys.length} critical environment variable(s)`);
  criticalKeys.forEach((key) => console.log(`    • ${key}`));
}

if (monetizationKeys.length > 0) {
  console.log("\n💰 MONETIZATION SETUP:");
  if (monetizationKeys.length === REQUIRED_KEYS.MONETIZATION.length) {
    console.log("  - Monetization not configured (AdMob & RevenueCat)");
    console.log("  - App will work but without ads or in-app purchases");
  } else {
    console.log(`  - Missing ${monetizationKeys.length} monetization key(s)`);
    monetizationKeys.forEach((key) => console.log(`    • ${key}`));
  }
}

if (pushKeys.length > 0) {
  console.log("\n📱 PUSH NOTIFICATIONS:");
  console.log(`  - Missing ${pushKeys.length} Firebase key(s)`);
  console.log("  - Push notifications will not work");
}

if (monitoringKeys.length > 0) {
  console.log("\n📈 MONITORING:");
  console.log("  - Sentry not configured");
  console.log("  - No crash reporting in production");
}

// Final status
console.log("\n" + "=".repeat(60));
if (hasErrors) {
  console.log("\n❌ SUBMISSION BLOCKED: Critical issues must be fixed!");
  console.log("\nNext steps:");
  console.log("1. Add missing critical environment variables to .env.production");
  console.log("2. Ensure all required files exist");
  console.log("3. Run this script again to verify");
  process.exit(1);
} else if (hasWarnings) {
  console.log("\n⚠️  READY WITH WARNINGS: App can be submitted but some features may not work");
  console.log("\nConsider:");
  console.log("1. Setting up Firebase for push notifications");
  console.log("2. Configuring Sentry for error tracking");
  console.log("3. Completing AdMob setup for ad revenue");
} else {
  console.log("\n✅ ALL SYSTEMS GO! App is ready for store submission! 🚀");
  console.log("\nNext steps:");
  console.log("1. Run: eas build --platform all --profile production");
  console.log("2. Test builds on real devices");
  console.log("3. Submit to App Store Connect and Google Play Console");
}

// Checklist
console.log("\n📋 PRE-SUBMISSION CHECKLIST:");
console.log("  □ Remove all console.log statements (Run: node scripts/prepare-for-store.js)");
console.log("  □ Test user registration and login");
console.log("  □ Test in-app purchases (sandbox)");
console.log("  □ Test ads display correctly");
console.log("  □ Test push notifications");
console.log("  □ Test on minimum iOS version (13.4)");
console.log("  □ Test on minimum Android version (API 23)");
console.log("  □ Prepare 3-10 screenshots per device type");
console.log("  □ Write compelling app description");
console.log("  □ Set age rating (17+ for user content)");
console.log("  □ Configure in-app products in store consoles");
console.log("  □ Upload privacy policy to website");
console.log("  □ Test offline functionality");

console.log(
  '\n💡 TIP: Run "eas build --platform ios --profile production --local" for faster local builds during testing',
);
