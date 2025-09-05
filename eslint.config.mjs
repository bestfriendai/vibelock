import { FlatCompat } from "@eslint/eslintrc";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Use FlatCompat to translate the existing .eslintrc.js into Flat Config for ESLint v9+
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Load legacy config
const legacyConfig = require("./.eslintrc.js");

export default [
  // Optional global ignores
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  // Translate legacy config into Flat Config
  ...compat.config(legacyConfig),
];
