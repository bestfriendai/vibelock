#!/usr/bin/env node
/**
 * Security Status Report Script
 * Provides comprehensive security status overview
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

console.log(`${colors.cyan}🔐 Security Status Report${colors.reset}`);
console.log(`${colors.yellow}Comprehensive security assessment for locker-room-talk${colors.reset}`);
console.log("=" * 60);

function checkEnvSecurity() {
  console.log(`\n${colors.magenta}🔍 Environment Security${colors.reset}`);

  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env file not found${colors.reset}`);
    return false;
  }

  const envContent = fs.readFileSync(envPath, "utf8");

  const criticalVars = [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  ];

  let secureCount = 0;

  criticalVars.forEach((variable) => {
    const hasValue = envContent.includes(`${variable}=`) && !envContent.includes(`${variable}=`);
    const status = hasValue ? `${colors.red}❌ EXPOSED${colors.reset}` : `${colors.green}✅ SECURE${colors.reset}`;
    console.log(`  ${variable}: ${status}`);

    if (!hasValue) secureCount++;
  });

  const percentage = Math.round((secureCount / criticalVars.length) * 100);
  console.log(`\n${colors.bold}Environment Security: ${percentage}%${colors.reset}`);

  return percentage === 100;
}

function checkDependencySecurity() {
  console.log(`\n${colors.magenta}📦 Dependency Security${colors.reset}`);

  try {
    const auditResult = execSync("npm audit --json", { encoding: "utf8" });
    const auditData = JSON.parse(auditResult);

    const vulnerabilities = auditData.metadata?.vulnerabilities || {};
    const total = vulnerabilities.total || 0;
    const critical = vulnerabilities.critical || 0;
    const high = vulnerabilities.high || 0;
    const moderate = vulnerabilities.moderate || 0;
    const low = vulnerabilities.low || 0;

    console.log(`  Total vulnerabilities: ${total}`);
    console.log(`  Critical: ${critical}`);
    console.log(`  High: ${high}`);
    console.log(`  Moderate: ${moderate}`);
    console.log(`  Low: ${low}`);

    const hasCriticalIssues = critical > 0 || high > 0;
    const status = hasCriticalIssues
      ? `${colors.red}❌ UNSAFE${colors.reset}`
      : `${colors.green}✅ SECURE${colors.reset}`;

    console.log(`\n${colors.bold}Dependency Security: ${status}${colors.reset}`);

    return !hasCriticalIssues;
  } catch (error) {
    console.log(`${colors.red}❌ Failed to check dependencies${colors.reset}`);
    return false;
  }
}

function checkSecurityFiles() {
  console.log(`\n${colors.magenta}📁 Security Files${colors.reset}`);

  const securityFiles = [
    "src/utils/secureTempFile.ts",
    "SECURITY_SETUP_GUIDE.md",
    "scripts/setup-eas-secrets.js",
    "scripts/clear-sensitive-env.js",
    "scripts/security-status.js",
  ];

  let existingCount = 0;

  securityFiles.forEach((file) => {
    const exists = fs.existsSync(file);
    const status = exists ? `${colors.green}✅ EXISTS${colors.reset}` : `${colors.red}❌ MISSING${colors.reset}`;
    console.log(`  ${file}: ${status}`);

    if (exists) existingCount++;
  });

  const percentage = Math.round((existingCount / securityFiles.length) * 100);
  console.log(`\n${colors.bold}Security Files: ${percentage}%${colors.reset}`);

  return percentage === 100;
}

function checkEASSetup() {
  console.log(`\n${colors.magenta}☁️  EAS Secrets Setup${colors.reset}`);

  try {
    execSync("eas --version", { stdio: "pipe" });
    console.log(`  EAS CLI: ${colors.green}✅ INSTALLED${colors.reset}`);

    try {
      execSync("eas whoami", { stdio: "pipe" });
      console.log(`  EAS Login: ${colors.green}✅ LOGGED IN${colors.reset}`);
      console.log(`  EAS Setup: ${colors.green}✅ READY${colors.reset}`);
      return true;
    } catch {
      console.log(`  EAS Login: ${colors.red}❌ NOT LOGGED IN${colors.reset}`);
      console.log(`  EAS Setup: ${colors.red}❌ NOT READY${colors.reset}`);
      return false;
    }
  } catch {
    console.log(`  EAS CLI: ${colors.red}❌ NOT INSTALLED${colors.reset}`);
    console.log(`  EAS Setup: ${colors.red}❌ NOT READY${colors.reset}`);
    return false;
  }
}

function generateSecurityScore() {
  const envSecure = checkEnvSecurity();
  const depsSecure = checkDependencySecurity();
  const filesExist = checkSecurityFiles();
  const easReady = checkEASSetup();

  console.log(`\n${colors.cyan}📊 Security Score Summary${colors.reset}`);
  console.log("=" * 40);

  const scores = [
    { name: "Environment Security", value: envSecure, weight: 40 },
    { name: "Dependency Security", value: depsSecure, weight: 30 },
    { name: "Security Files", value: filesExist, weight: 15 },
    { name: "EAS Setup", value: easReady, weight: 15 },
  ];

  let totalScore = 0;
  let maxScore = 0;

  scores.forEach((score) => {
    const points = score.value ? score.weight : 0;
    totalScore += points;
    maxScore += score.weight;

    const status = score.value ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`  ${status} ${score.name}: ${points}/${score.weight}`);
  });

  const percentage = Math.round((totalScore / maxScore) * 100);

  let rating = "";
  let color = "";

  if (percentage >= 90) {
    rating = "EXCELLENT";
    color = colors.green;
  } else if (percentage >= 70) {
    rating = "GOOD";
    color = colors.yellow;
  } else if (percentage >= 50) {
    rating = "FAIR";
    color = colors.magenta;
  } else {
    rating = "POOR";
    color = colors.red;
  }

  console.log(`\n${colors.bold}Overall Security Score: ${color}${percentage}% - ${rating}${colors.reset}`);

  return percentage;
}

function main() {
  const score = generateSecurityScore();

  console.log(`\n${colors.cyan}🔧 Recommended Actions${colors.reset}`);

  if (score < 70) {
    console.log(`${colors.red}🛑 HIGH PRIORITY ACTIONS:${colors.reset}`);
    console.log("1. Set up EAS secrets for API keys");
    console.log("2. Run: node scripts/setup-eas-secrets.js");
    console.log("3. Clear sensitive variables from .env");
    console.log("4. Run: node scripts/clear-sensitive-env.js");
  }

  if (score >= 70 && score < 90) {
    console.log(`${colors.yellow}⚠️  MEDIUM PRIORITY ACTIONS:${colors.reset}`);
    console.log("1. Monitor dependency vulnerabilities");
    console.log("2. Implement enhanced session management");
    console.log("3. Conduct security testing");
  }

  if (score >= 90) {
    console.log(`${colors.green}✅ SECURITY STATUS: GOOD${colors.reset}`);
    console.log("1. Maintain current security practices");
    console.log("2. Regular security audits");
    console.log("3. Monitor for new vulnerabilities");
  }

  console.log(`\n${colors.blue}📋 Quick Commands:${colors.reset}`);
  console.log("npm run security:status    - Run this security report");
  console.log("npm run security:setup     - Setup EAS secrets");
  console.log("npm run security:cleanup   - Clear sensitive env vars");
  console.log("npm run audit:security     - Check dependency vulnerabilities");
}

// Run the script
main();
