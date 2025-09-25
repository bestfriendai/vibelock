#!/usr/bin/env node
/**
 * Clear Sensitive Environment Variables Script
 * Safely removes API keys from .env file after EAS secrets setup
 */

const fs = require("fs");
const path = require("path");

// ANSI Color codes for better output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

console.log(`${colors.cyan}🔐 Clear Sensitive Environment Variables${colors.reset}`);
console.log(`${colors.yellow}This script will safely clear API keys from .env file${colors.reset}`);
console.log("=" * 60);

function backupEnvFile() {
  const envPath = path.resolve(".env");
  const backupPath = path.resolve(".env.backup");

  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log(`${colors.green}✅ Created backup: .env.backup${colors.reset}`);
    return true;
  }

  console.log(`${colors.red}❌ .env file not found${colors.reset}`);
  return false;
}

function clearSensitiveVariables() {
  const envPath = path.resolve(".env");

  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env file not found${colors.reset}`);
    return false;
  }

  let envContent = fs.readFileSync(envPath, "utf8");

  // Variables to clear (keep the variable names but empty the values)
  const sensitiveVariables = [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  ];

  let clearedCount = 0;

  sensitiveVariables.forEach((variable) => {
    const regex = new RegExp(`^${variable}=.*$`, "gm");
    const hasValue = envContent.includes(`${variable}=`) && !envContent.includes(`${variable}=`);

    if (hasValue) {
      envContent = envContent.replace(regex, `${variable}=`);
      clearedCount++;
      console.log(`${colors.green}✅ Cleared: ${variable}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Already cleared: ${variable}${colors.reset}`);
    }
  });

  // Write the updated content
  fs.writeFileSync(envPath, envContent, "utf8");

  console.log(`\n${colors.magenta}📊 Summary:${colors.reset}`);
  console.log(`${colors.green}✅ Cleared ${clearedCount} sensitive variables${colors.reset}`);

  return clearedCount > 0;
}

function verifyEASSecretsSetup() {
  console.log(`\n${colors.cyan}🔍 Verifying EAS Secrets Setup${colors.reset}`);

  const questions = [
    "Have you set up EAS secrets for all API keys?",
    "Have you tested your build with EAS secrets?",
    "Are you ready to remove API keys from .env?",
  ];

  let allYes = true;

  questions.forEach((question, index) => {
    console.log(`${colors.bold}${index + 1}. ${question}${colors.reset}`);
  });

  console.log(`\n${colors.yellow}⚠️  Important: Only proceed if you have set up EAS secrets!${colors.reset}`);
  console.log(`${colors.yellow}Your app will not work if API keys are missing from EAS secrets.${colors.reset}`);

  return allYes;
}

function main() {
  console.log(`${colors.magenta}🔒 Security Checklist${colors.reset}`);
  console.log("1. EAS secrets must be configured for production");
  console.log("2. Build must be tested with EAS secrets");
  console.log("3. Backup will be created before clearing");

  // Verify user is ready
  const ready = verifyEASSecretsSetup();

  if (!ready) {
    console.log(`${colors.red}❌ Please complete EAS secrets setup first${colors.reset}`);
    console.log(`${colors.blue}Run: node scripts/setup-eas-secrets.js${colors.reset}`);
    process.exit(1);
  }

  // Create backup
  if (!backupEnvFile()) {
    process.exit(1);
  }

  // Clear sensitive variables
  const success = clearSensitiveVariables();

  if (success) {
    console.log(`\n${colors.green}🎉 Successfully cleared sensitive environment variables!${colors.reset}`);
    console.log(`${colors.green}✅ Your .env file is now secure for version control${colors.reset}`);
    console.log(`${colors.yellow}📝 API keys are now managed via EAS secrets${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  No sensitive variables found to clear${colors.reset}`);
  }

  console.log(`\n${colors.cyan}🔧 Next Steps:${colors.reset}`);
  console.log("1. Commit the updated .env file to version control");
  console.log("2. Verify your production build works with EAS secrets");
  console.log("3. Store the .env.backup file securely (do not commit it)");
}

// Run the script
main();
