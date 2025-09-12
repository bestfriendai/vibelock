/* eslint-disable expo/no-dynamic-env-var */
// scripts/verify-env.js
const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log("Verifying environment variables...");

const exampleEnvPath = path.resolve(process.cwd(), ".env.example");
if (!fs.existsSync(exampleEnvPath)) {
  console.error("🛑 FATAL: .env.example file not found. Cannot verify environment.");
  process.exit(1);
}

const exampleEnvContent = fs.readFileSync(exampleEnvPath, "utf-8");

// Extract EXPO_PUBLIC_* keys from .env.example
const requiredKeys = exampleEnvContent
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.startsWith("EXPO_PUBLIC_"))
  .map((line) => line.split("=")[0]);

const missingOrEmpty = [];
for (const key of requiredKeys) {
  const val = process.env[key];
  if (val === undefined || val === null || String(val).trim() === "") {
    missingOrEmpty.push(key);
  }
}

if (missingOrEmpty.length) {
  console.error("🛑 Missing or empty EXPO_PUBLIC_* variables:");
  for (const k of missingOrEmpty) console.error("  -", k);
  console.error("\nAdd values in your .env (see .env.example).");
  process.exit(1);
}

console.log("✅ Environment variables verified successfully.");
