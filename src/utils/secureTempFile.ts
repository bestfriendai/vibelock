/**
 * Secure temporary file utilities
 * Wraps the vulnerable tmp package with security measures
 * to prevent arbitrary file/directory write via symbolic links
 */

import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, realpathSync, lstatSync } from "fs";
import { randomBytes } from "crypto";

// Security configuration
const SECURITY_CONFIG = {
  MAX_TEMP_FILES: 100,
  MAX_TEMP_DIR_DEPTH: 10,
  ALLOWED_PREFIXES: ["tmp_", "temp_", "cache_"],
  DISALLOWED_PATTERNS: ["..", "~", "/", "\\"],
};

// Track created temp files for cleanup
const tempFiles = new Set<string>();

/**
 * Validates a path to prevent directory traversal and symlink attacks
 */
function validatePath(path: string): boolean {
  // Check for disallowed patterns
  for (const pattern of SECURITY_CONFIG.DISALLOWED_PATTERNS) {
    if (path.includes(pattern)) {
      return false;
    }
  }

  // Check path depth
  const depth = path.split("/").filter(Boolean).length;
  if (depth > SECURITY_CONFIG.MAX_TEMP_DIR_DEPTH) {
    return false;
  }

  // Ensure path is within temp directory
  const tempDir = realpathSync(tmpdir());
  const resolvedPath = realpathSync(path);

  return resolvedPath.startsWith(tempDir);
}

/**
 * Creates a secure temporary directory
 */
export function createSecureTempDir(prefix?: string): string {
  // Validate prefix
  const safePrefix = prefix && SECURITY_CONFIG.ALLOWED_PREFIXES.some((p) => prefix.startsWith(p)) ? prefix : "tmp_";

  // Generate secure random suffix
  const randomSuffix = randomBytes(8).toString("hex");
  const dirName = `${safePrefix}${randomSuffix}`;

  // Create directory
  const tempDir = join(tmpdir(), dirName);

  // Security validation
  if (!validatePath(tempDir)) {
    throw new Error("Invalid temporary directory path");
  }

  // Create directory
  mkdirSync(tempDir, { recursive: true });

  // Verify it's actually a directory (not a symlink)
  const stats = lstatSync(tempDir);
  if (!stats.isDirectory()) {
    throw new Error("Temporary path is not a directory");
  }

  // Track for cleanup
  tempFiles.add(tempDir);

  // Enforce limits
  if (tempFiles.size > SECURITY_CONFIG.MAX_TEMP_FILES) {
    cleanupTempFiles();
  }

  return tempDir;
}

/**
 * Creates a secure temporary file
 */
export function createSecureTempFile(prefix?: string, extension?: string): string {
  const tempDir = createSecureTempDir(prefix);
  const randomName = randomBytes(8).toString("hex");
  const fileName = extension ? `${randomName}.${extension}` : randomName;

  const filePath = join(tempDir, fileName);

  // Security validation
  if (!validatePath(filePath)) {
    throw new Error("Invalid temporary file path");
  }

  tempFiles.add(filePath);
  return filePath;
}

/**
 * Cleans up temporary files
 */
export function cleanupTempFiles(): void {
  const { rmSync } = require("fs");

  for (const filePath of tempFiles) {
    try {
      if (existsSync(filePath)) {
        rmSync(filePath, { recursive: true, force: true });
      }
    } catch (error) {
      // Log but don't throw - cleanup should be best effort
    }
  }

  tempFiles.clear();
}

/**
 * Secure wrapper for tmp package functionality
 */
export const secureTmp = {
  dir: (options?: any) => {
    const prefix = options?.prefix || "tmp_";
    const path = createSecureTempDir(prefix);
    return { name: path, removeCallback: () => cleanupTempFiles() };
  },

  file: (options?: any) => {
    const prefix = options?.prefix || "tmp_";
    const extension = options?.postfix ? options.postfix.replace(".", "") : undefined;
    const path = createSecureTempFile(prefix, extension);
    return { name: path, removeCallback: () => cleanupTempFiles() };
  },

  cleanup: cleanupTempFiles,
};
