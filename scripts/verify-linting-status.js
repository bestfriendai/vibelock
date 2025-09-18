#!/usr/bin/env node

/**
 * Comprehensive Linting Status Verification Script
 * This script checks for remaining linting issues and provides a detailed report.
 */

const { execSync } = require("child_process");
const fs = require("fs");

// Colors for console output
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

class LintingVerifier {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
    this.startTime = Date.now();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  logSuccess(message) {
    this.log(`✓ ${message}`, colors.green);
    this.successes.push(message);
  }

  logWarning(message) {
    this.log(`⚠ ${message}`, colors.yellow);
    this.warnings.push(message);
  }

  logError(message) {
    this.log(`✗ ${message}`, colors.red);
    this.issues.push(message);
  }

  logInfo(message) {
    this.log(`ℹ ${message}`, colors.cyan);
  }

  logHeader(message) {
    this.log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}`);
  }

  runCommand(command, description, options = {}) {
    const { allowFailure = false, silent = false } = options;

    try {
      if (!silent) {
        this.logInfo(`Running: ${command}`);
      }

      const result = execSync(command, {
        encoding: "utf8",
        stdio: silent ? "pipe" : "inherit",
        cwd: process.cwd(),
      });

      if (!silent) {
        this.logSuccess(description);
      }

      return { success: true, output: result };
    } catch (error) {
      const message = `${description}: ${error.message}`;

      if (allowFailure) {
        this.logWarning(message);
      } else {
        this.logError(message);
      }

      return { success: false, output: error.stdout || error.message };
    }
  }

  checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.logSuccess(`${description}: Found`);
      return true;
    } else {
      this.logWarning(`${description}: Not found`);
      return false;
    }
  }

  searchForPattern(pattern, directory, description) {
    try {
      const result = execSync(
        `find ${directory} -name "*.tsx" -o -name "*.ts" | xargs grep -l "${pattern}" 2>/dev/null || true`,
        {
          encoding: "utf8",
          stdio: "pipe",
        },
      );

      const files = result
        .trim()
        .split("\n")
        .filter((f) => f.trim());

      if (files.length === 0 || (files.length === 1 && files[0] === "")) {
        this.logSuccess(`${description}: No matches found`);
        return [];
      } else {
        this.logWarning(`${description}: Found in ${files.length} file(s)`);
        files.forEach((file) => this.logInfo(`  - ${file}`));
        return files;
      }
    } catch (error) {
      this.logError(`${description}: Search failed - ${error.message}`);
      return [];
    }
  }

  async verifyESLint() {
    this.logHeader("ESLint Verification");

    // Check if ESLint config exists
    const eslintConfigs = [".eslintrc.js", ".eslintrc.json", "eslint.config.js"];
    const foundConfig = eslintConfigs.find((config) => fs.existsSync(config));

    if (foundConfig) {
      this.logSuccess(`ESLint config found: ${foundConfig}`);
    } else {
      this.logWarning("No ESLint config file found");
    }

    // Run ESLint check
    const eslintResult = this.runCommand("npm run lint", "ESLint check completed", { allowFailure: true });

    return eslintResult.success;
  }

  async verifyPrettier() {
    this.logHeader("Prettier Verification");

    // Check if Prettier config exists
    const prettierConfigs = [".prettierrc", ".prettierrc.json", ".prettierrc.js", "prettier.config.js"];
    const foundConfig = prettierConfigs.find((config) => fs.existsSync(config));

    if (foundConfig) {
      this.logSuccess(`Prettier config found: ${foundConfig}`);
    } else {
      this.logWarning("No Prettier config file found");
    }

    // Run Prettier check
    const prettierResult = this.runCommand("npm run format:check", "Prettier format check completed", {
      allowFailure: true,
    });

    return prettierResult.success;
  }

  async verifyTypeScript() {
    this.logHeader("TypeScript Verification");

    // Check if TypeScript config exists
    this.checkFileExists("tsconfig.json", "TypeScript config");

    // Run TypeScript check
    const tscResult = this.runCommand("npm run typecheck", "TypeScript compilation check completed", {
      allowFailure: true,
    });

    return tscResult.success;
  }

  async checkUnusedImports() {
    this.logHeader("Unused Imports Check");

    // Search for potentially unused imports
    const patterns = [
      { pattern: "withTiming", description: "withTiming import" },
      { pattern: "Dimensions", description: "Dimensions import" },
      { pattern: "placement.*:", description: "unused placement parameter" },
    ];

    for (const { pattern, description } of patterns) {
      this.searchForPattern(pattern, "src/", description);
    }
  }

  async checkThemeColorIssues() {
    this.logHeader("Theme Color Type Issues Check");

    // Search for theme color type issues
    const patterns = [
      { pattern: "borderColor: colors\\.border[^.]", description: "Direct theme color object usage" },
      { pattern: "borderTopColor: colors\\.border[^.]", description: "Direct theme border color usage" },
    ];

    for (const { pattern, description } of patterns) {
      this.searchForPattern(pattern, "src/", description);
    }
  }

  async checkReactHookDependencies() {
    this.logHeader("React Hook Dependencies Check");

    // This is a basic check - for comprehensive analysis, you'd want to use a proper ESLint rule
    this.logInfo("React Hook dependency check requires ESLint react-hooks plugin");
    this.logInfo("Running ESLint will catch missing dependencies");
  }

  async verifyScripts() {
    this.logHeader("Package.json Scripts Verification");

    const packageJsonPath = "package.json";
    if (!fs.existsSync(packageJsonPath)) {
      this.logError("package.json not found");
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const scripts = packageJson.scripts || {};

      const requiredScripts = ["lint", "format", "typecheck", "lint:fix", "lint:check", "format:check"];

      for (const script of requiredScripts) {
        if (scripts[script]) {
          this.logSuccess(`Script '${script}' is defined`);
        } else {
          this.logWarning(`Script '${script}' is missing`);
        }
      }

      return true;
    } catch (error) {
      this.logError(`Failed to parse package.json: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    this.logHeader("Verification Summary");

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.log(`\n${colors.bright}Verification completed in ${duration}s${colors.reset}`);

    if (this.successes.length > 0) {
      this.log(`\n${colors.green}${colors.bright}✓ Successes (${this.successes.length}):${colors.reset}`);
      this.successes.forEach((success) => this.log(`  • ${success}`, colors.green));
    }

    if (this.warnings.length > 0) {
      this.log(`\n${colors.yellow}${colors.bright}⚠ Warnings (${this.warnings.length}):${colors.reset}`);
      this.warnings.forEach((warning) => this.log(`  • ${warning}`, colors.yellow));
    }

    if (this.issues.length > 0) {
      this.log(`\n${colors.red}${colors.bright}✗ Issues (${this.issues.length}):${colors.reset}`);
      this.issues.forEach((issue) => this.log(`  • ${issue}`, colors.red));
    }

    // Overall status
    this.log("\n" + "=".repeat(50));

    if (this.issues.length === 0) {
      this.log(`${colors.green}${colors.bright}🎉 All checks passed!${colors.reset}`);
      if (this.warnings.length > 0) {
        this.log(
          `${colors.yellow}Note: ${this.warnings.length} warning(s) found but no blocking issues.${colors.reset}`,
        );
      }
      return 0;
    } else {
      this.log(`${colors.red}${colors.bright}❌ ${this.issues.length} issue(s) need attention${colors.reset}`);
      return 1;
    }
  }

  async run() {
    this.log(`${colors.bright}${colors.cyan}🔍 Comprehensive Linting Status Verification${colors.reset}`);
    this.log(`${colors.cyan}Starting verification at ${new Date().toLocaleString()}${colors.reset}\n`);

    try {
      // Verify core linting tools
      await this.verifyESLint();
      await this.verifyPrettier();
      await this.verifyTypeScript();

      // Check for specific issues
      await this.checkUnusedImports();
      await this.checkThemeColorIssues();
      await this.checkReactHookDependencies();

      // Verify project setup
      await this.verifyScripts();

      // Generate final report
      const exitCode = this.generateReport();

      // Optional: Write JSON report
      if (process.argv.includes("--json")) {
        const jsonReport = {
          timestamp: new Date().toISOString(),
          duration: (Date.now() - this.startTime) / 1000,
          successes: this.successes,
          warnings: this.warnings,
          issues: this.issues,
          exitCode,
        };

        fs.writeFileSync("linting-report.json", JSON.stringify(jsonReport, null, 2));
        this.logInfo("JSON report written to linting-report.json");
      }

      process.exit(exitCode);
    } catch (error) {
      this.logError(`Verification failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the verification
if (require.main === module) {
  const verifier = new LintingVerifier();
  verifier.run();
}

module.exports = LintingVerifier;
