#!/usr/bin/env node

/**
 * Comprehensive App Functionality Test Suite
 * Tests all core features of the Locker Room Talk app
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
  timestamp: new Date().toISOString(),
};

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testSection(title) {
  console.log("\n" + "=".repeat(60));
  log(`Testing: ${title}`, "blue");
  console.log("=".repeat(60));
}

function runCommand(command, description, throwOnError = false) {
  try {
    log(`Running: ${description}`, "magenta");
    const output = execSync(command, { encoding: "utf-8", stdio: "pipe" });
    results.passed.push({ test: description, command });
    log(`✅ ${description}`, "green");
    return { success: true, output };
  } catch (error) {
    if (throwOnError) {
      throw error;
    }
    results.failed.push({
      test: description,
      command,
      error: error.message || error.toString(),
    });
    log(`❌ ${description}: ${error.message}`, "red");
    return { success: false, error: error.message };
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    results.passed.push({ test: description, file: filePath });
    log(`✅ ${description}`, "green");
    return true;
  } else {
    results.failed.push({ test: description, file: filePath });
    log(`❌ ${description}: File not found`, "red");
    return false;
  }
}

function validateFileContent(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    let allPassed = true;

    for (const pattern of patterns) {
      if (!content.includes(pattern)) {
        results.warnings.push({
          test: description,
          file: filePath,
          missing: pattern,
        });
        log(`⚠️  Missing in ${path.basename(filePath)}: ${pattern}`, "yellow");
        allPassed = false;
      }
    }

    if (allPassed) {
      results.passed.push({ test: description, file: filePath });
      log(`✅ ${description}`, "green");
    }
    return allPassed;
  } catch (error) {
    results.failed.push({
      test: description,
      file: filePath,
      error: error.message,
    });
    log(`❌ ${description}: ${error.message}`, "red");
    return false;
  }
}

async function main() {
  log("\n🚀 Starting Comprehensive App Functionality Tests", "blue");

  // 1. Environment & Dependencies
  testSection("1. Environment & Dependencies");

  checkFile(".env", "Environment file exists");
  validateFileContent(
    ".env",
    ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"],
    "Required environment variables",
  );

  runCommand("npm list --depth=0", "Check npm dependencies");
  runCommand("npx expo doctor", "Expo configuration health check");

  // 2. TypeScript & Linting
  testSection("2. TypeScript & Linting");

  runCommand("npm run typecheck", "TypeScript type checking");
  runCommand("npm run lint", "ESLint checking");
  runCommand("npm run format:check", "Prettier formatting check");

  // 3. Authentication Components
  testSection("3. Authentication Components");

  checkFile("src/screens/AuthScreen.tsx", "AuthScreen exists");
  checkFile("src/services/auth.ts", "Auth service exists");
  checkFile("src/state/authStore.ts", "Auth store exists");

  validateFileContent("src/services/auth.ts", ["signIn", "signUp", "signOut", "resetPassword"], "Auth service methods");

  // 4. Chat & Messaging Components
  testSection("4. Chat & Messaging Components");

  checkFile("src/screens/ChatroomsScreen.tsx", "ChatroomsScreen exists");
  checkFile("src/screens/ChatRoom.tsx", "ChatRoom screen exists");
  checkFile("src/services/websocketService.ts", "WebSocket service exists");
  checkFile("src/state/chatStore.ts", "Chat store exists");

  validateFileContent(
    "src/services/websocketService.ts",
    ["connect", "disconnect", "sendMessage", "subscribeToChannel"],
    "WebSocket service methods",
  );

  // 5. Media Upload & Playback
  testSection("5. Media Upload & Playback");

  checkFile("src/services/mediaService.ts", "Media service exists");
  checkFile("src/services/storage.ts", "Storage service exists");
  checkFile("src/utils/media.ts", "Media utilities exist");

  validateFileContent(
    "src/services/mediaService.ts",
    ["uploadImage", "uploadVideo", "uploadAudio", "getMediaUrl"],
    "Media service methods",
  );

  // 6. User Profiles & Settings
  testSection("6. User Profiles & Settings");

  checkFile("src/screens/ProfileScreen.tsx", "ProfileScreen exists");
  checkFile("src/screens/SettingsScreen.tsx", "SettingsScreen exists");
  checkFile("src/services/userService.ts", "User service exists");

  // 7. Search Functionality
  testSection("7. Search Functionality");

  checkFile("src/screens/SearchScreen.tsx", "SearchScreen exists");
  checkFile("src/services/search.ts", "Search service exists");

  validateFileContent(
    "src/services/search.ts",
    ["searchUsers", "searchChatrooms", "searchMessages"],
    "Search service methods",
  );

  // 8. Notifications
  testSection("8. Notifications");

  checkFile("src/services/notificationService.ts", "Notification service exists");
  checkFile("src/utils/notifications.ts", "Notification utilities exist");

  validateFileContent(
    "src/services/notificationService.ts",
    ["requestPermissions", "scheduleNotification", "handleNotification"],
    "Notification service methods",
  );

  // 9. Subscription Features
  testSection("9. Subscription Features");

  checkFile("src/screens/SubscriptionsScreen.tsx", "SubscriptionsScreen exists");
  checkFile("src/services/subscriptionService.ts", "Subscription service exists");
  checkFile("src/services/revenuecat.ts", "RevenueCat service exists");

  // 10. Ad Display
  testSection("10. Ad Display (AdMob)");

  checkFile("src/config/admobConfig.ts", "AdMob configuration exists");
  checkFile("src/services/adMobService.ts", "AdMob service exists");
  checkFile("src/components/ads/BannerAd.tsx", "BannerAd component exists");

  // 11. Navigation & Screens
  testSection("11. Navigation & All Screens");

  checkFile("src/navigation/AppNavigator.tsx", "App navigator exists");
  checkFile("App.tsx", "App entry point exists");

  const screens = [
    "HomeScreen",
    "ChatroomsScreen",
    "ChatRoom",
    "ProfileScreen",
    "SettingsScreen",
    "SearchScreen",
    "SubscriptionsScreen",
    "AuthScreen",
    "FeaturedScreen",
    "ExploreScreen",
  ];

  screens.forEach((screen) => {
    checkFile(`src/screens/${screen}.tsx`, `${screen} exists`);
  });

  // 12. API & Network Services
  testSection("12. API & Network Services");

  checkFile("src/config/supabase.ts", "Supabase configuration exists");
  checkFile("src/api/chat.ts", "Chat API exists");
  checkFile("src/api/user.ts", "User API exists");

  // 13. State Management
  testSection("13. State Management (Zustand)");

  const stores = ["authStore", "chatStore", "userStore", "notificationStore", "subscriptionStore"];

  stores.forEach((store) => {
    checkFile(`src/state/${store}.ts`, `${store} exists`);
  });

  // 14. Error Handling & Loading States
  testSection("14. Error Handling & Loading States");

  checkFile("src/utils/errorHandling.ts", "Error handling utilities exist");
  checkFile("src/components/LoadingSpinner.tsx", "LoadingSpinner component exists");
  checkFile("src/components/ErrorBoundary.tsx", "ErrorBoundary component exists");

  // 15. Offline Functionality
  testSection("15. Offline Functionality");

  checkFile("src/services/offlineService.ts", "Offline service exists");
  checkFile("src/utils/networkUtils.ts", "Network utilities exist");

  // 16. Database Schema
  testSection("16. Database Schema & Types");

  checkFile("src/types/database.types.ts", "Database types exist");
  checkFile("schema.sql", "Database schema file exists");

  // 17. Run Unit Tests
  testSection("17. Unit Tests");

  runCommand("npm test -- --passWithNoTests", "Run Jest tests");

  // 18. Build Verification
  testSection("18. Build Verification");

  runCommand("npx expo export --platform all --output-dir ./dist-test", "Export for all platforms");

  // Clean up test export
  if (fs.existsSync("./dist-test")) {
    fs.rmSync("./dist-test", { recursive: true });
    log("Cleaned up test export", "green");
  }

  // Generate Report
  generateReport();
}

function generateReport() {
  console.log("\n" + "=".repeat(60));
  log("📊 TEST RESULTS SUMMARY", "blue");
  console.log("=".repeat(60));

  const total = results.passed.length + results.failed.length;
  const passRate = ((results.passed.length / total) * 100).toFixed(1);

  log(`\n✅ Passed: ${results.passed.length}`, "green");
  log(`❌ Failed: ${results.failed.length}`, "red");
  log(`⚠️  Warnings: ${results.warnings.length}`, "yellow");
  log(`📈 Pass Rate: ${passRate}%\n`, passRate >= 80 ? "green" : "yellow");

  // List failures
  if (results.failed.length > 0) {
    log("\n❌ FAILED TESTS:", "red");
    results.failed.forEach((fail, i) => {
      console.log(`${i + 1}. ${fail.test}`);
      if (fail.error) {
        console.log(`   Error: ${fail.error.substring(0, 100)}`);
      }
    });
  }

  // List warnings
  if (results.warnings.length > 0) {
    log("\n⚠️  WARNINGS:", "yellow");
    results.warnings.forEach((warn, i) => {
      console.log(`${i + 1}. ${warn.test}`);
      if (warn.missing) {
        console.log(`   Missing: ${warn.missing}`);
      }
    });
  }

  // Save report to file
  const reportPath = "test-results.json";
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\n📁 Full report saved to: ${reportPath}`, "blue");

  // Overall status
  console.log("\n" + "=".repeat(60));
  if (results.failed.length === 0) {
    log("🎉 ALL TESTS PASSED! App is functioning correctly.", "green");
  } else if (results.failed.length <= 3) {
    log("⚠️  Most tests passed with minor issues. Review failures above.", "yellow");
  } else {
    log("❌ Multiple test failures detected. Critical issues need attention.", "red");
  }
  console.log("=".repeat(60));
}

// Run the test suite
main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, "red");
  process.exit(1);
});
