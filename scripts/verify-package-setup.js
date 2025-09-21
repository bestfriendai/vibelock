#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(50));
  log(title, colors.bright + colors.blue);
  console.log("=".repeat(50));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

class PackageVerifier {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.projectRoot = process.cwd();
  }

  addIssue(issue) {
    this.issues.push(issue);
    logError(issue);
  }

  addWarning(warning) {
    this.warnings.push(warning);
    logWarning(warning);
  }

  // Check for multiple lock files
  checkLockFiles() {
    logSection("Lock File Analysis");

    const lockFiles = ["package-lock.json", "yarn.lock", "bun.lockb", "pnpm-lock.yaml"];

    const foundLockFiles = lockFiles.filter((file) => fs.existsSync(path.join(this.projectRoot, file)));

    if (foundLockFiles.length === 0) {
      logInfo(
        "No lock files found - npm projects typically commit package-lock.json for dependency version consistency",
      );
    } else if (foundLockFiles.length === 1) {
      logSuccess(`Single lock file detected: ${foundLockFiles[0]}`);
    } else {
      this.addIssue(`Multiple lock files detected: ${foundLockFiles.join(", ")}`);
      logInfo('Run "npm run fix:packages" to resolve lock file conflicts');
    }

    return foundLockFiles;
  }

  // Verify package.json structure
  checkPackageJson() {
    logSection("Package.json Validation");

    const packageJsonPath = path.join(this.projectRoot, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      this.addIssue("package.json not found");
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      logSuccess("package.json structure is valid");

      // Check for required dependencies
      const requiredDeps = ["react-native-worklets", "expo-audio", "expo-video", "expo", "react-native"];

      requiredDeps.forEach((dep) => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          logSuccess(`${dep}: ${packageJson.dependencies[dep]}`);
        } else {
          this.addIssue(`Missing required dependency: ${dep}`);
        }
      });

      return packageJson;
    } catch (error) {
      this.addIssue(`Invalid package.json: ${error.message}`);
      return null;
    }
  }

  // Check node_modules installation
  checkNodeModules() {
    logSection("Node Modules Verification");

    const nodeModulesPath = path.join(this.projectRoot, "node_modules");

    if (!fs.existsSync(nodeModulesPath)) {
      this.addIssue("node_modules directory not found");
      logInfo('Run "npm install" to install dependencies');
      return false;
    }

    logSuccess("node_modules directory exists");

    // Check specific critical dependencies
    const criticalDeps = ["react-native-worklets", "expo-audio", "expo-video", "expo", "react-native"];

    criticalDeps.forEach((dep) => {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        logSuccess(`${dep} is installed`);
      } else {
        this.addWarning(`${dep} may not be properly installed`);
      }
    });

    return true;
  }

  // Check for peer dependency issues
  checkPeerDependencies() {
    logSection("Peer Dependencies Check");

    let output = "";
    let exitCode = 0;

    try {
      output = execSync("npm ls --json --depth=0", {
        encoding: "utf8",
        cwd: this.projectRoot,
      });
    } catch (error) {
      // npm ls returns non-zero exit codes even for warnings
      exitCode = error.status || 1;
      output = error.stdout || error.stderr || "";
    }

    if (!output.trim()) {
      this.addWarning("No output from npm ls command - unable to verify peer dependencies");
      return;
    }

    try {
      const data = JSON.parse(output);
      const problems = data.problems || [];

      // Filter for peer dependency issues
      const peerDepMissing = problems.filter(
        (problem) => problem && typeof problem === "string" && problem.toLowerCase().includes("peer dep missing"),
      );

      if (peerDepMissing.length > 0) {
        this.addWarning(`Found ${peerDepMissing.length} missing peer dependencies:`);
        peerDepMissing.forEach((issue) => {
          logInfo(`  - ${issue}`);
        });
        logInfo("These may not be critical for React Native/Expo projects");
      } else if (problems.length > 0) {
        logInfo(`Found ${problems.length} non-peer dependency issues (may be acceptable)`);
        if (exitCode !== 0) {
          logInfo("Some dependency warnings exist but no missing peer dependencies detected");
        }
      } else {
        logSuccess("No peer dependency issues detected");
      }
    } catch (_parseError) {
      // Fallback to text-based parsing if JSON is malformed
      logWarning("Could not parse npm ls JSON output, using fallback text analysis");

      const lowerOutput = output.toLowerCase();
      if (lowerOutput.includes("peer dep missing") || lowerOutput.includes("unmet peer dependency")) {
        this.addWarning("Peer dependency issues detected (text-based check)");
        logInfo('Run "npm ls --depth=0" manually for detailed information');
      } else if (exitCode !== 0) {
        logInfo("npm ls returned warnings but no peer dependency issues detected");
      } else {
        logSuccess("No peer dependency issues detected");
      }
    }
  }

  // Check app.json configuration
  checkAppJsonConfig() {
    logSection("App Configuration Check");

    const appJsonPath = path.join(this.projectRoot, "app.json");

    if (!fs.existsSync(appJsonPath)) {
      this.addWarning("app.json not found");
      return;
    }

    try {
      const appJsonContent = fs.readFileSync(appJsonPath, "utf8");
      JSON.parse(appJsonContent);

      logSuccess("app.json structure is valid");

      // Check for deprecated properties
      const deprecatedProps = ["statusBarStyle"];
      let foundDeprecated = false;

      deprecatedProps.forEach((prop) => {
        if (appJsonContent.includes(`"${prop}"`)) {
          this.addWarning(`Deprecated property found: ${prop}`);
          foundDeprecated = true;
        }
      });

      if (!foundDeprecated) {
        logSuccess("No deprecated properties found");
      }
    } catch (error) {
      this.addIssue(`Invalid app.json: ${error.message}`);
    }
  }

  // Check Expo CLI availability
  checkExpoCli() {
    logSection("Expo CLI Check");

    try {
      execSync("expo --version", { stdio: "pipe" });
      logSuccess("Expo CLI is available");

      try {
        execSync("expo doctor --fix-dependencies=false", {
          stdio: "pipe",
          timeout: 10000,
        });
        logSuccess("Expo doctor check passed");
      } catch (_error) {
        this.addWarning("Expo doctor found some issues");
        logInfo('Run "expo doctor" manually for details');
      }
    } catch (_error) {
      this.addWarning("Expo CLI not available globally");
      logInfo("Consider installing: npm install -g @expo/cli");
    }
  }

  // Check specific React Native Worklets setup
  checkWorklets() {
    logSection("React Native Worklets Verification");

    const packageJsonPath = path.join(this.projectRoot, "package.json");
    const nodeModulesPath = path.join(this.projectRoot, "node_modules", "react-native-worklets");

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const workletsVersion = packageJson.dependencies?.["react-native-worklets"];

      if (workletsVersion) {
        logSuccess(`react-native-worklets version: ${workletsVersion}`);
      } else {
        this.addIssue("react-native-worklets not found in dependencies");
      }
    }

    if (fs.existsSync(nodeModulesPath)) {
      logSuccess("react-native-worklets module directory exists");
    } else {
      this.addWarning("react-native-worklets module directory not found");
    }
  }

  // Generate recommendations
  generateRecommendations() {
    logSection("Recommendations");

    if (this.issues.length === 0 && this.warnings.length === 0) {
      logSuccess("✨ All package management checks passed!");
      logInfo("Your project setup looks good.");
      return;
    }

    if (this.issues.length > 0) {
      logError(`Found ${this.issues.length} critical issue(s):`);
      logInfo("🔧 Run: npm run fix:packages");
    }

    if (this.warnings.length > 0) {
      logWarning(`Found ${this.warnings.length} warning(s) - these may not be critical`);
    }

    console.log("\n📋 Quick Fix Commands:");
    console.log("  npm run fix:packages     - Fix package management issues");
    console.log("  npm run clean:install    - Clean reinstall all dependencies");
    console.log("  expo doctor              - Check Expo-specific issues");
    console.log("  npm ls --depth=0         - Check installed packages");
  }

  // Main verification method
  async verify() {
    console.log("🔍 Starting Package Setup Verification...\n");

    this.checkLockFiles();
    this.checkPackageJson();
    this.checkNodeModules();
    this.checkPeerDependencies();
    this.checkAppJsonConfig();
    this.checkExpoCli();
    this.checkWorklets();
    this.generateRecommendations();

    // Summary
    console.log("\n" + "=".repeat(50));
    log("VERIFICATION SUMMARY", colors.bright);
    console.log("=".repeat(50));

    if (this.issues.length === 0) {
      logSuccess(`Package setup verification completed successfully!`);
    } else {
      logError(`Found ${this.issues.length} critical issue(s) that need attention`);
    }

    if (this.warnings.length > 0) {
      logWarning(`${this.warnings.length} warning(s) detected`);
    }

    // Exit with appropriate code
    process.exit(this.issues.length > 0 ? 1 : 0);
  }
}

// Standalone verification functions for reuse
function checkMultipleLockFiles() {
  const lockFiles = ["package-lock.json", "yarn.lock", "bun.lockb", "pnpm-lock.yaml"];
  const foundLockFiles = lockFiles.filter((file) => fs.existsSync(path.join(process.cwd(), file)));

  if (foundLockFiles.length > 1) {
    return { hasIssues: true, message: `Multiple lock files detected: ${foundLockFiles.join(", ")}` };
  }
  return { hasIssues: false };
}

function checkNodeModulesExists() {
  const nodeModulesPath = path.join(process.cwd(), "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    return { hasIssues: true, message: "node_modules directory not found" };
  }
  return { hasIssues: false };
}

function checkCriticalDependencies() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const issues = [];

  if (!fs.existsSync(packageJsonPath)) {
    return { hasIssues: true, message: "package.json not found" };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const criticalDeps = ["react-native-worklets", "expo-audio", "expo-video"];

    criticalDeps.forEach((dep) => {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        issues.push(`Missing critical dependency: ${dep}`);
      }
    });

    if (issues.length > 0) {
      return { hasIssues: true, message: issues.join(", ") };
    }
  } catch (error) {
    return { hasIssues: true, message: `Invalid package.json: ${error.message}` };
  }

  return { hasIssues: false };
}

function checkDeprecatedAppJsonProperties() {
  const appJsonPath = path.join(process.cwd(), "app.json");
  const warnings = [];

  if (!fs.existsSync(appJsonPath)) {
    return { hasWarnings: false };
  }

  try {
    const appJsonContent = fs.readFileSync(appJsonPath, "utf8");
    if (appJsonContent.includes('"statusBarStyle"')) {
      warnings.push("Deprecated statusBarStyle property found in app.json");
    }
  } catch (error) {
    warnings.push(`Could not check app.json: ${error.message}`);
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings: warnings,
  };
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new PackageVerifier();
  verifier.verify().catch((error) => {
    logError(`Verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  PackageVerifier,
  checkMultipleLockFiles,
  checkNodeModulesExists,
  checkCriticalDependencies,
  checkDeprecatedAppJsonProperties,
};
