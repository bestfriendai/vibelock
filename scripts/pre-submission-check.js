#!/usr/bin/env node
/*
  Pre-submission verification script
  - Extends existing production verification with asset and config checks
*/

const fs = require("fs");
const path = require("path");

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (!exists) {
    throw new Error(`Missing ${description}: ${filePath}`);
  }
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function main() {
  console.log("Running pre-submission checks...");

  // 1) Ensure assets exist
  checkFileExists(path.resolve("assets/icon-1024.png"), "1024x1024 marketing icon");
  checkFileExists(path.resolve("app-store-assets/screenshots/ios"), "iOS screenshots directory");
  checkFileExists(path.resolve("app-store-assets/screenshots/android"), "Android screenshots directory");

  // 2) Validate app.config.js bundle identifiers indirectly by presence
  const appConfigPath = path.resolve("app.config.js");
  checkFileExists(appConfigPath, "app.config.js");
  const appConfig = fs.readFileSync(appConfigPath, "utf-8");
  if (!/bundleIdentifier\s*:\s*['"`][^'"`]+['"`]/.test(appConfig)) {
    console.warn("Warning: iOS bundleIdentifier not found in app.config.js");
  }
  if (!/applicationId\s*:\s*['"`][^'"`]+['"`]/.test(appConfig)) {
    console.warn("Warning: Android applicationId not found in app.config.js");
  }

  // 3) Verify privacy URLs exist in config
  if (!/privacyPolicyUrl|termsOfServiceUrl/.test(appConfig)) {
    console.warn("Warning: Privacy policy or terms of service URL not found in app config");
  }

  // 4) Ensure no TODOs in production src
  const rg = require("child_process").spawnSync("bash", ["-lc", "rg -n --hidden --glob '!node_modules' 'TODO' src || true"]);
  const todoOutput = rg.stdout?.toString() || "";
  if (todoOutput.trim().length > 0) {
    console.warn("TODOs found in source files:\n" + todoOutput);
  }

  console.log("Pre-submission checks completed.");
}

main().catch((err) => {
  console.error("Pre-submission checks failed:", err.message || err);
  process.exit(1);
});

