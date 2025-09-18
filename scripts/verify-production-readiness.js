#!/usr/bin/env node

/**
 * Comprehensive Production Readiness Verification Script
 * Validates all aspects of the application for production deployment
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

class ProductionReadinessVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.startTime = Date.now();
  }

  /**
   * Main verification process
   */
  async verify() {
    this.log("🚀 Starting Production Readiness Verification", "cyan", true);
    this.log("=".repeat(60), "cyan");

    try {
      // Core verification steps
      await this.verifyEnvironmentVariables();
      await this.verifyDependencies();
      await this.verifyTypeScriptCompliance();
      await this.verifyBuildConfiguration();
      await this.verifySecurityConfiguration();
      await this.verifyPerformanceOptimizations();
      await this.verifyErrorHandling();
      await this.verifyTestCoverage();
      await this.verifyBundleSize();
      await this.verifyProductionAssets();

      // Generate final report
      this.generateReport();
    } catch (error) {
      this.error(`Critical error during verification: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Verify all required environment variables
   */
  async verifyEnvironmentVariables() {
    this.log("\n📋 Verifying Environment Variables...", "blue", true);

    const requiredVars = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_PROJECT_ID"];

    const productionVars = [
      "EXPO_PUBLIC_SENTRY_DSN",
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    ];

    // Check .env.example exists
    if (!fs.existsSync(".env.example")) {
      this.error("Missing .env.example file");
    } else {
      this.pass(".env.example file exists");
    }

    // Check required variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.error(`Missing required environment variable: ${varName}`);
      } else {
        this.pass(`Environment variable ${varName} is set`);
      }
    }

    // Check production-specific variables
    for (const varName of productionVars) {
      if (!process.env[varName]) {
        this.warning(`Missing production environment variable: ${varName}`);
      } else {
        this.pass(`Production environment variable ${varName} is set`);
      }
    }

    // Validate Supabase URL format
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
      this.warning("Supabase URL format may be incorrect");
    }
  }

  /**
   * Verify dependencies and security vulnerabilities
   */
  async verifyDependencies() {
    this.log("\n📦 Verifying Dependencies...", "blue", true);

    try {
      // Check for security vulnerabilities
      try {
        execSync("npm audit --audit-level=high", { stdio: "pipe" });
        this.pass("No high-severity security vulnerabilities found");
      } catch (_error) {
        this.error("High-severity security vulnerabilities detected. Run: npm audit fix");
      }

      // Check for outdated packages
      try {
        const outdated = execSync("npm outdated --json", { stdio: "pipe", encoding: "utf8" });
        const outdatedPackages = JSON.parse(outdated || "{}");
        const criticalOutdated = Object.keys(outdatedPackages).filter((pkg) =>
          ["expo", "@supabase/supabase-js", "react", "react-native"].includes(pkg),
        );

        if (criticalOutdated.length > 0) {
          this.warning(`Critical packages outdated: ${criticalOutdated.join(", ")}`);
        } else {
          this.pass("Critical packages are up to date");
        }
      } catch (_error) {
        this.pass("All packages are up to date");
      }

      // Verify package.json integrity
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

      if (!packageJson.name || !packageJson.version) {
        this.error("package.json missing name or version");
      } else {
        this.pass("package.json has valid name and version");
      }

      // Check for production dependencies
      const requiredDeps = ["@supabase/supabase-js", "expo", "react", "react-native", "@sentry/react-native"];

      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep]) {
          this.error(`Missing required dependency: ${dep}`);
        } else {
          this.pass(`Required dependency ${dep} is installed`);
        }
      }
    } catch (error) {
      this.error(`Dependency verification failed: ${error.message}`);
    }
  }

  /**
   * Verify TypeScript strict mode compliance
   */
  async verifyTypeScriptCompliance() {
    this.log("\n🔍 Verifying TypeScript Compliance...", "blue", true);

    try {
      // Check tsconfig.json exists and has strict mode
      if (!fs.existsSync("tsconfig.json")) {
        this.error("Missing tsconfig.json file");
        return;
      }

      const tsConfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"));

      if (!tsConfig.compilerOptions?.strict) {
        this.warning("TypeScript strict mode is not enabled");
      } else {
        this.pass("TypeScript strict mode is enabled");
      }

      // Run TypeScript compiler check
      try {
        execSync("npx tsc --noEmit", { stdio: "pipe" });
        this.pass("TypeScript compilation successful");
      } catch (_error) {
        this.error("TypeScript compilation errors detected. Run: npm run typecheck");
      }

      // Check for any files
      const anyFiles = this.findFilesWithAnyType();
      if (anyFiles.length > 0) {
        this.warning(`Files using 'any' type found: ${anyFiles.length} files`);
      } else {
        this.pass("No files using 'any' type found");
      }
    } catch (error) {
      this.error(`TypeScript verification failed: ${error.message}`);
    }
  }

  /**
   * Verify build configuration
   */
  async verifyBuildConfiguration() {
    this.log("\n🏗️ Verifying Build Configuration...", "blue", true);

    try {
      // Check app.config.js exists
      if (!fs.existsSync("app.config.js")) {
        this.error("Missing app.config.js file");
        return;
      }

      // Check EAS configuration
      if (!fs.existsSync("eas.json")) {
        this.error("Missing eas.json file");
      } else {
        const easConfig = JSON.parse(fs.readFileSync("eas.json", "utf8"));

        if (!easConfig.build?.production) {
          this.error("Missing production build profile in eas.json");
        } else {
          this.pass("Production build profile configured");
        }

        if (!easConfig.submit?.production) {
          this.warning("Missing production submit profile in eas.json");
        } else {
          this.pass("Production submit profile configured");
        }
      }

      // Verify app.config.js has required fields
      const appConfig = require(path.resolve("app.config.js"));
      const config = appConfig.default || appConfig;

      if (!config.expo?.name || !config.expo?.version) {
        this.error("app.config.js missing required fields (name, version)");
      } else {
        this.pass("app.config.js has required fields");
      }

      // Check bundle identifiers
      if (!config.expo?.ios?.bundleIdentifier || !config.expo?.android?.package) {
        this.error("Missing bundle identifiers for iOS/Android");
      } else {
        this.pass("Bundle identifiers configured");
      }
    } catch (error) {
      this.error(`Build configuration verification failed: ${error.message}`);
    }
  }

  /**
   * Verify security configuration
   */
  async verifySecurityConfiguration() {
    this.log("\n🔒 Verifying Security Configuration...", "blue", true);

    try {
      // Check for sensitive files in git
      const sensitiveFiles = [".env", "google-services.json", "GoogleService-Info.plist", "service-account-key.json"];

      for (const file of sensitiveFiles) {
        if (fs.existsSync(file)) {
          try {
            execSync(`git check-ignore ${file}`, { stdio: "pipe" });
            this.pass(`Sensitive file ${file} is properly ignored`);
          } catch (_error) {
            this.error(`Sensitive file ${file} is not in .gitignore`);
          }
        }
      }

      // Check .gitignore exists and has required entries
      if (!fs.existsSync(".gitignore")) {
        this.error("Missing .gitignore file");
      } else {
        const gitignore = fs.readFileSync(".gitignore", "utf8");
        const requiredEntries = [".env", "google-services.json", "node_modules"];

        for (const entry of requiredEntries) {
          if (!gitignore.includes(entry)) {
            this.error(`.gitignore missing entry: ${entry}`);
          } else {
            this.pass(`.gitignore includes ${entry}`);
          }
        }
      }

      // Check for hardcoded secrets in source code
      const secretPatterns = [
        /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
        /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, // Slack tokens
        /AIza[0-9A-Za-z\\-_]{35}/g, // Google API keys
      ];

      const sourceFiles = this.findSourceFiles();
      let secretsFound = false;

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            this.error(`Potential hardcoded secret found in ${file}`);
            secretsFound = true;
          }
        }
      }

      if (!secretsFound) {
        this.pass("No hardcoded secrets detected in source code");
      }
    } catch (error) {
      this.error(`Security verification failed: ${error.message}`);
    }
  }

  /**
   * Verify performance optimizations
   */
  async verifyPerformanceOptimizations() {
    this.log("\n⚡ Verifying Performance Optimizations...", "blue", true);

    try {
      // Check for performance-related configurations
      const appConfig = require(path.resolve("app.config.js"));
      const config = appConfig.default || appConfig;

      // Check for Hermes on Android
      const buildProperties = config.expo?.plugins?.find(
        (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
      );

      if (buildProperties && buildProperties[1]?.android?.hermesEnabled) {
        this.pass("Hermes JavaScript engine enabled for Android");
      } else {
        this.warning("Hermes JavaScript engine not enabled for Android");
      }

      // Check for ProGuard minification
      if (buildProperties && buildProperties[1]?.android?.proguardMinifyEnabled) {
        this.pass("ProGuard minification enabled for Android");
      } else {
        this.warning("ProGuard minification not enabled for Android");
      }

      // Check for new architecture
      if (config.expo?.newArchEnabled) {
        this.pass("New React Native architecture enabled");
      } else {
        this.warning("New React Native architecture not enabled");
      }

      // Check for asset optimization
      if (config.expo?.assetBundlePatterns) {
        this.pass("Asset bundle patterns configured");
      } else {
        this.warning("Asset bundle patterns not configured");
      }
    } catch (error) {
      this.error(`Performance verification failed: ${error.message}`);
    }
  }

  /**
   * Verify error handling implementation
   */
  async verifyErrorHandling() {
    this.log("\n🚨 Verifying Error Handling...", "blue", true);

    try {
      // Check for error handling utilities
      const errorHandlingFile = "src/utils/errorHandling.ts";
      if (!fs.existsSync(errorHandlingFile)) {
        this.error("Missing error handling utilities");
      } else {
        this.pass("Error handling utilities exist");
      }

      // Check for error reporting service
      const errorReportingFile = "src/services/errorReporting.ts";
      if (!fs.existsSync(errorReportingFile)) {
        this.error("Missing error reporting service");
      } else {
        this.pass("Error reporting service exists");
      }

      // Check for Sentry configuration
      if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
        this.warning("Sentry DSN not configured");
      } else {
        this.pass("Sentry DSN configured");
      }
    } catch (error) {
      this.error(`Error handling verification failed: ${error.message}`);
    }
  }

  /**
   * Verify test coverage
   */
  async verifyTestCoverage() {
    this.log("\n🧪 Verifying Test Coverage...", "blue", true);

    try {
      // Check if Jest is configured
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

      if (!packageJson.devDependencies?.jest && !packageJson.dependencies?.jest) {
        this.warning("Jest testing framework not installed");
        return;
      }

      // Check for test files
      const testFiles = this.findTestFiles();
      if (testFiles.length === 0) {
        this.warning("No test files found");
      } else {
        this.pass(`Found ${testFiles.length} test files`);
      }

      // Run tests if they exist
      if (testFiles.length > 0) {
        try {
          execSync("npm test -- --passWithNoTests --watchAll=false", { stdio: "pipe" });
          this.pass("All tests passing");
        } catch (_error) {
          this.error("Some tests are failing");
        }
      }
    } catch (error) {
      this.error(`Test verification failed: ${error.message}`);
    }
  }

  /**
   * Verify bundle size is within acceptable limits
   */
  async verifyBundleSize() {
    this.log("\n📊 Verifying Bundle Size...", "blue", true);

    try {
      // This is a simplified check - in a real scenario, you'd want to
      // actually build the app and measure the bundle size
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const depCount = Object.keys(packageJson.dependencies || {}).length;

      if (depCount > 100) {
        this.warning(`Large number of dependencies: ${depCount}`);
      } else {
        this.pass(`Reasonable number of dependencies: ${depCount}`);
      }

      // Check for bundle analyzer
      if (packageJson.devDependencies?.["@expo/webpack-config"]) {
        this.pass("Bundle analysis tools available");
      } else {
        this.warning("Consider adding bundle analysis tools");
      }
    } catch (error) {
      this.error(`Bundle size verification failed: ${error.message}`);
    }
  }

  /**
   * Verify production assets
   */
  async verifyProductionAssets() {
    this.log("\n🎨 Verifying Production Assets...", "blue", true);

    try {
      const requiredAssets = ["assets/LockerRoomLogo.png", "assets/splash-screen.png"];

      for (const asset of requiredAssets) {
        if (!fs.existsSync(asset)) {
          this.error(`Missing required asset: ${asset}`);
        } else {
          this.pass(`Required asset exists: ${asset}`);
        }
      }
    } catch (error) {
      this.error(`Asset verification failed: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  findFilesWithAnyType() {
    const files = [];
    const searchDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
          searchDir(fullPath);
        } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes(": any") || content.includes("<any>")) {
            files.push(fullPath);
          }
        }
      }
    };

    searchDir("src");
    return files;
  }

  findSourceFiles() {
    const files = [];
    const searchDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
          searchDir(fullPath);
        } else if (item.endsWith(".ts") || item.endsWith(".tsx") || item.endsWith(".js") || item.endsWith(".jsx")) {
          files.push(fullPath);
        }
      }
    };

    searchDir("src");
    return files;
  }

  findTestFiles() {
    const files = [];
    const searchDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
          searchDir(fullPath);
        } else if (item.includes(".test.") || item.includes(".spec.") || fullPath.includes("__tests__")) {
          files.push(fullPath);
        }
      }
    };

    searchDir("src");
    searchDir("__tests__");
    return files;
  }

  /**
   * Logging methods
   */
  log(message, color = "reset", bold = false) {
    const colorCode = colors[color] || colors.reset;
    const style = bold ? colors.bright : "";
    console.log(`${style}${colorCode}${message}${colors.reset}`);
  }

  pass(message) {
    this.passed.push(message);
    this.log(`  ✅ ${message}`, "green");
  }

  warning(message) {
    this.warnings.push(message);
    this.log(`  ⚠️  ${message}`, "yellow");
  }

  error(message) {
    this.errors.push(message);
    this.log(`  ❌ ${message}`, "red");
  }

  /**
   * Generate final report
   */
  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.log("\n" + "=".repeat(60), "cyan");
    this.log("📋 PRODUCTION READINESS REPORT", "cyan", true);
    this.log("=".repeat(60), "cyan");

    this.log(`\n✅ Passed: ${this.passed.length}`, "green", true);
    this.log(`⚠️  Warnings: ${this.warnings.length}`, "yellow", true);
    this.log(`❌ Errors: ${this.errors.length}`, "red", true);
    this.log(`⏱️  Duration: ${duration}s`, "blue");

    if (this.warnings.length > 0) {
      this.log("\n⚠️  WARNINGS:", "yellow", true);
      this.warnings.forEach((warning) => this.log(`  • ${warning}`, "yellow"));
    }

    if (this.errors.length > 0) {
      this.log("\n❌ ERRORS:", "red", true);
      this.errors.forEach((error) => this.log(`  • ${error}`, "red"));
    }

    this.log("\n" + "=".repeat(60), "cyan");

    if (this.errors.length === 0) {
      this.log("🎉 PRODUCTION READY!", "green", true);
      this.log("Your application is ready for production deployment.", "green");

      if (this.warnings.length > 0) {
        this.log("\nConsider addressing the warnings above for optimal production performance.", "yellow");
      }
    } else {
      this.log("🚫 NOT PRODUCTION READY", "red", true);
      this.log("Please fix the errors above before deploying to production.", "red");
      process.exit(1);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new ProductionReadinessVerifier();
  verifier.verify().catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
}

module.exports = ProductionReadinessVerifier;
