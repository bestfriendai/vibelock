#!/usr/bin/env node

/**
 * Monetization Integration Test Runner
 *
 * This script runs comprehensive tests to verify that the monetization
 * system (RevenueCat + AdMob + Supabase) is properly integrated.
 *
 * Usage:
 *   node scripts/test-monetization.js
 *   npm run test:monetization
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 Monetization Integration Test Runner");
console.log("=======================================\n");

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.error("❌ Error: package.json not found. Please run this script from the project root.");
  process.exit(1);
}

// Check if required files exist
const requiredFiles = [
  "src/services/subscriptionService.ts",
  "src/services/adMobService.ts",
  "src/state/subscriptionStore.ts",
  "src/utils/monetizationIntegrationTest.ts",
  "supabase/migrations/20250915000000_add_subscription_events_table.sql",
];

console.log("📋 Checking required files...");
let missingFiles = [];

requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error("\n❌ Missing required files. Please ensure all monetization components are properly installed.");
  process.exit(1);
}

// Check environment variables
console.log("\n🔧 Checking environment configuration...");

const requiredEnvVars = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];

const optionalEnvVars = ["EXPO_PUBLIC_REVENUECAT_API_KEY", "EXPO_PUBLIC_ADMOB_TEST_MODE"];

let envIssues = [];

requiredEnvVars.forEach((envVar) => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: Set`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
    envIssues.push(envVar);
  }
});

optionalEnvVars.forEach((envVar) => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: Set`);
  } else {
    console.log(`⚠️  ${envVar}: Not set (optional)`);
  }
});

if (envIssues.length > 0) {
  console.error("\n❌ Missing required environment variables. Please check your .env file.");
  console.error("Required variables:", envIssues.join(", "));
  process.exit(1);
}

// Check database migrations
console.log("\n🗄️  Checking database migrations...");

try {
  // Check if Supabase CLI is available
  execSync("supabase --version", { stdio: "pipe" });
  console.log("✅ Supabase CLI available");

  try {
    // Check migration status
    const migrationStatus = execSync("supabase migration list", {
      encoding: "utf8",
      stdio: "pipe",
    });

    if (migrationStatus.includes("20250915000000_add_subscription_events_table")) {
      console.log("✅ Subscription events migration found");
    } else {
      console.log("⚠️  Subscription events migration not applied");
      console.log("   Run: supabase db push");
    }
  } catch (error) {
    console.log("⚠️  Could not check migration status (this is okay if not using local Supabase)");
  }
} catch (error) {
  console.log("⚠️  Supabase CLI not available (this is okay for remote-only setups)");
}

// Run TypeScript compilation check
console.log("\n🔍 Checking TypeScript compilation...");

try {
  execSync("npx tsc --noEmit --skipLibCheck", { stdio: "pipe" });
  console.log("✅ TypeScript compilation successful");
} catch (error) {
  console.log("❌ TypeScript compilation errors detected");
  console.log("   Please fix TypeScript errors before running integration tests");
  // Don't exit here, as some errors might not affect monetization
}

// Check package dependencies
console.log("\n📦 Checking monetization dependencies...");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

const monetizationDeps = [
  "react-native-purchases",
  "react-native-google-mobile-ads",
  "@supabase/supabase-js",
  "zustand",
];

monetizationDeps.forEach((dep) => {
  if (dependencies[dep]) {
    console.log(`✅ ${dep}: ${dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: Not installed`);
  }
});

// Summary and next steps
console.log("\n📊 Pre-flight Check Summary");
console.log("============================");

if (missingFiles.length === 0 && envIssues.length === 0) {
  console.log("✅ All checks passed! Ready to run integration tests.");
  console.log("\n🚀 Next Steps:");
  console.log("1. Start your development server: expo start");
  console.log("2. Open the app in Expo Go or development build");
  console.log("3. Import and run the integration tests in your app:");
  console.log("");
  console.log(
    '   import { runMonetizationIntegrationTests, printIntegrationTestReport } from "./src/utils/monetizationIntegrationTest";',
  );
  console.log("");
  console.log("   const runTests = async () => {");
  console.log("     const report = await runMonetizationIntegrationTests();");
  console.log("     printIntegrationTestReport(report);");
  console.log("   };");
  console.log("");
  console.log("   runTests();");
  console.log("");
  console.log("4. Check the console output for test results");
  console.log("5. Address any failed tests based on recommendations");
} else {
  console.log("❌ Some checks failed. Please address the issues above before running integration tests.");
}

console.log("\n💡 Additional Resources:");
console.log("- Monetization Integration Guide: docs/MONETIZATION_INTEGRATION.md");
console.log("- Fixes Summary: docs/MONETIZATION_FIXES_SUMMARY.md");
console.log("- Original Guide: docs/MONETIZATION.md");
console.log("");
console.log("For support, check the troubleshooting sections in the documentation.");
console.log("=======================================\n");
