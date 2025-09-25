#!/usr/bin/env node
/**
 * EAS Secrets Setup Script
 * Guides user through setting up secure API key management
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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

console.log(`${colors.cyan}🔐 EAS Secrets Setup Guide${colors.reset}`);
console.log(`${colors.yellow}This script will help you secure your API keys using EAS secrets${colors.reset}`);
console.log("=" * 60);

// Check if eas-cli is installed
function checkEASCLI() {
  try {
    execSync("eas --version", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if user is logged in to EAS
function checkEASLogin() {
  try {
    execSync("eas whoami", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Get current project info
function getProjectInfo() {
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

    return {
      name: packageJson.name,
      version: packageJson.version,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    };
  } catch (error) {
    return null;
  }
}

// Display security status
function displaySecurityStatus() {
  console.log(`\n${colors.magenta}🔍 Current Security Status${colors.reset}`);

  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");

    const criticalVars = [
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_FIREBASE_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    ];

    criticalVars.forEach((variable) => {
      const hasValue = envContent.includes(`${variable}=`) && !envContent.includes(`${variable}=`);

      const status = hasValue ? `${colors.red}❌ EXPOSED${colors.reset}` : `${colors.green}✅ SECURE${colors.reset}`;
      console.log(`  ${variable}: ${status}`);
    });
  }
}

// Generate EAS secret commands
function generateEASCommands() {
  const commands = [
    {
      name: "Supabase URL",
      variable: "EXPO_PUBLIC_SUPABASE_URL",
      example: "https://your-project.supabase.co",
      command: "eas secret:set --scope project EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here",
    },
    {
      name: "Supabase Anon Key",
      variable: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      command: "eas secret:set --scope project EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key_here",
    },
    {
      name: "Firebase API Key",
      variable: "EXPO_PUBLIC_FIREBASE_API_KEY",
      example: "AIzaSyB...",
      command: "eas secret:set --scope project EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_key_here",
    },
    {
      name: "RevenueCat iOS Key",
      variable: "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      example: "appl_...",
      command: "eas secret:set --scope project EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_key_here",
    },
    {
      name: "RevenueCat Android Key",
      variable: "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
      example: "goog_...",
      command: "eas secret:set --scope project EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key_here",
    },
  ];

  return commands;
}

// Main execution
function main() {
  // Check prerequisites
  if (!checkEASCLI()) {
    console.log(`${colors.red}❌ EAS CLI is not installed.${colors.reset}`);
    console.log(`${colors.yellow}Install it with: npm install -g @expo/eas-cli${colors.reset}`);
    process.exit(1);
  }

  if (!checkEASLogin()) {
    console.log(`${colors.red}❌ Not logged in to EAS.${colors.reset}`);
    console.log(`${colors.yellow}Login with: eas login${colors.reset}`);
    process.exit(1);
  }

  const projectInfo = getProjectInfo();
  if (projectInfo) {
    console.log(`${colors.green}✅ Project: ${projectInfo.name} v${projectInfo.version}${colors.reset}`);
  }

  displaySecurityStatus();

  console.log(`\n${colors.cyan}📋 EAS Secrets Setup Commands${colors.reset}`);
  console.log("=" * 50);

  const commands = generateEASCommands();
  commands.forEach((cmd, index) => {
    console.log(`\n${colors.bold}${index + 1}. ${cmd.name}${colors.reset}`);
    console.log(`   Variable: ${cmd.variable}`);
    console.log(`   Example: ${cmd.example}`);
    console.log(`   Command: ${colors.blue}${cmd.command}${colors.reset}`);
  });

  console.log(`\n${colors.yellow}⚠️  Important Notes:${colors.reset}`);
  console.log("1. Run these commands one by one");
  console.log("2. Replace the placeholder values with your actual API keys");
  console.log("3. After setting all secrets, remove the actual keys from .env file");
  console.log("4. Test your build to ensure secrets are working correctly");

  console.log(`\n${colors.green}✅ After completing EAS secrets setup:${colors.reset}`);
  console.log("1. Your .env file should have empty values for these variables");
  console.log("2. API keys will be securely injected during build time");
  console.log("3. Your app will be production-ready and secure");

  console.log(`\n${colors.magenta}🔧 Automated Cleanup (Optional)${colors.reset}`);
  console.log("Run the following command to clear API keys from .env:");
  console.log(`${colors.blue}node scripts/clear-sensitive-env.js${colors.reset}`);
}

// Run the script
main();
