#!/usr/bin/env node

/**
 * Production Readiness Verification Script
 * Validates that the app is ready for production deployment
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

class ProductionVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  logError(message) {
    this.errors.push(message);
    console.log(colorize(`❌ ${message}`, "red"));
  }

  logWarning(message) {
    this.warnings.push(message);
    console.log(colorize(`⚠️  ${message}`, "yellow"));
  }

  logSuccess(message) {
    this.successes.push(message);
    console.log(colorize(`✅ ${message}`, "green"));
  }

  // Check if file exists and has content
  checkFileExists(filePath, description) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          this.logSuccess(`${description} exists and has content`);
          return true;
        } else {
          this.logError(`${description} exists but is empty`);
          return false;
        }
      } else {
        this.logError(`${description} not found`);
        return false;
      }
    } catch (error) {
      this.logError(`Error checking ${description}: ${error.message}`);
      return false;
    }
  }

  // Check environment configuration
  checkEnvironment() {
    console.log("\n🔧 Checking Environment Configuration...");

    // Check if .env file exists (optional, as EAS secrets are preferred)
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      this.logWarning(".env file found - consider using EAS secrets for production");
    } else {
      this.logSuccess("No .env file found (EAS secrets recommended)");
    }

    // Check if .env.example exists
    const envExamplePath = path.join(process.cwd(), ".env.example");
    this.checkFileExists(envExamplePath, "Environment template (.env.example)");

    // Verify critical environment variables are documented
    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    const requiredVars = [
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    ];

    requiredVars.forEach((varName) => {
      if (envExampleContent.includes(varName)) {
        this.logSuccess(`${varName} documented in .env.example`);
      } else {
        this.logWarning(`${varName} not documented in .env.example`);
      }
    });
  }

  // Check build configuration
  checkBuildConfig() {
    console.log("\n🏗️  Checking Build Configuration...");

    const filesToCheck = [
      { path: "app.config.js", description: "App configuration" },
      { path: "eas.json", description: "EAS build configuration" },
      { path: "metro.config.js", description: "Metro bundler configuration" },
      { path: "babel.config.js", description: "Babel configuration" },
    ];

    filesToCheck.forEach(({ path: filePath, description }) => {
      this.checkFileExists(path.join(process.cwd(), filePath), description);
    });

    // Check eas.json for production profile
    try {
      const easConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "eas.json"), "utf8"));
      if (easConfig.build?.production) {
        this.logSuccess("Production build profile configured in eas.json");
      } else {
        this.logWarning("Production build profile not found in eas.json");
      }
    } catch (error) {
      this.logError(`Error reading eas.json: ${error.message}`);
    }
  }

  // Check security configuration
  checkSecurity() {
    console.log("\n🔒 Checking Security Configuration...");

    // Check for hardcoded secrets in scripts
    const scriptsDir = path.join(process.cwd(), "scripts");
    if (fs.existsSync(scriptsDir)) {
      const scriptFiles = fs.readdirSync(scriptsDir).filter((file) => file.endsWith(".js") || file.endsWith(".sh"));

      scriptFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(scriptsDir, file), "utf8");
        if (content.includes("sk_") && !content.includes("Please enter your")) {
          this.logError(`Hardcoded API key found in ${file}`);
        }
      });
    }

    // Check for security-related files
    const securityFiles = [
      { path: "firestore.rules", description: "Firestore security rules" },
      { path: "storage.rules", description: "Storage security rules" },
      { path: "firestore.indexes.json", description: "Firestore indexes" },
    ];

    securityFiles.forEach(({ path: filePath, description }) => {
      this.checkFileExists(path.join(process.cwd(), filePath), description);
    });
  }

  // Check code quality
  checkCodeQuality() {
    console.log("\n📝 Checking Code Quality...");

    // Check for TypeScript compilation
    try {
      const { execSync } = require("child_process");
      execSync("npx tsc --noEmit", { stdio: "pipe" });
      this.logSuccess("TypeScript compilation passes");
    } catch (error) {
      this.logError("TypeScript compilation failed");
    }

    // Check for ESLint issues
    try {
      const { execSync } = require("child_process");
      execSync("npx eslint . --ext .js,.ts,.tsx --quiet", { stdio: "pipe" });
      this.logSuccess("ESLint passes without errors");
    } catch (error) {
      this.logWarning("ESLint found issues (check with npm run lint)");
    }

    // Check package.json for critical scripts
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    const requiredScripts = ["build:production", "typecheck", "lint"];

    requiredScripts.forEach((script) => {
      if (packageJson.scripts?.[script]) {
        this.logSuccess(`Script '${script}' configured`);
      } else {
        this.logWarning(`Script '${script}' not found in package.json`);
      }
    });
  }

  // Check documentation
  checkDocumentation() {
    console.log("\n📚 Checking Documentation...");

    const docsToCheck = [
      { path: "README.md", description: "Main README" },
      { path: "APP_STORE_RELEASE_CHECKLIST.md", description: "App Store checklist" },
      { path: "privacy-policy.md", description: "Privacy policy" },
      { path: "terms-of-service.md", description: "Terms of service" },
    ];

    docsToCheck.forEach(({ path: filePath, description }) => {
      this.checkFileExists(path.join(process.cwd(), filePath), description);
    });
  }

  // Run all checks
  async run() {
    console.log(colorize("🚀 Starting Production Readiness Verification", "blue"));
    console.log("=".repeat(60));

    this.checkEnvironment();
    this.checkBuildConfig();
    this.checkSecurity();
    this.checkCodeQuality();
    this.checkDocumentation();

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(colorize("📊 VERIFICATION SUMMARY", "blue"));
    console.log(`✅ Successes: ${this.successes.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(colorize("\n🎉 Production ready! All checks passed.", "green"));
      process.exit(0);
    } else if (this.errors.length === 0) {
      console.log(colorize("\n⚠️  Production ready with warnings. Review warnings above.", "yellow"));
      process.exit(0);
    } else {
      console.log(colorize("\n❌ Not production ready. Fix errors above.", "red"));
      process.exit(1);
    }
  }
}

// Run the verification
const verifier = new ProductionVerifier();
verifier.run().catch((error) => {
  console.error(colorize("❌ Verification failed:", "red"), error);
  process.exit(1);
});
