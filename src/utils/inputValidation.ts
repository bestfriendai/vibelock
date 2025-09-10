/**
 * Input validation utilities to prevent XSS, injection attacks, and ensure data integrity
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+))/g,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
  /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
  /exec(\s|\+)+(s|x)p\w+/gi,
];

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
];

/**
 * Check for SQL injection patterns
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== "string") return false;

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Check for XSS patterns
 */
export function detectXSS(input: string): boolean {
  if (typeof input !== "string") return false;

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Escape HTML entities to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/[&<>"'/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Sanitize text input by removing potentially dangerous characters
 */
export function sanitizeText(
  input: string,
  maxLength: number = 1000,
  options: { preventSQLInjection?: boolean; preventXSS?: boolean } = {},
): string {
  if (typeof input !== "string") return "";

  const { preventSQLInjection = true, preventXSS = true } = options;

  // Check for malicious patterns first
  if (preventSQLInjection && detectSQLInjection(input)) {
    throw new Error("Input contains potentially malicious SQL patterns");
  }

  if (preventXSS && detectXSS(input)) {
    throw new Error("Input contains potentially malicious script patterns");
  }

  // Remove null bytes and control characters except newlines and tabs
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize name input
 */
export function validateName(name: string): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof name !== "string") {
    return { isValid: false, sanitized: "", error: "Name must be a string" };
  }

  const sanitized = sanitizeText(name, 50);

  if (sanitized.length === 0) {
    return { isValid: false, sanitized: "", error: "Name is required" };
  }

  if (sanitized.length < 2) {
    return { isValid: false, sanitized, error: "Name must be at least 2 characters" };
  }

  // Check for valid name characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
    return { isValid: false, sanitized, error: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate and sanitize review text
 */
export function validateReviewText(
  text: string,
  maxLength: number = 1000,
): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof text !== "string") {
    return { isValid: false, sanitized: "", error: "Review text must be a string" };
  }

  const sanitized = sanitizeText(text, maxLength);

  if (sanitized.length === 0) {
    return { isValid: false, sanitized: "", error: "Review text is required" };
  }

  if (sanitized.length < 10) {
    return { isValid: false, sanitized, error: "Review must be at least 10 characters" };
  }

  // Check for excessive repeated characters (potential spam)
  if (/(.)\1{10,}/.test(sanitized)) {
    return { isValid: false, sanitized, error: "Review contains excessive repeated characters" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate location input
 */
export function validateLocation(
  city: string,
  state: string,
): { isValid: boolean; sanitizedCity: string; sanitizedState: string; error?: string } {
  const cityResult = validateName(city);
  if (!cityResult.isValid) {
    return { isValid: false, sanitizedCity: "", sanitizedState: "", error: `City: ${cityResult.error}` };
  }

  const sanitizedState = sanitizeText(state, 20).toUpperCase();

  if (sanitizedState.length === 0) {
    return { isValid: false, sanitizedCity: cityResult.sanitized, sanitizedState: "", error: "State is required" };
  }

  // Validate state format (2-letter code or full name)
  if (!/^[A-Z]{2}$/.test(sanitizedState) && !/^[A-Z\s]{3,20}$/.test(sanitizedState)) {
    return { isValid: false, sanitizedCity: cityResult.sanitized, sanitizedState, error: "Invalid state format" };
  }

  return { isValid: true, sanitizedCity: cityResult.sanitized, sanitizedState };
}

/**
 * Validate social media handle
 */
export function validateSocialHandle(
  handle: string,
  platform: string,
): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof handle !== "string") {
    return { isValid: false, sanitized: "", error: "Handle must be a string" };
  }

  // Remove @ symbol if present
  let sanitized = handle.replace(/^@/, "");
  sanitized = sanitizeText(sanitized, 30);

  if (sanitized.length === 0) {
    return { isValid: true, sanitized: "" }; // Optional field
  }

  // Platform-specific validation
  switch (platform.toLowerCase()) {
    case "instagram":
    case "twitter":
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(sanitized)) {
        return { isValid: false, sanitized, error: `Invalid ${platform} handle format` };
      }
      break;
    case "snapchat":
      if (!/^[a-zA-Z0-9._-]{3,15}$/.test(sanitized)) {
        return { isValid: false, sanitized, error: "Invalid Snapchat handle format" };
      }
      break;
    default:
      // Generic validation for other platforms
      if (!/^[a-zA-Z0-9._-]{1,30}$/.test(sanitized)) {
        return { isValid: false, sanitized, error: "Invalid handle format" };
      }
  }

  return { isValid: true, sanitized };
}

/**
 * Validate URL input
 */
export function validateUrl(url: string): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof url !== "string") {
    return { isValid: false, sanitized: "", error: "URL must be a string" };
  }

  const sanitized = sanitizeText(url, 500);

  if (sanitized.length === 0) {
    return { isValid: true, sanitized: "" }; // Optional field
  }

  try {
    const urlObj = new URL(sanitized);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, sanitized, error: "Only HTTP and HTTPS URLs are allowed" };
    }

    return { isValid: true, sanitized: urlObj.toString() };
  } catch {
    return { isValid: false, sanitized, error: "Invalid URL format" };
  }
}

/**
 * Validate search query with enhanced SQL injection prevention
 */
export function validateSearchQuery(query: string): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof query !== "string") {
    return { isValid: false, sanitized: "", error: "Search query must be a string" };
  }

  let sanitized = query.trim();
  if (sanitized.length < 2 || sanitized.length > 50) {
    return { isValid: false, sanitized, error: "Search query must be between 2 and 50 characters." };
  }

  // Enhanced SQL injection patterns
  const sqlPatterns = /(\b(select|insert|update|delete|drop|union|script|exec|--)\b)|[;'"\\<>]/i;
  if (sqlPatterns.test(sanitized)) {
    return { isValid: false, sanitized, error: "Invalid characters in search query." };
  }

  // Remove potentially harmful characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, "");

  return { isValid: true, sanitized };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000,
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter((time) => now - time < this.windowMs);

    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);

    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global rate limiter instances
export const formSubmissionLimiter = new RateLimiter(3, 60000); // 3 submissions per minute
export const searchLimiter = new RateLimiter(20, 60000); // 20 searches per minute
