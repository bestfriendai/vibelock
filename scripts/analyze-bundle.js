const fs = require("fs");
const path = require("path");

// Known heavy dependencies that should be analyzed
const HEAVY_DEPENDENCIES = [
  "@shopify/react-native-skia",
  "react-native-maps",
  "@shopify/flash-list",
  "react-native-reanimated",
  "lottie-react-native",
  "react-native-webview",
  "@react-native-firebase/app",
  "@react-native-firebase/firestore",
  "@react-native-firebase/auth",
  "@react-native-firebase/storage",
  "@react-native-firebase/analytics",
  "expo-camera",
  "expo-av",
  "expo-image",
  "expo-notifications",
  "react-native-svg",
  "react-native-chart-kit",
  "react-native-purchases",
];

// Dependencies that can potentially be lazy-loaded
const LAZY_LOAD_CANDIDATES = [
  "@shopify/react-native-skia",
  "react-native-maps",
  "react-native-chart-kit",
  "expo-camera",
  "expo-av",
  "react-native-purchases",
];

// Dependencies that might be unused
const POTENTIALLY_UNUSED = [
  "expo-calendar",
  "expo-contacts",
  "expo-mail-composer",
  "expo-sms",
  "expo-battery",
  "expo-brightness",
  "expo-cellular",
  "expo-live-photo",
];

function analyzePackageJson() {
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  console.log("=== Bundle Analysis Report ===\n");

  // Analyze heavy dependencies
  console.log("📦 Heavy Dependencies (Consider Optimization):");
  HEAVY_DEPENDENCIES.forEach((dep) => {
    if (dependencies[dep] || devDependencies[dep]) {
      console.log(`  • ${dep}`);
    }
  });

  console.log("\n🔄 Lazy Load Candidates:");
  LAZY_LOAD_CANDIDATES.forEach((dep) => {
    if (dependencies[dep] || devDependencies[dep]) {
      console.log(`  • ${dep}`);
    }
  });

  console.log("\n❓ Potentially Unused Dependencies:");
  POTENTIALLY_UNUSED.forEach((dep) => {
    if (dependencies[dep] || devDependencies[dep]) {
      console.log(`  • ${dep}`);
    }
  });

  // Calculate total dependency count
  const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
  console.log(`\n📊 Total Dependencies: ${totalDeps}`);
  console.log(`📊 Production Dependencies: ${Object.keys(dependencies).length}`);
  console.log(`📊 Dev Dependencies: ${Object.keys(devDependencies).length}`);

  return {
    heavyDependencies: HEAVY_DEPENDENCIES.filter((dep) => dependencies[dep] || devDependencies[dep]),
    lazyLoadCandidates: LAZY_LOAD_CANDIDATES.filter((dep) => dependencies[dep] || devDependencies[dep]),
    potentiallyUnused: POTENTIALLY_UNUSED.filter((dep) => dependencies[dep] || devDependencies[dep]),
    totalDependencies: totalDeps,
  };
}

function generateOptimizationRecommendations(analysis) {
  console.log("\n=== Optimization Recommendations ===\n");

  if (analysis.lazyLoadCandidates.length > 0) {
    console.log("🚀 Lazy Loading Opportunities:");
    analysis.lazyLoadCandidates.forEach((dep) => {
      console.log(`  • ${dep} - Consider dynamic imports for features that are not used on app startup`);
    });
  }

  if (analysis.potentiallyUnused.length > 0) {
    console.log("\n🧹 Cleanup Opportunities:");
    analysis.potentiallyUnused.forEach((dep) => {
      console.log(`  • ${dep} - Check if this dependency is actually used in the codebase`);
    });
  }

  if (analysis.heavyDependencies.length > 0) {
    console.log("\n⚡ Performance Optimization:");
    console.log("  • Consider using bundle splitting for heavy libraries");
    console.log("  • Review if all heavy dependencies are necessary for core functionality");
    console.log("  • Implement tree-shaking by ensuring proper ES module imports");
  }

  console.log("\n🔧 Technical Recommendations:");
  console.log('  • Run "npx expo export --dump-assetmap" to analyze actual bundle size');
  console.log('  • Use "expo-optimize" plugin for automatic bundle optimization');
  console.log("  • Consider implementing code splitting for non-critical features");
  console.log("  • Review metro.config.js for additional optimization options");
}

function main() {
  try {
    const analysis = analyzePackageJson();
    generateOptimizationRecommendations(analysis);

    console.log("\n✅ Bundle analysis completed successfully!");

    // Write analysis to file for future reference
    const reportPath = path.join(__dirname, "..", "bundle-analysis-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`📄 Analysis report saved to: ${reportPath}`);
  } catch (error) {
    console.error("❌ Error analyzing bundle:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzePackageJson, generateOptimizationRecommendations };
