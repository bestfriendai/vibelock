#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 1. Remove console.logs from source files
const removeConsoleLogs = (dir) => {
  const files = fs.readdirSync(dir);
  let count = 0;

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes("node_modules") && !filePath.includes(".git")) {
      count += removeConsoleLogs(filePath);
    } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
      let content = fs.readFileSync(filePath, "utf8");
      const originalLength = content.length;

      // Remove console statements but keep error logs for debugging
      content = content.replace(/console\.(log|debug|info|warn)\([^)]*\);?\s*/g, "");

      if (content.length !== originalLength) {
        fs.writeFileSync(filePath, content);
        count++;
      }
    }
  });

  return count;
};

// 2. Update version in app.json
const updateVersion = () => {
  const appJsonPath = path.join(__dirname, "..", "app.json");
  const packageJsonPath = path.join(__dirname, "..", "package.json");

  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    appJson.expo.version = "1.0.0";
    appJson.expo.ios.buildNumber = "1";
    appJson.expo.android.versionCode = 1;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log("✅ Updated app.json version to 1.0.0");
  }

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    packageJson.version = "1.0.0";
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Updated package.json version to 1.0.0");
  }
};

// 3. Check for hardcoded API keys
const checkForHardcodedKeys = (dir) => {
  const suspiciousPatterns = [
    /sk-[a-zA-Z0-9]{32,}/g, // OpenAI keys
    /sk_live_[a-zA-Z0-9]{32,}/g, // Stripe keys
    /AIza[a-zA-Z0-9]{35}/g, // Google API keys
    /xox[baprs]-[a-zA-Z0-9-]{10,}/g, // Slack tokens
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
    /eyJ[a-zA-Z0-9=_-]+\.[a-zA-Z0-9=_-]+\.[a-zA-Z0-9=_-]+/g, // JWT tokens
  ];

  const issues = [];

  const searchDir = (currentDir) => {
    const files = fs.readdirSync(currentDir);

    files.forEach((file) => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !filePath.includes("node_modules") &&
        !filePath.includes(".git") &&
        !filePath.includes("coverage")
      ) {
        searchDir(filePath);
      } else if (file.match(/\.(js|jsx|ts|tsx|json)$/) && !file.includes(".env")) {
        const content = fs.readFileSync(filePath, "utf8");

        suspiciousPatterns.forEach((pattern) => {
          const matches = content.match(pattern);
          if (matches) {
            issues.push({
              file: filePath.replace(process.cwd() + "/", ""),
              pattern: pattern.toString(),
              matches: matches.slice(0, 3), // Show first 3 matches
            });
          }
        });
      }
    });
  };

  searchDir(dir);
  return issues;
};

// 4. Check required files exist
const checkRequiredFiles = () => {
  const required = [
    { path: "assets/icon-1024.png", description: "App Store icon (1024x1024)" },
    { path: ".env.production", description: "Production environment variables" },
    { path: ".gitignore", description: "Git ignore file" },
  ];

  const missing = [];
  const found = [];

  required.forEach((file) => {
    const fullPath = path.join(__dirname, "..", file.path);
    if (fs.existsSync(fullPath)) {
      found.push(file);
    } else {
      missing.push(file);
    }
  });

  return { missing, found };
};

// 5. Validate environment variables
const validateEnvVars = () => {
  const envPath = path.join(__dirname, "..", ".env.production");
  const issues = [];

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");

    // Check for EXPO_PUBLIC_ variables that shouldn't be public
    const publicKeys = content.match(/EXPO_PUBLIC_.*_KEY=.*/g);
    if (publicKeys) {
      publicKeys.forEach((key) => {
        if (key.includes("SECRET") || key.includes("PRIVATE")) {
          issues.push(`⚠️  Sensitive key exposed as public: ${key.split("=")[0]}`);
        }
      });
    }

    // Check for placeholder values
    if (content.includes("your_") || content.includes("YOUR_") || content.includes("xxx")) {
      issues.push("⚠️  Placeholder values found in .env.production");
    }
  } else {
    issues.push("❌ .env.production file not found");
  }

  return issues;
};

// 6. Check .gitignore for security
const checkGitIgnore = () => {
  const gitignorePath = path.join(__dirname, "..", ".gitignore");
  const requiredEntries = [
    ".env*",
    "google-services.json",
    "GoogleService-Info.plist",
    "*.keystore",
    "*.jks",
    "*.p8",
    "*.p12",
    "*.mobileprovision",
  ];

  const missing = [];

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf8");

    requiredEntries.forEach((entry) => {
      if (!content.includes(entry.replace("*", ""))) {
        missing.push(entry);
      }
    });
  } else {
    missing.push(...requiredEntries);
  }

  return missing;
};

// Main execution
console.log("🚀 Preparing app for store submission...\n");
console.log("=".repeat(50));

// Remove console logs
console.log("\n📝 Removing console.log statements...");
const srcPath = path.join(__dirname, "..", "src");
if (fs.existsSync(srcPath)) {
  const filesModified = removeConsoleLogs(srcPath);
  console.log(`✅ Removed console statements from ${filesModified} files`);
} else {
  console.log("⚠️  src directory not found");
}

// Update version
console.log("\n📦 Updating version numbers...");
updateVersion();

// Check for hardcoded keys
console.log("\n🔍 Checking for hardcoded API keys...");
const hardcodedKeys = checkForHardcodedKeys(path.join(__dirname, "..", "src"));
if (hardcodedKeys.length > 0) {
  console.log("❌ Found potential hardcoded keys:");
  hardcodedKeys.forEach((issue) => {
    console.log(`  File: ${issue.file}`);
    console.log(`  Pattern: ${issue.pattern}`);
    console.log(`  Matches: ${issue.matches.join(", ")}`);
  });
} else {
  console.log("✅ No hardcoded API keys found");
}

// Check required files
console.log("\n📋 Checking required files...");
const { missing, found } = checkRequiredFiles();
if (found.length > 0) {
  found.forEach((file) => {
    console.log(`✅ ${file.description}: ${file.path}`);
  });
}
if (missing.length > 0) {
  console.log("\n❌ Missing required files:");
  missing.forEach((file) => {
    console.log(`  - ${file.description}: ${file.path}`);
  });
}

// Validate environment variables
console.log("\n🔐 Validating environment variables...");
const envIssues = validateEnvVars();
if (envIssues.length > 0) {
  envIssues.forEach((issue) => console.log(issue));
} else {
  console.log("✅ Environment variables look good");
}

// Check .gitignore
console.log("\n🛡️ Checking .gitignore for security...");
const missingGitignore = checkGitIgnore();
if (missingGitignore.length > 0) {
  console.log("⚠️  Add these to .gitignore:");
  missingGitignore.forEach((entry) => console.log(`  - ${entry}`));
} else {
  console.log("✅ .gitignore properly configured");
}

// Summary
console.log("\n" + "=".repeat(50));
const hasIssues = hardcodedKeys.length > 0 || missing.length > 0 || envIssues.length > 0 || missingGitignore.length > 0;

if (hasIssues) {
  console.log("\n⚠️  Issues found! Please fix before submission:");
  console.log("1. Remove any hardcoded API keys");
  console.log("2. Create missing required files");
  console.log("3. Fix environment variable issues");
  console.log("4. Update .gitignore for security");
  process.exit(1);
} else {
  console.log("\n✅ App preparation complete!");
  console.log("\nNext steps:");
  console.log("1. Create privacy policy and terms of service");
  console.log("2. Prepare app screenshots");
  console.log("3. Run: eas build --platform all --profile production");
  console.log("4. Test on real devices");
  console.log("5. Submit to app stores");
}
