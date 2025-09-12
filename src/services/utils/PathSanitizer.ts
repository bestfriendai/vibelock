import { AppError, ErrorType } from "../../types/error";

/**
 * Utility class for sanitizing and validating file paths
 */
export class PathSanitizer {
  /**
   * Regular expression for detecting path traversal attempts
   */
  private static readonly PATH_TRAVERSAL_REGEX = /\.\.[/\\]/;

  /**
   * Regular expression for detecting invalid characters in file names
   */
  private static readonly INVALID_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/;

  /**
   * Regular expression for detecting reserved file names in Windows
   */
  private static readonly RESERVED_NAMES_REGEX = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  /**
   * Maximum path length
   */
  private static readonly MAX_PATH_LENGTH = 260;

  /**
   * Sanitize a file path to prevent directory traversal and other security issues
   */
  static sanitizePath(path: string): string {
    if (!path || typeof path !== "string") {
      throw new AppError("Invalid path", ErrorType.VALIDATION, "INVALID_PATH", 400);
    }

    // Check for path traversal attempts
    if (this.PATH_TRAVERSAL_REGEX.test(path)) {
      throw new AppError("Path traversal detected", ErrorType.VALIDATION, "PATH_TRAVERSAL", 400);
    }

    // Normalize path separators
    let sanitized = path.replace(/[\\/]+/g, "/");

    // Remove leading and trailing slashes
    sanitized = sanitized.replace(/^\/+|\/+$/g, "");

    // Split path into segments and sanitize each segment
    const segments = sanitized.split("/");
    const sanitizedSegments = segments.map((segment) => this.sanitizeSegment(segment));

    // Rejoin the segments
    sanitized = sanitizedSegments.join("/");

    // Validate the final path length
    if (sanitized.length > this.MAX_PATH_LENGTH) {
      throw new AppError("Path too long", ErrorType.VALIDATION, "PATH_TOO_LONG", 400);
    }

    return sanitized;
  }

  /**
   * Sanitize a single path segment
   */
  private static sanitizeSegment(segment: string): string {
    if (!segment) {
      throw new AppError("Empty path segment", ErrorType.VALIDATION, "INVALID_PATH_SEGMENT", 400);
    }

    // Check for invalid characters
    if (this.INVALID_CHARS_REGEX.test(segment)) {
      throw new AppError("Invalid characters in path", ErrorType.VALIDATION, "INVALID_PATH_CHARS", 400);
    }

    // Check for reserved names (Windows)
    if (this.RESERVED_NAMES_REGEX.test(segment)) {
      throw new AppError("Reserved file name", ErrorType.VALIDATION, "RESERVED_FILENAME", 400);
    }

    // Remove leading and trailing spaces and dots
    let sanitized = segment.trim().replace(/^\.+|\.+$/g, "");

    // Ensure the segment is not empty after sanitization
    if (!sanitized) {
      throw new AppError("Invalid path segment", ErrorType.VALIDATION, "INVALID_PATH_SEGMENT", 400);
    }

    return sanitized;
  }

  /**
   * Generate a safe file name from a string
   */
  static generateSafeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      throw new AppError("Invalid file name", ErrorType.VALIDATION, "INVALID_FILENAME", 400);
    }

    // Remove invalid characters
    let safeName = fileName.replace(this.INVALID_CHARS_REGEX, "_");

    // Remove leading and trailing spaces and dots
    safeName = safeName.trim().replace(/^\.+|\.+$/g, "");

    // Check for reserved names
    if (this.RESERVED_NAMES_REGEX.test(safeName)) {
      safeName = `_${safeName}`;
    }

    // Ensure the file name is not empty
    if (!safeName) {
      safeName = "unnamed_file";
    }

    // Ensure the file name has an extension
    if (!safeName.includes(".")) {
      safeName += ".file";
    }

    return safeName;
  }

  /**
   * Join path segments safely
   */
  static joinPaths(...segments: string[]): string {
    // Filter out empty segments
    const validSegments = segments.filter((segment) => segment && typeof segment === "string");

    if (validSegments.length === 0) {
      return "";
    }

    // Sanitize each segment
    const sanitizedSegments = validSegments.map((segment) => this.sanitizeSegment(segment));

    // Join the segments with forward slashes
    return sanitizedSegments.join("/");
  }

  /**
   * Get the file extension from a path
   */
  static getFileExtension(path: string): string {
    if (!path || typeof path !== "string") {
      return "";
    }

    const sanitized = this.sanitizePath(path);
    const lastDotIndex = sanitized.lastIndexOf(".");

    if (lastDotIndex === -1 || lastDotIndex === sanitized.length - 1) {
      return "";
    }

    return sanitized.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * Get the file name from a path
   */
  static getFileName(path: string): string {
    if (!path || typeof path !== "string") {
      return "";
    }

    const sanitized = this.sanitizePath(path);
    const lastSlashIndex = sanitized.lastIndexOf("/");

    if (lastSlashIndex === -1) {
      return sanitized;
    }

    return sanitized.substring(lastSlashIndex + 1);
  }

  /**
   * Get the directory path from a file path
   */
  static getDirectoryPath(path: string): string {
    if (!path || typeof path !== "string") {
      return "";
    }

    const sanitized = this.sanitizePath(path);
    const lastSlashIndex = sanitized.lastIndexOf("/");

    if (lastSlashIndex === -1) {
      return "";
    }

    return sanitized.substring(0, lastSlashIndex);
  }
}
