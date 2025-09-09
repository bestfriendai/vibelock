// Enhanced error handling utilities for Supabase integrations
import { handleSupabaseError } from "../config/supabase";

// Error types for better categorization
export enum ErrorType {
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  PERMISSION = "PERMISSION",
  VALIDATION = "VALIDATION",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

// Enhanced error class with more context
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string,
    statusCode?: number,
    retryable: boolean = false,
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.userMessage = this.generateUserMessage();
  }

  private generateUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return "Network connection issue. Please check your internet connection and try again.";
      case ErrorType.AUTH:
        return "Authentication failed. Please sign in again.";
      case ErrorType.PERMISSION:
        return "You don't have permission to perform this action.";
      case ErrorType.VALIDATION:
        return "Please check your input and try again.";
      case ErrorType.SERVER:
        return "Server error. Please try again in a few moments.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
}

// Enhanced error parser for Supabase errors
export const parseSupabaseError = (error: any): AppError => {
  console.error("Parsing Supabase error:", error);

  // Handle network/timeout errors
  if (error?.name === "AbortError" || error?.message?.includes("timeout")) {
    return new AppError("Request timed out", ErrorType.NETWORK, "TIMEOUT", undefined, true);
  }

  // Handle network connection errors
  if (error?.name === "TypeError" && error?.message?.includes("Network request failed")) {
    return new AppError("Network request failed", ErrorType.NETWORK, "NETWORK_FAILED", undefined, true);
  }

  // Handle HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 400:
        return new AppError("Bad request", ErrorType.VALIDATION, "BAD_REQUEST", 400, false);
      case 401:
        return new AppError("Unauthorized", ErrorType.AUTH, "UNAUTHORIZED", 401, false);
      case 403:
        return new AppError("Forbidden", ErrorType.PERMISSION, "FORBIDDEN", 403, false);
      case 404:
        return new AppError("Not found", ErrorType.VALIDATION, "NOT_FOUND", 404, false);
      case 422:
        return new AppError("Validation error", ErrorType.VALIDATION, "VALIDATION_ERROR", 422, false);
      case 429:
        return new AppError("Too many requests", ErrorType.SERVER, "RATE_LIMITED", 429, true);
      case 500:
      case 502:
      case 503:
      case 504:
        return new AppError("Server error", ErrorType.SERVER, "SERVER_ERROR", error.status, true);
      default:
        return new AppError(`HTTP ${error.status}`, ErrorType.SERVER, "HTTP_ERROR", error.status, error.status >= 500);
    }
  }

  // Handle specific Supabase auth errors
  if (error?.message) {
    const message = error.message.toLowerCase();

    if (message.includes("invalid login credentials")) {
      return new AppError("Invalid credentials", ErrorType.AUTH, "INVALID_CREDENTIALS", undefined, false);
    }

    if (message.includes("email not confirmed")) {
      return new AppError("Email not confirmed", ErrorType.AUTH, "EMAIL_NOT_CONFIRMED", undefined, false);
    }

    if (message.includes("user already registered")) {
      return new AppError("User already exists", ErrorType.VALIDATION, "USER_EXISTS", undefined, false);
    }

    if (message.includes("password should be at least")) {
      return new AppError("Password too short", ErrorType.VALIDATION, "PASSWORD_TOO_SHORT", undefined, false);
    }

    if (message.includes("invalid email")) {
      return new AppError("Invalid email", ErrorType.VALIDATION, "INVALID_EMAIL", undefined, false);
    }
  }

  // Fallback to original error message
  return new AppError(error?.message || "Unknown error", ErrorType.UNKNOWN, "UNKNOWN", undefined, false);
};

// Enhanced retry function with better error handling
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  shouldRetry?: (error: AppError) => boolean,
): Promise<T> => {
  let lastError: AppError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      lastError = appError;

      // Use custom retry logic if provided, otherwise use error's retryable flag
      const canRetry = shouldRetry ? shouldRetry(appError) : appError.retryable;

      // Don't retry on the last attempt or if error is not retryable
      if (attempt === maxRetries - 1 || !canRetry) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`, appError.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Utility to safely execute async operations with error handling
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: AppError) => void,
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error: any) {
    const appError = error instanceof AppError ? error : parseSupabaseError(error);

    if (onError) {
      onError(appError);
    } else {
      console.error("Safe async operation failed:", appError);
    }

    return fallback;
  }
};

// Error boundary helper for React components
export const handleComponentError = (error: any, componentName: string): string => {
  const appError = error instanceof AppError ? error : parseSupabaseError(error);
  console.error(`Error in ${componentName}:`, appError);
  return appError.userMessage;
};

// Network status checker
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    // Use environment variable for Supabase URL or fallback to a reliable endpoint
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const checkUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/` : "https://www.google.com/generate_204"; // Google's connectivity check endpoint

    const response = await fetch(checkUrl, {
      method: "HEAD",
      // @ts-ignore - timeout is supported in React Native
      timeout: 5000,
    });
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
};
