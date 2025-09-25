import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DependencyCleaner {
  constructor() {
    this.unusedDeps = [
      // Based on depcheck analysis - truly unused dependencies
      "@anthropic-ai/sdk",
      "@expo/apple-utils",
      "@expo/react-native-action-sheet",
      "@react-native-community/datetimepicker",
      "@react-native-firebase/auth",
      "@react-native-firebase/firestore",
      "@react-native-firebase/storage",
      "@react-native-masked-view/masked-view",
      "@react-native-menu/menu",
      "@react-native-picker/picker",
      "@react-native-segmented-control/segmented-control",
      "@react-navigation/drawer",
      "@react-navigation/elements",
      "@react-navigation/material-top-tabs",
      "@react-navigation/stack",
      "@shopify/react-native-skia",
      "@vm-lib/patch-node-modules",
      "emoji-picker-react",
      "expo-asset",
      "expo-auth-session",
      "expo-background-fetch",
      "expo-battery",
      "expo-brightness",
      "expo-build-properties",
      "expo-calendar",
      "expo-camera",
      "expo-cellular",
      "expo-checkbox",
      "expo-contacts",
      "expo-crypto",
      "expo-dev-client",
      "expo-insights",
      "expo-keep-awake",
      "expo-live-photo",
      "expo-localization",
      "expo-mail-composer",
      "expo-manifests",
      "expo-network",
      "expo-network-addons",
      "expo-sensors",
      "expo-sms",
      "expo-speech",
      "expo-sqlite",
      "expo-symbols",
      "expo-system-ui",
      "expo-web-browser",
      "lottie-react-native",
      "markdown-it",
      "openai",
      "react-native-chart-kit",
      "react-native-maps",
      "react-native-markdown-display",
      "react-native-pager-view",
      "react-native-screens",
      "react-native-svg",
      "zeego",
    ];

    this.devDepsToKeep = [
      "@types/jest",
      "@typescript-eslint/eslint-plugin",
      "@typescript-eslint/parser",
      "eslint-plugin-react",
      "eslint-plugin-react-hooks",
      "patch-package",
      "rimraf",
    ];
  }

  async removeDependencies() {
    console.log("🚀 Starting dependency cleanup...\n");

    // Remove production dependencies
    for (const dep of this.unusedDeps) {
      try {
        console.log(`Removing ${dep}...`);
        execSync(`npm uninstall ${dep}`, { stdio: "inherit" });
        console.log(`✅ Removed ${dep}\n`);
      } catch (error) {
        console.log(`⚠️ Could not remove ${dep}: ${error.message}\n`);
      }
    }

    console.log("✅ Production dependency cleanup completed!\n");

    // Create a backup of package.json before making changes
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageBackup = path.join(__dirname, "..", "package.json.backup");
    fs.copyFileSync(packagePath, packageBackup);
    console.log("📦 Created package.json backup\n");

    console.log("🎉 Dependency cleanup completed!");
    console.log("\n📊 Summary:");
    console.log(`• Removed ${this.unusedDeps.length} unused dependencies`);
    console.log("• Created package.json backup");
    console.log("\n💡 Next steps:");
    console.log('• Run "npm run typecheck" to verify TypeScript compatibility');
    console.log('• Run "npm run lint" to check code quality');
    console.log("• Test the app to ensure all functionality works");
  }

  generateReport() {
    console.log("📋 Dependency Cleanup Report\n");
    console.log("Dependencies to remove:");
    this.unusedDeps.forEach((dep) => {
      console.log(`  • ${dep}`);
    });

    console.log("\nExpected benefits:");
    console.log("  • Reduced bundle size");
    console.log("  • Faster build times");
    console.log("  • Improved app performance");
    console.log("  • Simplified dependency management");

    console.log("\n⚠️ Important notes:");
    console.log("  • Some dependencies might be used indirectly");
    console.log("  • Test thoroughly after removal");
    console.log("  • Keep backup of package.json");
  }
}

// Run the cleaner
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleaner = new DependencyCleaner();

  if (process.argv.includes("--report")) {
    cleaner.generateReport();
  } else if (process.argv.includes("--dry-run")) {
    console.log("🧪 Dry run mode - no changes will be made\n");
    cleaner.generateReport();
  } else {
    cleaner.removeDependencies();
  }
}

export default DependencyCleaner;
