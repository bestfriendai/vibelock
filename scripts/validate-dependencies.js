#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of required webpack-related packages for Expo web builds
const requiredPackages = [
  "webpack",
  "@types/eslint-scope",
  "@webassemblyjs/ast",
  "@webassemblyjs/wasm-edit",
  "@webassemblyjs/wasm-parser",
  "acorn-import-phases",
  "chrome-trace-event",
  "enhanced-resolve",
  "es-module-lexer",
  "eslint-scope",
  "events",
  "glob-to-regexp",
  "loader-runner",
  "schema-utils",
  "tapable",
  "terser-webpack-plugin",
  "watchpack"
];

console.log("🔍 Validating dependencies...");

try {
  // Check if package-lock.json exists
  if (!fs.existsSync("package-lock.json")) {
    throw new Error("package-lock.json not found. Run npm install first.");
  }

  // Read and parse lock file
  const lockfile = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));

  if (!lockfile.packages) {
    throw new Error("Invalid package-lock.json format");
  }

  // Check for required packages
  const missingPackages = [];
  const foundPackages = [];

  for (const pkg of requiredPackages) {
    const found = Object.keys(lockfile.packages).some((lockPkg) => {
      return lockPkg === `node_modules/${pkg}` || lockPkg.includes(`/${pkg}`);
    });

    if (found) {
      foundPackages.push(pkg);
    } else {
      missingPackages.push(pkg);
    }
  }

  console.log(`✅ Found ${foundPackages.length} required packages`);

  if (missingPackages.length > 0) {
    console.warn("⚠️  Missing packages:", missingPackages);
    console.log("💡 These packages may be resolved as transitive dependencies");
  }

  // Check package.json for explicit webpack dependency
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const hasWebpackDep = packageJson.devDependencies && packageJson.devDependencies.webpack;

  if (hasWebpackDep) {
    console.log("✅ Webpack explicitly declared in devDependencies");
  } else {
    console.warn("⚠️  Webpack not explicitly declared in package.json");
  }

  console.log("🎉 Dependency validation completed!");

} catch (error) {
  console.error("❌ Validation failed:", error.message);
  process.exit(1);
}
