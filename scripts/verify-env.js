#!/usr/bin/env node
/*
 Verifies required environment variables are present for local development.
 Usage: node scripts/verify-env.js
*/

require("dotenv").config();

const REQUIRED = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];
const OPTIONAL = [
  "EXPO_PUBLIC_PROJECT_ID", // needed for Expo push; optional otherwise
];

const missing = REQUIRED.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");

if (missing.length) {
  console.error("❌ Missing environment variables:");
  missing.forEach((k) => console.error(`  - ${k}`));
  console.error("\nFix: copy `.env.example` to `.env` and fill the values.");
  process.exit(1);
}

// Optional warnings
const optionalMissing = OPTIONAL.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
if (optionalMissing.length) {
  console.warn("⚠️ Optional environment variables missing:");
  optionalMissing.forEach((k) => console.warn(`  - ${k}`));
  console.warn("   These are only needed for features like push notifications.");
}

console.log("✅ Environment looks good.");
