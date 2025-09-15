#!/usr/bin/env node

/**
 * Debug Property Conflicts Script
 * Analyzes the Metro bundle for property definition conflicts and generates a report
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const CONFIG = {
  projectRoot: path.resolve(__dirname, ".."),
  bundleDir: path.join(__dirname, "..", ".expo", "web-build"),
  outputDir: path.join(__dirname, "..", "debug-reports"),
  bundleName: "index.bundle",
  sourceMapName: "index.bundle.map",
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Log with timestamp
 */
function log(message, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
}

/**
 * Generate a development bundle for analysis
 */
function generateBundle() {
  log("Generating development bundle for analysis...");

  try {
    // Generate a development bundle
    const bundleOutput = path.join(CONFIG.outputDir, CONFIG.bundleName);
    const sourceMapOutput = path.join(CONFIG.outputDir, CONFIG.sourceMapName);

    // Use Metro to generate bundle
    const command = `npx react-native bundle --platform ios --dev true --entry-file index.ts --bundle-output "${bundleOutput}" --sourcemap-output "${sourceMapOutput}"`;

    log("Running bundle command:", command);
    execSync(command, {
      cwd: CONFIG.projectRoot,
      stdio: "inherit",
    });

    log("Bundle generated successfully");
    return { bundlePath: bundleOutput, sourceMapPath: sourceMapOutput };
  } catch (error) {
    log("Failed to generate bundle:", error.message);

    // Try alternative approach with Expo
    try {
      log("Trying with Expo bundler...");
      const command = `npx expo export --platform ios --dev --output-dir "${CONFIG.outputDir}"`;
      execSync(command, {
        cwd: CONFIG.projectRoot,
        stdio: "inherit",
      });

      return { bundlePath: path.join(CONFIG.outputDir, "index.bundle"), sourceMapPath: null };
    } catch (expoError) {
      log("Expo bundler also failed:", expoError.message);
      return null;
    }
  }
}

/**
 * Analyze bundle for property definition patterns
 */
function analyzeBundleForPropertyConflicts(bundlePath) {
  if (!fs.existsSync(bundlePath)) {
    log("Bundle file not found:", bundlePath);
    return null;
  }

  log("Analyzing bundle for property definition conflicts...");

  const bundleContent = fs.readFileSync(bundlePath, "utf8");
  const conflicts = [];

  // Patterns to look for
  const patterns = {
    defineProperty: /Object\.defineProperty\s*\(\s*([^,]+)\s*,\s*["']([^"']+)["']\s*,\s*\{([^}]+)\}/g,
    globalAssignment: /(global|window|globalThis)\s*\[\s*["']([^"']+)["']\s*\]\s*=/g,
    prototypeModification:
      /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\.prototype\s*\[\s*["']([^"']+)["']\s*\]\s*=/g,
    configurableFalse: /configurable\s*:\s*false/g,
    polyfillPatterns: {
      urlPolyfill: /react-native-url-polyfill/g,
      cryptoPolyfill: /react-native-get-random-values/g,
      reanimated: /react-native-reanimated/g,
    },
  };

  // Analyze Object.defineProperty calls
  let match;
  while ((match = patterns.defineProperty.exec(bundleContent)) !== null) {
    const [fullMatch, target, propertyName, descriptor] = match;

    // Check if this defines a non-configurable property
    if (descriptor.includes("configurable:false") || descriptor.includes("configurable: false")) {
      conflicts.push({
        type: "non-configurable-property",
        target: target.trim(),
        property: propertyName,
        descriptor: descriptor.trim(),
        location: getLocationInBundle(bundleContent, match.index),
        severity: "high",
      });
    }
  }

  // Analyze global assignments
  patterns.globalAssignment.lastIndex = 0;
  while ((match = patterns.globalAssignment.exec(bundleContent)) !== null) {
    const [fullMatch, globalObject, propertyName] = match;

    conflicts.push({
      type: "global-assignment",
      target: globalObject,
      property: propertyName,
      location: getLocationInBundle(bundleContent, match.index),
      severity: "medium",
    });
  }

  // Analyze prototype modifications
  patterns.prototypeModification.lastIndex = 0;
  while ((match = patterns.prototypeModification.exec(bundleContent)) !== null) {
    const [fullMatch, targetObject, propertyName] = match;

    conflicts.push({
      type: "prototype-modification",
      target: targetObject,
      property: propertyName,
      location: getLocationInBundle(bundleContent, match.index),
      severity: "medium",
    });
  }

  // Analyze polyfill usage
  const polyfillUsage = {};
  for (const [polyfillName, pattern] of Object.entries(patterns.polyfillPatterns)) {
    const matches = bundleContent.match(pattern);
    if (matches) {
      polyfillUsage[polyfillName] = matches.length;
    }
  }

  return {
    conflicts,
    polyfillUsage,
    bundleSize: bundleContent.length,
    analysisDate: new Date().toISOString(),
  };
}

/**
 * Get approximate location in bundle (line number)
 */
function getLocationInBundle(content, index) {
  const beforeIndex = content.substring(0, index);
  const lineNumber = (beforeIndex.match(/\n/g) || []).length + 1;
  const lastNewline = beforeIndex.lastIndexOf("\n");
  const columnNumber = index - lastNewline;

  return { line: lineNumber, column: columnNumber };
}

/**
 * Analyze package.json for potential conflicting dependencies
 */
function analyzeDependencies() {
  log("Analyzing dependencies for potential conflicts...");

  const packageJsonPath = path.join(CONFIG.projectRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    log("package.json not found");
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Known problematic combinations
  const problematicPackages = {
    "react-native-reanimated": {
      versions: ["4.0.0-alpha", "4.1.0"],
      issues: ["Property configuration conflicts in Hermes"],
    },
    "react-native-url-polyfill": {
      issues: ["URL global property conflicts"],
    },
    "react-native-get-random-values": {
      issues: ["Crypto global property conflicts"],
    },
  };

  const potentialIssues = [];

  for (const [packageName, packageInfo] of Object.entries(problematicPackages)) {
    if (dependencies[packageName]) {
      const installedVersion = dependencies[packageName];

      potentialIssues.push({
        package: packageName,
        version: installedVersion,
        issues: packageInfo.issues,
        problematicVersions: packageInfo.versions || [],
      });
    }
  }

  return {
    totalDependencies: Object.keys(dependencies).length,
    potentialIssues,
    reactNativeVersion: dependencies["react-native"],
    expoVersion: dependencies["expo"],
  };
}

/**
 * Check for patches that might affect property definitions
 */
function analyzePatches() {
  log("Analyzing patches for property definition modifications...");

  const patchesDir = path.join(CONFIG.projectRoot, "patches");
  if (!fs.existsSync(patchesDir)) {
    return { hasPatches: false };
  }

  const patchFiles = fs.readdirSync(patchesDir).filter((file) => file.endsWith(".patch"));
  const patchAnalysis = [];

  for (const patchFile of patchFiles) {
    const patchPath = path.join(patchesDir, patchFile);
    const patchContent = fs.readFileSync(patchPath, "utf8");

    // Look for property-related modifications in patches
    const propertyModifications = [];

    if (patchContent.includes("defineProperty")) {
      propertyModifications.push("defineProperty calls");
    }

    if (patchContent.includes("configurable")) {
      propertyModifications.push("configurable property modifications");
    }

    if (patchContent.includes("global.")) {
      propertyModifications.push("global object modifications");
    }

    patchAnalysis.push({
      file: patchFile,
      modifications: propertyModifications,
      size: patchContent.length,
    });
  }

  return {
    hasPatches: true,
    patchCount: patchFiles.length,
    patches: patchAnalysis,
  };
}

/**
 * Generate a comprehensive report
 */
function generateReport(bundleAnalysis, dependencyAnalysis, patchAnalysis) {
  log("Generating comprehensive conflict report...");

  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: CONFIG.projectRoot,
    summary: {
      totalConflicts: bundleAnalysis?.conflicts?.length || 0,
      highSeverityConflicts: bundleAnalysis?.conflicts?.filter((c) => c.severity === "high").length || 0,
      potentialDependencyIssues: dependencyAnalysis?.potentialIssues?.length || 0,
      patchesFound: patchAnalysis?.patchCount || 0,
    },
    bundleAnalysis,
    dependencyAnalysis,
    patchAnalysis,
    recommendations: generateRecommendations(bundleAnalysis, dependencyAnalysis, patchAnalysis),
  };

  // Write report to file
  const reportPath = path.join(CONFIG.outputDir, `property-conflicts-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Write human-readable summary
  const summaryPath = path.join(CONFIG.outputDir, `property-conflicts-summary-${Date.now()}.md`);
  const summaryContent = generateMarkdownSummary(report);
  fs.writeFileSync(summaryPath, summaryContent);

  log("Report generated:", reportPath);
  log("Summary generated:", summaryPath);

  return report;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(bundleAnalysis, dependencyAnalysis, patchAnalysis) {
  const recommendations = [];

  // High severity conflicts
  if (bundleAnalysis?.conflicts?.some((c) => c.severity === "high")) {
    recommendations.push({
      priority: "high",
      action: "Fix non-configurable property definitions",
      description: "Found properties being defined as non-configurable which may cause runtime errors",
      details: bundleAnalysis.conflicts.filter((c) => c.severity === "high"),
    });
  }

  // Dependency issues
  if (dependencyAnalysis?.potentialIssues?.length > 0) {
    recommendations.push({
      priority: "medium",
      action: "Review problematic dependencies",
      description: "Some dependencies are known to cause property conflicts",
      details: dependencyAnalysis.potentialIssues,
    });
  }

  // Patch issues
  if (patchAnalysis?.patches?.some((p) => p.modifications.length > 0)) {
    recommendations.push({
      priority: "medium",
      action: "Review patches for property modifications",
      description: "Found patches that modify property definitions",
      details: patchAnalysis.patches.filter((p) => p.modifications.length > 0),
    });
  }

  return recommendations;
}

/**
 * Generate human-readable markdown summary
 */
function generateMarkdownSummary(report) {
  return `# Property Conflicts Analysis Report

Generated: ${report.generatedAt}

## Summary

- **Total Conflicts**: ${report.summary.totalConflicts}
- **High Severity**: ${report.summary.highSeverityConflicts}
- **Dependency Issues**: ${report.summary.potentialDependencyIssues}
- **Patches Found**: ${report.summary.patchesFound}

## High Priority Recommendations

${report.recommendations
  .filter((r) => r.priority === "high")
  .map((r) => `### ${r.action}\n\n${r.description}\n`)
  .join("\n")}

## Dependency Analysis

${
  report.dependencyAnalysis?.potentialIssues
    ?.map((issue) => `- **${issue.package}** (${issue.version}): ${issue.issues.join(", ")}`)
    .join("\n") || "No dependency issues found."
}

## Bundle Conflicts

${
  report.bundleAnalysis?.conflicts
    ?.map(
      (conflict) => `- **${conflict.type}**: ${conflict.target}.${conflict.property} (${conflict.severity} severity)`,
    )
    .join("\n") || "No bundle conflicts found."
}

## Next Steps

1. Address high severity conflicts first
2. Update problematic dependencies to stable versions
3. Review and update patches with property modifications
4. Test thoroughly on target devices (especially iOS with Hermes)
`;
}

/**
 * Main execution function
 */
async function main() {
  log("Starting property conflicts analysis...");

  try {
    // Generate bundle for analysis
    const bundleInfo = generateBundle();

    // Analyze bundle if available
    let bundleAnalysis = null;
    if (bundleInfo && bundleInfo.bundlePath) {
      bundleAnalysis = analyzeBundleForPropertyConflicts(bundleInfo.bundlePath);
    }

    // Analyze dependencies
    const dependencyAnalysis = analyzeDependencies();

    // Analyze patches
    const patchAnalysis = analyzePatches();

    // Generate comprehensive report
    const report = generateReport(bundleAnalysis, dependencyAnalysis, patchAnalysis);

    // Print summary to console
    log("Analysis complete!");
    log(`Total conflicts found: ${report.summary.totalConflicts}`);
    log(`High severity conflicts: ${report.summary.highSeverityConflicts}`);
    log(`Potential dependency issues: ${report.summary.potentialDependencyIssues}`);

    if (report.summary.highSeverityConflicts > 0) {
      log("⚠️  High severity conflicts detected! Review the generated report.");
      process.exit(1);
    } else {
      log("✅ No high severity conflicts detected.");
      process.exit(0);
    }
  } catch (error) {
    log("Analysis failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleForPropertyConflicts,
  analyzeDependencies,
  analyzePatches,
  generateReport,
};
