#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔧 Generating package-lock.json...");

try {
  // Remove existing lock file and node_modules to ensure clean state
  if (fs.existsSync("package-lock.json")) {
    fs.unlinkSync("package-lock.json");
    console.log("✅ Removed existing package-lock.json");
  }

  if (fs.existsSync("node_modules")) {
    execSync("rm -rf node_modules", { stdio: "inherit" });
    console.log("✅ Removed existing node_modules");
  }

  // Generate new lock file
  console.log("📦 Installing dependencies and generating lock file...");
  execSync("npm install", { stdio: "inherit" });

  // Verify lock file was created
  if (fs.existsSync("package-lock.json")) {
    console.log("✅ package-lock.json generated successfully");

    // Validate that webpack dependencies are included
    const lockfile = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
    const webpackExists = lockfile.packages &&
      Object.keys(lockfile.packages).some((pkg) => pkg.includes("webpack"));

    if (webpackExists) {
      console.log("✅ Webpack dependencies found in lock file");
    } else {
      console.warn("⚠️  Webpack dependencies not found in lock file");
    }
  } else {
    throw new Error("Failed to generate package-lock.json");
  }

  console.log("🎉 Lock file generation completed successfully!");
} catch (error) {
  console.error("❌ Error generating lock file:", error.message);
  process.exit(1);
}
