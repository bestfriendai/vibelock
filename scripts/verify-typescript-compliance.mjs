#!/usr/bin/env node

/**
 * TypeScript Strict Mode Compliance Audit and Fix Script
 * Ensures the codebase maintains strict TypeScript compliance for production reliability
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

class TypeScriptComplianceVerifier {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixed = [];
    this.startTime = Date.now();
    this.stats = {
      filesScanned: 0,
      anyTypesFound: 0,
      implicitAnyFound: 0,
      missingReturnTypes: 0,
      unusedVariables: 0,
      strictNullChecks: 0,
    };
  }

  /**
   * Main verification process
   */
  async verify() {
    this.log("🔍 Starting TypeScript Compliance Verification", "cyan", true);
    this.log("=".repeat(60), "cyan");

    try {
      // Core verification steps
      await this.verifyTsConfig();
      await this.scanSourceFiles();
      await this.runTypeScriptCompiler();
      await this.checkForAnyTypes();
      await this.checkForImplicitAny();
      await this.checkReturnTypes();
      await this.checkUnusedVariables();
      await this.checkStrictNullChecks();
      await this.generateComplianceReport();

      // Generate final report
      this.generateReport();
    } catch (error) {
      this.error(`Critical error during verification: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Verify TypeScript configuration
   */
  async verifyTsConfig() {
    this.log("\n📋 Verifying TypeScript Configuration...", "blue", true);

    try {
      if (!fs.existsSync("tsconfig.json")) {
        this.error("tsconfig.json not found");
        return;
      }

      const tsConfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"));
      const compilerOptions = tsConfig.compilerOptions || {};

      // Check strict mode settings
      const strictSettings = {
        strict: "Strict mode",
        noImplicitAny: "No implicit any",
        strictNullChecks: "Strict null checks",
        strictFunctionTypes: "Strict function types",
        strictBindCallApply: "Strict bind/call/apply",
        strictPropertyInitialization: "Strict property initialization",
        noImplicitReturns: "No implicit returns",
        noFallthroughCasesInSwitch: "No fallthrough cases in switch",
        noUncheckedIndexedAccess: "No unchecked indexed access",
      };

      for (const [setting, description] of Object.entries(strictSettings)) {
        if (compilerOptions[setting] === true) {
          this.pass(`${description} enabled`);
        } else if (compilerOptions[setting] === false) {
          this.warning(`${description} explicitly disabled`);
        } else if (setting === "strict" && !compilerOptions[setting]) {
          this.error(`${description} not enabled (required for production)`);
        } else if (!compilerOptions[setting] && compilerOptions.strict !== true) {
          this.warning(`${description} not explicitly set`);
        }
      }

      // Check other important settings
      if (compilerOptions.skipLibCheck !== true) {
        this.warning("skipLibCheck not enabled (may cause build issues)");
      } else {
        this.pass("skipLibCheck enabled");
      }

      if (!compilerOptions.esModuleInterop) {
        this.warning("esModuleInterop not enabled");
      } else {
        this.pass("esModuleInterop enabled");
      }

      if (!compilerOptions.allowSyntheticDefaultImports) {
        this.warning("allowSyntheticDefaultImports not enabled");
      } else {
        this.pass("allowSyntheticDefaultImports enabled");
      }
    } catch (error) {
      this.error(`TypeScript config verification failed: ${error.message}`);
    }
  }

  /**
   * Scan all source files
   */
  async scanSourceFiles() {
    this.log("\n📁 Scanning Source Files...", "blue", true);

    try {
      const sourceFiles = this.findSourceFiles();
      this.stats.filesScanned = sourceFiles.length;
      this.pass(`Found ${sourceFiles.length} TypeScript files`);

      // Check file naming conventions
      let badNaming = 0;
      for (const file of sourceFiles) {
        const basename = path.basename(file);

        // Check for proper extensions
        if (!basename.match(/\.(ts|tsx)$/)) {
          this.warning(`File should use .ts or .tsx extension: ${file}`);
          badNaming++;
        }

        // Check for camelCase naming (except index files)
        if (!basename.startsWith("index.") && !basename.match(/^[a-z][a-zA-Z0-9]*\.(ts|tsx)$/)) {
          this.warning(`File should use camelCase naming: ${file}`);
          badNaming++;
        }
      }

      if (badNaming === 0) {
        this.pass("All files follow naming conventions");
      } else {
        this.warning(`${badNaming} files have naming issues`);
      }
    } catch (error) {
      this.error(`Source file scanning failed: ${error.message}`);
    }
  }

  /**
   * Run TypeScript compiler
   */
  async runTypeScriptCompiler() {
    this.log("\n🔨 Running TypeScript Compiler...", "blue", true);

    try {
      // Run tsc with noEmit to check for errors
      try {
        execSync("npx tsc --noEmit", { stdio: "pipe" });
        this.pass("TypeScript compilation successful");
      } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || "";
        const errorLines = output.split("\n").filter((line) => line.includes("error TS"));

        this.error(`TypeScript compilation failed with ${errorLines.length} errors`);

        // Show first few errors
        errorLines.slice(0, 5).forEach((line) => {
          this.log(`    ${line.trim()}`, "red");
        });

        if (errorLines.length > 5) {
          this.log(`    ... and ${errorLines.length - 5} more errors`, "red");
        }
      }
    } catch (error) {
      this.error(`TypeScript compiler check failed: ${error.message}`);
    }
  }

  /**
   * Check for explicit 'any' types
   */
  async checkForAnyTypes() {
    this.log("\n🔍 Checking for Explicit Any Types...", "blue", true);

    try {
      const sourceFiles = this.findSourceFiles();
      const anyPatterns = [/:\s*any\b/g, /<any>/g, /as\s+any\b/g, /\bany\[\]/g];

      let totalAnyTypes = 0;
      const filesWithAny = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");
        let fileAnyCount = 0;

        for (const pattern of anyPatterns) {
          const matches = content.match(pattern) || [];
          fileAnyCount += matches.length;
        }

        if (fileAnyCount > 0) {
          filesWithAny.push({ file, count: fileAnyCount });
          totalAnyTypes += fileAnyCount;
        }
      }

      this.stats.anyTypesFound = totalAnyTypes;

      if (totalAnyTypes === 0) {
        this.pass("No explicit any types found");
      } else {
        this.warning(`Found ${totalAnyTypes} explicit any types in ${filesWithAny.length} files`);

        // Show files with most any types
        filesWithAny
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .forEach(({ file, count }) => {
            this.log(`    ${path.relative(process.cwd(), file)}: ${count} any types`, "yellow");
          });
      }
    } catch (error) {
      this.error(`Any type checking failed: ${error.message}`);
    }
  }

  /**
   * Check for implicit any (requires compilation)
   */
  async checkForImplicitAny() {
    this.log("\n🔍 Checking for Implicit Any Types...", "blue", true);

    try {
      // Run tsc with specific flags to catch implicit any
      try {
        execSync("npx tsc --noEmit --noImplicitAny", { stdio: "pipe" });
        this.pass("No implicit any types found");
        this.stats.implicitAnyFound = 0;
      } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || "";
        const implicitAnyErrors = output.split("\n").filter((line) => line.includes("implicitly has an 'any' type"));

        this.stats.implicitAnyFound = implicitAnyErrors.length;

        if (implicitAnyErrors.length > 0) {
          this.warning(`Found ${implicitAnyErrors.length} implicit any types`);

          // Show first few errors
          implicitAnyErrors.slice(0, 3).forEach((line) => {
            this.log(`    ${line.trim()}`, "yellow");
          });
        }
      }
    } catch (error) {
      this.error(`Implicit any checking failed: ${error.message}`);
    }
  }

  /**
   * Check for missing return types
   */
  async checkReturnTypes() {
    this.log("\n🔍 Checking Return Types...", "blue", true);

    try {
      const sourceFiles = this.findSourceFiles();
      let missingReturnTypes = 0;

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");

        // Look for function declarations without return types
        const functionPatterns = [
          /function\s+\w+\s*\([^)]*\)\s*{/g,
          /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/g,
          /\w+\s*\([^)]*\)\s*{/g, // Method definitions
        ];

        for (const pattern of functionPatterns) {
          const matches = content.match(pattern) || [];
          for (const match of matches) {
            // Skip if it already has a return type
            if (!match.includes(":") || !match.includes("=>")) {
              missingReturnTypes++;
            }
          }
        }
      }

      this.stats.missingReturnTypes = missingReturnTypes;

      if (missingReturnTypes === 0) {
        this.pass("All functions have return types");
      } else {
        this.warning(`${missingReturnTypes} functions may be missing return types`);
      }
    } catch (error) {
      this.error(`Return type checking failed: ${error.message}`);
    }
  }

  /**
   * Check for unused variables
   */
  async checkUnusedVariables() {
    this.log("\n🔍 Checking for Unused Variables...", "blue", true);

    try {
      // Run tsc with noUnusedLocals and noUnusedParameters
      try {
        execSync("npx tsc --noEmit --noUnusedLocals --noUnusedParameters", { stdio: "pipe" });
        this.pass("No unused variables found");
        this.stats.unusedVariables = 0;
      } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || "";
        const unusedErrors = output
          .split("\n")
          .filter(
            (line) =>
              line.includes("is declared but never used") || line.includes("is declared but its value is never read"),
          );

        this.stats.unusedVariables = unusedErrors.length;

        if (unusedErrors.length > 0) {
          this.warning(`Found ${unusedErrors.length} unused variables/parameters`);

          // Show first few errors
          unusedErrors.slice(0, 3).forEach((line) => {
            this.log(`    ${line.trim()}`, "yellow");
          });
        }
      }
    } catch (error) {
      this.error(`Unused variable checking failed: ${error.message}`);
    }
  }

  /**
   * Check strict null checks compliance
   */
  async checkStrictNullChecks() {
    this.log("\n🔍 Checking Strict Null Checks...", "blue", true);

    try {
      const sourceFiles = this.findSourceFiles();
      let nullCheckIssues = 0;

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");

        // Look for potential null/undefined issues
        // Unused patterns removed - were not being used

        // This is a simplified check - in practice, you'd want more sophisticated analysis
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip comments and strings
          if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
            continue;
          }

          // Look for potential null reference issues
          if (line.includes("!") && (line.includes(".") || line.includes("["))) {
            // Non-null assertion operator usage
            nullCheckIssues++;
          }
        }
      }

      this.stats.strictNullChecks = nullCheckIssues;

      if (nullCheckIssues === 0) {
        this.pass("No obvious null check issues found");
      } else {
        this.warning(`${nullCheckIssues} potential null check issues found`);
      }
    } catch (error) {
      this.error(`Strict null check verification failed: ${error.message}`);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport() {
    this.log("\n📊 Generating Compliance Report...", "blue", true);

    try {
      const report = {
        timestamp: new Date().toISOString(),
        stats: this.stats,
        issues: this.issues.length,
        warnings: this.warnings.length,
        complianceScore: this.calculateComplianceScore(),
      };

      // Write report to file
      const reportPath = "typescript-compliance-report.json";
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.pass(`Compliance report written to ${reportPath}`);

      // Generate summary
      this.log("\n📈 COMPLIANCE SUMMARY:", "magenta", true);
      this.log(`  Files Scanned: ${this.stats.filesScanned}`);
      this.log(`  Explicit Any Types: ${this.stats.anyTypesFound}`);
      this.log(`  Implicit Any Types: ${this.stats.implicitAnyFound}`);
      this.log(`  Missing Return Types: ${this.stats.missingReturnTypes}`);
      this.log(`  Unused Variables: ${this.stats.unusedVariables}`);
      this.log(`  Null Check Issues: ${this.stats.strictNullChecks}`);
      this.log(
        `  Compliance Score: ${report.complianceScore}%`,
        report.complianceScore >= 90 ? "green" : report.complianceScore >= 70 ? "yellow" : "red",
        true,
      );
    } catch (error) {
      this.error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate compliance score
   */
  calculateComplianceScore() {
    const maxScore = 100;
    let deductions = 0;

    // Deduct points for issues
    deductions += this.stats.anyTypesFound * 2; // 2 points per any type
    deductions += this.stats.implicitAnyFound * 3; // 3 points per implicit any
    deductions += this.stats.missingReturnTypes * 1; // 1 point per missing return type
    deductions += this.stats.unusedVariables * 1; // 1 point per unused variable
    deductions += this.stats.strictNullChecks * 1; // 1 point per null check issue
    deductions += this.issues.length * 5; // 5 points per error
    deductions += this.warnings.length * 2; // 2 points per warning

    return Math.max(0, maxScore - deductions);
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
        } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
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
    this.issues.push(message);
    this.log(`  ❌ ${message}`, "red");
  }

  /**
   * Generate final report
   */
  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const complianceScore = this.calculateComplianceScore();

    this.log("\n" + "=".repeat(60), "cyan");
    this.log("📋 TYPESCRIPT COMPLIANCE REPORT", "cyan", true);
    this.log("=".repeat(60), "cyan");

    this.log(
      `\n📊 COMPLIANCE SCORE: ${complianceScore}%`,
      complianceScore >= 90 ? "green" : complianceScore >= 70 ? "yellow" : "red",
      true,
    );

    this.log(`\n✅ Files Scanned: ${this.stats.filesScanned}`, "green");
    this.log(`⚠️  Warnings: ${this.warnings.length}`, "yellow");
    this.log(`❌ Errors: ${this.issues.length}`, "red");
    this.log(`⏱️  Duration: ${duration}s`, "blue");

    if (this.warnings.length > 0) {
      this.log("\n⚠️  WARNINGS:", "yellow", true);
      this.warnings.slice(0, 10).forEach((warning) => this.log(`  • ${warning}`, "yellow"));
      if (this.warnings.length > 10) {
        this.log(`  ... and ${this.warnings.length - 10} more warnings`, "yellow");
      }
    }

    if (this.issues.length > 0) {
      this.log("\n❌ ERRORS:", "red", true);
      this.issues.slice(0, 10).forEach((error) => this.log(`  • ${error}`, "red"));
      if (this.issues.length > 10) {
        this.log(`  ... and ${this.issues.length - 10} more errors`, "red");
      }
    }

    this.log("\n" + "=".repeat(60), "cyan");

    if (complianceScore >= 90) {
      this.log("🎉 EXCELLENT TYPESCRIPT COMPLIANCE!", "green", true);
      this.log("Your codebase follows TypeScript best practices.", "green");
    } else if (complianceScore >= 70) {
      this.log("👍 GOOD TYPESCRIPT COMPLIANCE", "yellow", true);
      this.log("Consider addressing the warnings above for better type safety.", "yellow");
    } else {
      this.log("⚠️  TYPESCRIPT COMPLIANCE NEEDS IMPROVEMENT", "red", true);
      this.log("Please address the errors and warnings above for better type safety.", "red");
    }

    this.log("\n💡 RECOMMENDATIONS:", "blue", true);
    this.log("  • Enable strict mode in tsconfig.json", "blue");
    this.log("  • Add explicit return types to all functions", "blue");
    this.log("  • Replace any types with specific types", "blue");
    this.log("  • Remove unused variables and imports", "blue");
    this.log("  • Use optional chaining (?.) for null safety", "blue");
  }
}

// Run verification if called directly
const verifier = new TypeScriptComplianceVerifier();
verifier.verify().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
