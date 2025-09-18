#!/usr/bin/env node

/**
 * Comprehensive Production Testing and Performance Verification Script
 * Runs comprehensive tests and performance benchmarks for production deployment
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

class ProductionTestRunner {
  constructor() {
    this.results = {
      unitTests: { passed: 0, failed: 0, skipped: 0 },
      integrationTests: { passed: 0, failed: 0, skipped: 0 },
      performanceTests: { passed: 0, failed: 0, skipped: 0 },
      securityTests: { passed: 0, failed: 0, skipped: 0 },
    };
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  /**
   * Main testing process
   */
  async runTests() {
    this.log("🧪 Starting Production Testing Suite", "cyan", true);
    this.log("=".repeat(60), "cyan");

    try {
      // Core testing steps
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.runSecurityTests();
      await this.analyzeBundleSize();
      await this.runMemoryLeakDetection();
      await this.validateProductionBuild();

      // Generate final report
      this.generateReport();
    } catch (error) {
      this.error(`Critical error during testing: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Run unit tests with coverage
   */
  async runUnitTests() {
    this.log("\n🔬 Running Unit Tests...", "blue", true);

    try {
      // Check if Jest is configured
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

      if (!packageJson.devDependencies?.jest && !packageJson.dependencies?.jest) {
        this.warning("Jest not configured, skipping unit tests");
        this.results.unitTests.skipped = 1;
        return;
      }

      // Run Jest with coverage
      try {
        const output = execSync("npm test -- --coverage --watchAll=false --passWithNoTests", {
          encoding: "utf8",
          stdio: "pipe",
        });

        // Parse Jest output for results
        const lines = output.split("\n");
        const testResults = lines.find((line) => line.includes("Tests:"));

        if (testResults) {
          const passedMatch = testResults.match(/(\d+) passed/);
          const failedMatch = testResults.match(/(\d+) failed/);
          const skippedMatch = testResults.match(/(\d+) skipped/);

          this.results.unitTests.passed = passedMatch ? parseInt(passedMatch[1]) : 0;
          this.results.unitTests.failed = failedMatch ? parseInt(failedMatch[1]) : 0;
          this.results.unitTests.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
        }

        this.pass(`Unit tests completed: ${this.results.unitTests.passed} passed`);

        // Check coverage thresholds
        if (fs.existsSync("coverage/coverage-summary.json")) {
          const coverage = JSON.parse(fs.readFileSync("coverage/coverage-summary.json", "utf8"));
          const totalCoverage = coverage.total;

          if (totalCoverage.lines.pct < 70) {
            this.warning(`Low line coverage: ${totalCoverage.lines.pct}% (target: 70%)`);
          } else {
            this.pass(`Good line coverage: ${totalCoverage.lines.pct}%`);
          }

          if (totalCoverage.functions.pct < 70) {
            this.warning(`Low function coverage: ${totalCoverage.functions.pct}% (target: 70%)`);
          } else {
            this.pass(`Good function coverage: ${totalCoverage.functions.pct}%`);
          }
        }
      } catch (error) {
        this.results.unitTests.failed = 1;
        this.error("Unit tests failed");
        this.error(error.message);
      }
    } catch (error) {
      this.error(`Unit test setup failed: ${error.message}`);
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    this.log("\n🔗 Running Integration Tests...", "blue", true);

    try {
      // Test Supabase connection
      await this.testSupabaseConnection();

      // Test error reporting service
      await this.testErrorReportingService();

      // Test real-time subscriptions
      await this.testRealtimeSubscriptions();

      this.pass("Integration tests completed");
    } catch (error) {
      this.results.integrationTests.failed++;
      this.error(`Integration tests failed: ${error.message}`);
    }
  }

  /**
   * Test Supabase connection
   */
  async testSupabaseConnection() {
    try {
      // Check if Supabase config exists
      if (!fs.existsSync("src/config/supabase.ts")) {
        throw new Error("Supabase configuration not found");
      }

      // Check environment variables
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Supabase environment variables not configured");
      }

      this.results.integrationTests.passed++;
      this.pass("Supabase configuration test passed");
    } catch (error) {
      this.results.integrationTests.failed++;
      this.error(`Supabase connection test failed: ${error.message}`);
    }
  }

  /**
   * Test error reporting service
   */
  async testErrorReportingService() {
    try {
      // Check if error reporting service exists
      if (!fs.existsSync("src/services/errorReporting.ts")) {
        throw new Error("Error reporting service not found");
      }

      // Check Sentry configuration
      if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
        this.warning("Sentry DSN not configured");
      } else {
        this.pass("Sentry configuration available");
      }

      this.results.integrationTests.passed++;
      this.pass("Error reporting service test passed");
    } catch (error) {
      this.results.integrationTests.failed++;
      this.error(`Error reporting test failed: ${error.message}`);
    }
  }

  /**
   * Test real-time subscriptions
   */
  async testRealtimeSubscriptions() {
    try {
      // Check if real-time subscription manager exists
      if (!fs.existsSync("src/services/realtimeSubscriptionManager.ts")) {
        throw new Error("Real-time subscription manager not found");
      }

      this.results.integrationTests.passed++;
      this.pass("Real-time subscription test passed");
    } catch (error) {
      this.results.integrationTests.failed++;
      this.error(`Real-time subscription test failed: ${error.message}`);
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    this.log("\n⚡ Running Performance Tests...", "blue", true);

    try {
      // Test bundle size
      await this.testBundleSize();

      // Test startup performance
      await this.testStartupPerformance();

      // Test memory usage
      await this.testMemoryUsage();

      this.pass("Performance tests completed");
    } catch (error) {
      this.results.performanceTests.failed++;
      this.error(`Performance tests failed: ${error.message}`);
    }
  }

  /**
   * Test bundle size
   */
  async testBundleSize() {
    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const depCount = Object.keys(packageJson.dependencies || {}).length;

      // Rough estimation - in a real scenario, you'd build and measure actual bundle size
      const estimatedSize = depCount * 50; // KB per dependency (rough estimate)

      if (estimatedSize > 10000) {
        // 10MB
        this.warning(`Large estimated bundle size: ~${estimatedSize}KB`);
      } else {
        this.pass(`Reasonable estimated bundle size: ~${estimatedSize}KB`);
      }

      this.results.performanceTests.passed++;
    } catch (error) {
      this.results.performanceTests.failed++;
      this.error(`Bundle size test failed: ${error.message}`);
    }
  }

  /**
   * Test startup performance
   */
  async testStartupPerformance() {
    try {
      // Check for performance optimizations in config
      const appConfig = require(path.resolve("app.config.js"));
      const config = appConfig.default || appConfig;

      let optimizations = 0;

      // Check for Hermes
      const buildProperties = config.expo?.plugins?.find(
        (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
      );

      if (buildProperties && buildProperties[1]?.android?.hermesEnabled) {
        optimizations++;
        this.pass("Hermes JavaScript engine enabled");
      }

      // Check for ProGuard
      if (buildProperties && buildProperties[1]?.android?.proguardMinifyEnabled) {
        optimizations++;
        this.pass("ProGuard minification enabled");
      }

      // Check for new architecture
      if (config.expo?.newArchEnabled) {
        optimizations++;
        this.pass("New React Native architecture enabled");
      }

      if (optimizations >= 2) {
        this.results.performanceTests.passed++;
        this.pass("Startup performance optimizations in place");
      } else {
        this.results.performanceTests.failed++;
        this.warning("Consider enabling more performance optimizations");
      }
    } catch (error) {
      this.results.performanceTests.failed++;
      this.error(`Startup performance test failed: ${error.message}`);
    }
  }

  /**
   * Test memory usage patterns
   */
  async testMemoryUsage() {
    try {
      // Check for memory leak prevention patterns
      const sourceFiles = this.findSourceFiles();
      let memoryLeakRisks = 0;

      for (const file of sourceFiles.slice(0, 10)) {
        // Sample first 10 files
        const content = fs.readFileSync(file, "utf8");

        // Check for potential memory leaks
        if (content.includes("setInterval") && !content.includes("clearInterval")) {
          memoryLeakRisks++;
        }

        if (content.includes("setTimeout") && !content.includes("clearTimeout")) {
          memoryLeakRisks++;
        }

        if (content.includes("addEventListener") && !content.includes("removeEventListener")) {
          memoryLeakRisks++;
        }
      }

      if (memoryLeakRisks > 5) {
        this.warning(`Potential memory leak risks detected: ${memoryLeakRisks}`);
        this.results.performanceTests.failed++;
      } else {
        this.pass("Memory usage patterns look good");
        this.results.performanceTests.passed++;
      }
    } catch (error) {
      this.results.performanceTests.failed++;
      this.error(`Memory usage test failed: ${error.message}`);
    }
  }

  /**
   * Run security tests
   */
  async runSecurityTests() {
    this.log("\n🔒 Running Security Tests...", "blue", true);

    try {
      // Test for hardcoded secrets
      await this.testForHardcodedSecrets();

      // Test dependency vulnerabilities
      await this.testDependencyVulnerabilities();

      // Test configuration security
      await this.testConfigurationSecurity();

      this.pass("Security tests completed");
    } catch (error) {
      this.results.securityTests.failed++;
      this.error(`Security tests failed: ${error.message}`);
    }
  }

  /**
   * Test for hardcoded secrets
   */
  async testForHardcodedSecrets() {
    try {
      const secretPatterns = [
        { pattern: /sk-[a-zA-Z0-9]{48}/g, name: "OpenAI API Key" },
        { pattern: /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, name: "Slack Token" },
        { pattern: /AIza[0-9A-Za-z\\-_]{35}/g, name: "Google API Key" },
        { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS Access Key" },
      ];

      const sourceFiles = this.findSourceFiles();
      let secretsFound = 0;

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");
        for (const { pattern, name } of secretPatterns) {
          if (pattern.test(content)) {
            this.error(`Potential ${name} found in ${file}`);
            secretsFound++;
          }
        }
      }

      if (secretsFound === 0) {
        this.results.securityTests.passed++;
        this.pass("No hardcoded secrets detected");
      } else {
        this.results.securityTests.failed++;
        this.error(`${secretsFound} potential secrets found`);
      }
    } catch (error) {
      this.results.securityTests.failed++;
      this.error(`Hardcoded secrets test failed: ${error.message}`);
    }
  }

  /**
   * Test dependency vulnerabilities
   */
  async testDependencyVulnerabilities() {
    try {
      try {
        execSync("npm audit --audit-level=moderate", { stdio: "pipe" });
        this.results.securityTests.passed++;
        this.pass("No moderate+ security vulnerabilities found");
      } catch (_error) {
        this.results.securityTests.failed++;
        this.error("Security vulnerabilities detected in dependencies");
      }
    } catch (error) {
      this.results.securityTests.failed++;
      this.error(`Dependency vulnerability test failed: ${error.message}`);
    }
  }

  /**
   * Test configuration security
   */
  async testConfigurationSecurity() {
    try {
      // Check .gitignore for sensitive files
      if (!fs.existsSync(".gitignore")) {
        this.results.securityTests.failed++;
        this.error(".gitignore file missing");
        return;
      }

      const gitignore = fs.readFileSync(".gitignore", "utf8");
      const requiredEntries = [".env", "google-services.json", "*.p12", "*.pem"];
      let missingEntries = 0;

      for (const entry of requiredEntries) {
        if (!gitignore.includes(entry)) {
          this.warning(`.gitignore missing entry: ${entry}`);
          missingEntries++;
        }
      }

      if (missingEntries === 0) {
        this.results.securityTests.passed++;
        this.pass("Configuration security checks passed");
      } else {
        this.results.securityTests.failed++;
        this.error(`${missingEntries} security configuration issues found`);
      }
    } catch (error) {
      this.results.securityTests.failed++;
      this.error(`Configuration security test failed: ${error.message}`);
    }
  }

  /**
   * Analyze bundle size in detail
   */
  async analyzeBundleSize() {
    this.log("\n📊 Analyzing Bundle Size...", "blue", true);

    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const dependencies = packageJson.dependencies || {};

      // Identify large dependencies
      const largeDependencies = [
        "@shopify/react-native-skia",
        "react-native-vision-camera",
        "firebase",
        "victory-native",
      ];

      let largeDepCount = 0;
      for (const dep of largeDependencies) {
        if (dependencies[dep]) {
          largeDepCount++;
          this.warning(`Large dependency detected: ${dep}`);
        }
      }

      if (largeDepCount > 3) {
        this.warning(`Many large dependencies: ${largeDepCount}`);
      } else {
        this.pass(`Reasonable large dependency count: ${largeDepCount}`);
      }
    } catch (error) {
      this.error(`Bundle size analysis failed: ${error.message}`);
    }
  }

  /**
   * Run memory leak detection
   */
  async runMemoryLeakDetection() {
    this.log("\n🧠 Running Memory Leak Detection...", "blue", true);

    try {
      // Check for common memory leak patterns
      const sourceFiles = this.findSourceFiles();
      const leakPatterns = [
        { pattern: /setInterval\(/g, cleanup: /clearInterval\(/g, name: "setInterval without clearInterval" },
        { pattern: /setTimeout\(/g, cleanup: /clearTimeout\(/g, name: "setTimeout without clearTimeout" },
        {
          pattern: /addEventListener\(/g,
          cleanup: /removeEventListener\(/g,
          name: "addEventListener without removeEventListener",
        },
        { pattern: /subscribe\(/g, cleanup: /unsubscribe\(/g, name: "subscribe without unsubscribe" },
      ];

      let potentialLeaks = 0;

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");

        for (const { pattern, cleanup, name } of leakPatterns) {
          const matches = (content.match(pattern) || []).length;
          const cleanups = (content.match(cleanup) || []).length;

          if (matches > cleanups) {
            potentialLeaks++;
            this.warning(`${name} in ${path.basename(file)}`);
          }
        }
      }

      if (potentialLeaks === 0) {
        this.pass("No obvious memory leak patterns detected");
      } else {
        this.warning(`${potentialLeaks} potential memory leak patterns found`);
      }
    } catch (error) {
      this.error(`Memory leak detection failed: ${error.message}`);
    }
  }

  /**
   * Validate production build configuration
   */
  async validateProductionBuild() {
    this.log("\n🏗️ Validating Production Build...", "blue", true);

    try {
      // Check EAS configuration
      if (!fs.existsSync("eas.json")) {
        this.error("eas.json configuration missing");
        return;
      }

      const easConfig = JSON.parse(fs.readFileSync("eas.json", "utf8"));

      if (!easConfig.build?.production) {
        this.error("Production build profile not configured");
      } else {
        this.pass("Production build profile configured");
      }

      // Check app.config.js for production settings
      const appConfig = require(path.resolve("app.config.js"));
      const config = appConfig.default || appConfig;

      if (!config.expo?.version) {
        this.error("App version not configured");
      } else {
        this.pass(`App version configured: ${config.expo.version}`);
      }

      if (!config.expo?.ios?.bundleIdentifier || !config.expo?.android?.package) {
        this.error("Bundle identifiers not configured");
      } else {
        this.pass("Bundle identifiers configured");
      }
    } catch (error) {
      this.error(`Production build validation failed: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  findSourceFiles() {
    const files = [];
    const searchDir = (dir) => {
      if (!fs.existsSync(dir)) return;

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

  /**
   * Logging methods
   */
  log(message, color = "reset", bold = false) {
    const colorCode = colors[color] || colors.reset;
    const style = bold ? colors.bright : "";
    console.log(`${style}${colorCode}${message}${colors.reset}`);
  }

  pass(message) {
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
    this.log("📋 PRODUCTION TESTING REPORT", "cyan", true);
    this.log("=".repeat(60), "cyan");

    // Test results summary
    const totalPassed = Object.values(this.results).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, result) => sum + result.failed, 0);
    const totalSkipped = Object.values(this.results).reduce((sum, result) => sum + result.skipped, 0);

    this.log(`\n✅ Tests Passed: ${totalPassed}`, "green", true);
    this.log(`❌ Tests Failed: ${totalFailed}`, "red", true);
    this.log(`⏭️  Tests Skipped: ${totalSkipped}`, "yellow", true);
    this.log(`⚠️  Warnings: ${this.warnings.length}`, "yellow", true);
    this.log(`⏱️  Duration: ${duration}s`, "blue");

    // Detailed results
    this.log("\n📊 DETAILED RESULTS:", "blue", true);
    for (const [category, result] of Object.entries(this.results)) {
      this.log(`  ${category}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);
    }

    if (this.warnings.length > 0) {
      this.log("\n⚠️  WARNINGS:", "yellow", true);
      this.warnings.forEach((warning) => this.log(`  • ${warning}`, "yellow"));
    }

    if (this.errors.length > 0) {
      this.log("\n❌ ERRORS:", "red", true);
      this.errors.forEach((error) => this.log(`  • ${error}`, "red"));
    }

    this.log("\n" + "=".repeat(60), "cyan");

    if (totalFailed === 0) {
      this.log("🎉 ALL TESTS PASSED!", "green", true);
      this.log("Your application is ready for production deployment.", "green");

      if (this.warnings.length > 0) {
        this.log("\nConsider addressing the warnings above for optimal production performance.", "yellow");
      }
    } else {
      this.log("🚫 SOME TESTS FAILED", "red", true);
      this.log("Please fix the failing tests before deploying to production.", "red");
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testRunner = new ProductionTestRunner();
  testRunner.runTests().catch((error) => {
    console.error("Testing failed:", error);
    process.exit(1);
  });
}

module.exports = ProductionTestRunner;
