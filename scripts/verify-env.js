/* eslint-disable expo/no-dynamic-env-var */
// Enhanced Environment Validation Script
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ANSI Color codes for better output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Environment variable classifications
const CRITICAL_VARIABLES = {
  EXPO_PUBLIC_SUPABASE_URL: {
    description: "Supabase project URL",
    format: /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
    setupGuide: "Get from Supabase Dashboard > Settings > API > Project URL",
    example: "https://your-project.supabase.co",
  },
  EXPO_PUBLIC_SUPABASE_ANON_KEY: {
    description: "Supabase anonymous key",
    format: /^(sb_publishable_|sb_secret_|eyJ)/,
    setupGuide: "Get from Supabase Dashboard > Settings > API > Project API keys",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
  EXPO_PUBLIC_PROJECT_ID: {
    description: "Expo project ID",
    format: /^[a-f0-9-]{36}$/,
    setupGuide: "Get from Expo Dashboard > Your Project > Project ID",
    example: "12345678-1234-1234-1234-123456789012",
  },
};

const IMPORTANT_VARIABLES = {
  EXPO_PUBLIC_REVENUECAT_API_KEY: {
    description: "RevenueCat API key for monetization",
    format: /^[a-zA-Z0-9_-]+$/,
    setupGuide: "Get from RevenueCat Dashboard > Your App > API Keys",
    example: "pub_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
  },
  EXPO_PUBLIC_SENTRY_DSN: {
    description: "Sentry DSN for error reporting",
    format: /^https:\/\/[a-f0-9]+@[a-z0-9]+\.ingest\.sentry\.io\/[0-9]+$/,
    setupGuide: "Get from Sentry Dashboard > Settings > Projects > Your Project > Client Keys",
    example: "https://abc123@def456.ingest.sentry.io/123456",
  },
};

const OPTIONAL_VARIABLES = {
  EXPO_PUBLIC_ADMOB_BANNER_ANDROID: {
    description: "AdMob Android banner ad unit ID",
    format: /^ca-app-pub-[0-9]+\/[0-9]+$/,
    setupGuide: "Get from AdMob Console > Apps > Your App > Ad units",
    example: "ca-app-pub-1234567890123456/1234567890",
  },
  EXPO_PUBLIC_ADMOB_BANNER_IOS: {
    description: "AdMob iOS banner ad unit ID",
    format: /^ca-app-pub-[0-9]+\/[0-9]+$/,
    setupGuide: "Get from AdMob Console > Apps > Your App > Ad units",
    example: "ca-app-pub-1234567890123456/0987654321",
  },
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: {
    description: "Firebase project ID (legacy support)",
    format: /^[a-z0-9-]+$/,
    setupGuide: "Get from Firebase Console > Project Settings > General > Project ID",
    example: "your-project-id",
  },
};

// Development vs Production environment detection
const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

console.log(`${colors.cyan}🔍 Environment Validation Script${colors.reset}`);
console.log(`${colors.blue}Environment: ${isDevelopment ? "Development" : "Production"}${colors.reset}`);
console.log("=" * 60);

// Check if .env.example exists
const exampleEnvPath = path.resolve(process.cwd(), ".env.example");
if (!fs.existsSync(exampleEnvPath)) {
  console.error(`${colors.red}🛑 FATAL: .env.example file not found. Cannot verify environment.${colors.reset}`);
  process.exit(1);
}

// Validation results tracking
const results = {
  critical: { passed: 0, total: 0, failed: [] },
  important: { passed: 0, total: 0, failed: [] },
  optional: { passed: 0, total: 0, failed: [] },
  warnings: [],
  errors: [],
};

// Validation functions
const validateVariable = (key, config, category) => {
  const value = process.env[key];
  const result = { key, category, status: "missing", value, config };

  results[category].total++;

  if (!value) {
    result.status = "missing";
    results[category].failed.push(result);
    return result;
  }

  if (config.format && !config.format.test(value)) {
    result.status = "invalid_format";
    results[category].failed.push(result);
    return result;
  }

  result.status = "valid";
  results[category].passed++;
  return result;
};

const printValidationResult = (result) => {
  const { key, status, config, category } = result;
  const prefix = category === "critical" ? "🔴" : category === "important" ? "🟡" : "🔵";

  switch (status) {
    case "valid":
      console.log(`  ${colors.green}✅ ${key}${colors.reset} - ${config.description}`);
      break;
    case "missing":
      console.log(`  ${prefix} ${colors.red}❌ ${key}${colors.reset} - ${config.description}`);
      console.log(`    ${colors.yellow}Setup: ${config.setupGuide}${colors.reset}`);
      console.log(`    ${colors.blue}Example: ${config.example}${colors.reset}`);
      break;
    case "invalid_format":
      console.log(`  ${prefix} ${colors.red}❌ ${key}${colors.reset} - Invalid format`);
      console.log(`    ${colors.yellow}Setup: ${config.setupGuide}${colors.reset}`);
      console.log(`    ${colors.blue}Example: ${config.example}${colors.reset}`);
      break;
  }
};

const validateServiceDependencies = () => {
  console.log(`\n${colors.magenta}🔗 Service Dependency Validation${colors.reset}`);

  // RevenueCat validation
  const revenueCatKeys = [
    "EXPO_PUBLIC_REVENUECAT_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  ].filter((key) => process.env[key]);

  if (revenueCatKeys.length > 0 && revenueCatKeys.length < 3) {
    results.warnings.push("RevenueCat partially configured - consider adding all platform keys");
  }

  // AdMob validation
  const adMobKeys = [
    "EXPO_PUBLIC_ADMOB_BANNER_ANDROID",
    "EXPO_PUBLIC_ADMOB_BANNER_IOS",
    "EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID",
    "EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS",
  ].filter((key) => process.env[key]);

  if (adMobKeys.length > 0 && adMobKeys.length < 4) {
    results.warnings.push("AdMob partially configured - consider adding all ad unit types");
  }

  // Sentry validation
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;

  if (sentryDsn && (!sentryOrg || !sentryProject)) {
    results.warnings.push("Sentry DSN configured but missing org/project for source maps");
  }
};

const calculateCompletenessScore = () => {
  const totalCritical = results.critical.total;
  const passedCritical = results.critical.passed;
  const totalImportant = results.important.total;
  const passedImportant = results.important.passed;
  const totalOptional = results.optional.total;
  const passedOptional = results.optional.passed;

  // Weight: Critical (70%), Important (20%), Optional (10%)
  const criticalScore = totalCritical > 0 ? (passedCritical / totalCritical) * 70 : 70;
  const importantScore = totalImportant > 0 ? (passedImportant / totalImportant) * 20 : 20;
  const optionalScore = totalOptional > 0 ? (passedOptional / totalOptional) * 10 : 10;

  return Math.round(criticalScore + importantScore + optionalScore);
};

const printSetupGuidance = () => {
  console.log(`\n${colors.cyan}📋 Setup Guidance${colors.reset}`);
  console.log("=" * 50);

  const allFailed = [...results.critical.failed, ...results.important.failed, ...results.optional.failed];

  if (allFailed.length === 0) {
    console.log(`${colors.green}🎉 All configured variables are valid!${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}Steps to complete your setup:${colors.reset}\n`);

  allFailed.forEach((result, index) => {
    console.log(`${colors.bold}${index + 1}. ${result.key}${colors.reset}`);
    console.log(`   Description: ${result.config.description}`);
    console.log(`   Setup: ${result.config.setupGuide}`);
    console.log(`   Add to .env: ${result.key}=${result.config.example}`);
    console.log("");
  });
};

const printSummary = () => {
  const score = calculateCompletenessScore();
  const scoreColor = score >= 90 ? colors.green : score >= 70 ? colors.yellow : colors.red;

  console.log(`\n${colors.cyan}📊 Validation Summary${colors.reset}`);
  console.log("=" * 50);
  console.log(`${colors.bold}Configuration Completeness: ${scoreColor}${score}%${colors.reset}`);
  console.log(`${colors.green}✅ Critical: ${results.critical.passed}/${results.critical.total}${colors.reset}`);
  console.log(`${colors.yellow}🟡 Important: ${results.important.passed}/${results.important.total}${colors.reset}`);
  console.log(`${colors.blue}🔵 Optional: ${results.optional.passed}/${results.optional.total}${colors.reset}`);

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Warnings:${colors.reset}`);
    results.warnings.forEach((warning) => {
      console.log(`   • ${warning}`);
    });
  }

  // Production readiness check
  if (isProduction) {
    const criticalMissing = results.critical.failed.length;
    const importantMissing = results.important.failed.length;

    if (criticalMissing > 0) {
      console.log(`\n${colors.red}🚨 PRODUCTION ERROR: ${criticalMissing} critical variables missing!${colors.reset}`);
      process.exit(1);
    }

    if (importantMissing > 0) {
      console.log(
        `\n${colors.yellow}⚠️  PRODUCTION WARNING: ${importantMissing} important variables missing${colors.reset}`,
      );
    }
  }
};

// Main validation execution
console.log(`${colors.magenta}🔍 Critical Variables${colors.reset}`);
Object.entries(CRITICAL_VARIABLES).forEach(([key, config]) => {
  const result = validateVariable(key, config, "critical");
  printValidationResult(result);
});

console.log(`\n${colors.yellow}🟡 Important Variables${colors.reset}`);
Object.entries(IMPORTANT_VARIABLES).forEach(([key, config]) => {
  const result = validateVariable(key, config, "important");
  printValidationResult(result);
});

console.log(`\n${colors.blue}🔵 Optional Variables${colors.reset}`);
Object.entries(OPTIONAL_VARIABLES).forEach(([key, config]) => {
  const result = validateVariable(key, config, "optional");
  printValidationResult(result);
});

// Run dependency validation
validateServiceDependencies();

// Print setup guidance
printSetupGuidance();

// Print final summary
printSummary();

// Exit with appropriate code
const criticalFailures = results.critical.failed.length;
if (criticalFailures > 0) {
  console.log(
    `\n${colors.red}🛑 Environment validation failed: ${criticalFailures} critical variables missing${colors.reset}`,
  );
  process.exit(1);
} else {
  console.log(`\n${colors.green}✅ Environment validation passed!${colors.reset}`);
  process.exit(0);
}
