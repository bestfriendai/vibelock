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

  // File Download Errors
  INVALID_URL = "INVALID_URL",
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  READER_ERROR = "READER_ERROR",
  METADATA_FAILED = "METADATA_FAILED",
  CONVERSION_ERROR = "CONVERSION_ERROR",

  // File Upload Errors
  UPLOAD_ERROR = "UPLOAD_ERROR",
  UPLOAD_CANCELLED = "UPLOAD_CANCELLED",
  UPLOAD_TIMEOUT = "UPLOAD_TIMEOUT",

  // File Validation Errors
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  FILE_TOO_SMALL = "FILE_TOO_SMALL",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  BLOCKED_FILE_TYPE = "BLOCKED_FILE_TYPE",
  INVALID_FILE_EXTENSION = "INVALID_FILE_EXTENSION",
  BLOCKED_FILE_EXTENSION = "BLOCKED_FILE_EXTENSION",
  MALWARE_DETECTED = "MALWARE_DETECTED",
  CUSTOM_VALIDATION_FAILED = "CUSTOM_VALIDATION_FAILED",

  // File Preview Errors
  UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE",
  MISSING_URL = "MISSING_URL",
  PREVIEW_FAILED = "PREVIEW_FAILED",
  THUMBNAIL_FAILED = "THUMBNAIL_FAILED",
  TEXT_CONTENT_FAILED = "TEXT_CONTENT_FAILED",
  FILE_READ_ERROR = "FILE_READ_ERROR",

  // Image Processing Errors
  IMAGE_LOAD_ERROR = "IMAGE_LOAD_ERROR",
  CANVAS_ERROR = "CANVAS_ERROR",
  BLOB_ERROR = "BLOB_ERROR",

  // File Compression Errors
  COMPRESSION_ERROR = "COMPRESSION_ERROR",
  DECOMPRESSION_ERROR = "DECOMPRESSION_ERROR",

  // Path Sanitization Errors
  INVALID_PATH = "INVALID_PATH",
  PATH_TRAVERSAL = "PATH_TRAVERSAL",
  PATH_TOO_LONG = "PATH_TOO_LONG",
  INVALID_PATH_SEGMENT = "INVALID_PATH_SEGMENT",
  INVALID_PATH_CHARS = "INVALID_PATH_CHARS",
  RESERVED_FILENAME = "RESERVED_FILENAME",
  INVALID_FILENAME = "INVALID_FILENAME",

  // Preview Generation Errors
  PREVIEW_GENERATION_ERROR = "PREVIEW_GENERATION_ERROR",
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

      // File operation error messages
      case ErrorType.FILE_TOO_LARGE:
        return "The file is too large. Please select a smaller file.";
      case ErrorType.FILE_TOO_SMALL:
        return "The file is too small. Please select a larger file.";
      case ErrorType.INVALID_FILE_TYPE:
        return "This file type is not supported. Please select a different file.";
      case ErrorType.BLOCKED_FILE_TYPE:
        return "This file type is not allowed for security reasons.";
      case ErrorType.INVALID_FILE_EXTENSION:
        return "This file extension is not supported.";
      case ErrorType.BLOCKED_FILE_EXTENSION:
        return "This file extension is not allowed for security reasons.";
      case ErrorType.MALWARE_DETECTED:
        return "This file contains malware and cannot be uploaded.";
      case ErrorType.UPLOAD_ERROR:
        return "Failed to upload file. Please try again.";
      case ErrorType.UPLOAD_CANCELLED:
        return "File upload was cancelled.";
      case ErrorType.UPLOAD_TIMEOUT:
        return "File upload timed out. Please try again.";
      case ErrorType.DOWNLOAD_FAILED:
        return "Failed to download file. Please try again.";
      case ErrorType.PREVIEW_FAILED:
        return "Cannot generate preview for this file.";
      case ErrorType.COMPRESSION_ERROR:
        return "Failed to compress file. Please try again.";
      case ErrorType.DECOMPRESSION_ERROR:
        return "Failed to decompress file. Please try again.";
      case ErrorType.INVALID_PATH:
        return "Invalid file path specified.";
      case ErrorType.PATH_TRAVERSAL:
        return "Invalid file path for security reasons.";
      case ErrorType.INVALID_FILENAME:
        return "Invalid filename. Please use a different name.";
      case ErrorType.RESERVED_FILENAME:
        return "This filename is reserved. Please use a different name.";
      case ErrorType.INVALID_URL:
        return "The provided URL is invalid. Please check and try again.";
      case ErrorType.UNSUPPORTED_TYPE:
        return "This file type can't be previewed or processed.";
      case ErrorType.READER_ERROR:
        return "A problem occurred reading the response. Please try again.";
      case ErrorType.METADATA_FAILED:
        return "Couldn't fetch file metadata. Please try again.";
      case ErrorType.CONVERSION_ERROR:
        return "Failed to convert data. Please try again.";
      case ErrorType.FILE_READ_ERROR:
        return "Failed to read the file. Please try again.";
      case ErrorType.IMAGE_LOAD_ERROR:
        return "Failed to load the image. Please try a different file.";
      case ErrorType.CANVAS_ERROR:
        return "Graphics processing failed. Please try again.";
      case ErrorType.BLOB_ERROR:
        return "Failed to create file data. Please try again.";
      case ErrorType.PATH_TOO_LONG:
        return "The file path is too long. Please shorten it.";
      case ErrorType.INVALID_PATH_SEGMENT:
        return "A path segment is invalid. Please update the path.";
      case ErrorType.INVALID_PATH_CHARS:
        return "The path contains invalid characters.";
      case ErrorType.PREVIEW_GENERATION_ERROR:
        return "Failed to generate a preview for this file.";

      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
}

// Enhanced error parser for Supabase errors
export const parseSupabaseError = (error: any): AppError => {
  console.warn("Parsing Supabase error:", error);

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
      console.warn("Safe async operation failed:", appError);
    }

    return fallback;
  }
};

// Error boundary helper for React components
export const handleComponentError = (error: any, componentName: string): string => {
  const appError = error instanceof AppError ? error : parseSupabaseError(error);
  console.warn(`Error in ${componentName}:`, appError);
  return appError.userMessage;
};

// Worklet-safe error creation for use in reanimated/worklets contexts
export const createWorkletSafeError = (
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  code?: string,
): { message: string; type: ErrorType; code?: string; userMessage: string } => {
  "worklet";

  // Generate user message without class construction
  let userMessage: string;
  switch (type) {
    case ErrorType.NETWORK:
      userMessage = "Network connection issue. Please check your internet connection and try again.";
      break;
    case ErrorType.AUTH:
      userMessage = "Authentication failed. Please sign in again.";
      break;
    case ErrorType.PERMISSION:
      userMessage = "You don't have permission to perform this action.";
      break;
    case ErrorType.VALIDATION:
      userMessage = "Please check your input and try again.";
      break;
    case ErrorType.SERVER:
      userMessage = "Server error. Please try again in a few moments.";
      break;
    case ErrorType.FILE_TOO_LARGE:
      userMessage = "The file is too large. Please select a smaller file.";
      break;
    case ErrorType.FILE_TOO_SMALL:
      userMessage = "The file is too small. Please select a larger file.";
      break;
    case ErrorType.INVALID_FILE_TYPE:
      userMessage = "This file type is not supported. Please select a different file.";
      break;
    case ErrorType.BLOCKED_FILE_TYPE:
      userMessage = "This file type is not allowed for security reasons.";
      break;
    case ErrorType.UPLOAD_ERROR:
      userMessage = "Failed to upload file. Please try again.";
      break;
    case ErrorType.DOWNLOAD_FAILED:
      userMessage = "Failed to download file. Please try again.";
      break;
    case ErrorType.PREVIEW_FAILED:
      userMessage = "Cannot generate preview for this file.";
      break;
    case ErrorType.INVALID_PATH:
      userMessage = "Invalid file path specified.";
      break;
    case ErrorType.INVALID_FILENAME:
      userMessage = "Invalid filename. Please use a different name.";
      break;
    case ErrorType.INVALID_URL:
      userMessage = "The provided URL is invalid. Please check and try again.";
      break;
    case ErrorType.UNSUPPORTED_TYPE:
      userMessage = "This file type can't be previewed or processed.";
      break;
    case ErrorType.FILE_READ_ERROR:
      userMessage = "Failed to read the file. Please try again.";
      break;
    case ErrorType.IMAGE_LOAD_ERROR:
      userMessage = "Failed to load the image. Please try again.";
      break;
    case ErrorType.CANVAS_ERROR:
      userMessage = "Graphics processing failed. Please try again.";
      break;
    case ErrorType.BLOB_ERROR:
      userMessage = "Failed to create file data. Please try again.";
      break;
    case ErrorType.COMPRESSION_ERROR:
      userMessage = "Failed to compress file. Please try again.";
      break;
    case ErrorType.DECOMPRESSION_ERROR:
      userMessage = "Failed to decompress file. Please try again.";
      break;
    case ErrorType.PREVIEW_GENERATION_ERROR:
      userMessage = "Failed to generate a preview for this file.";
      break;
    default:
      userMessage = "An unexpected error occurred. Please try again.";
  }

  return {
    message,
    type,
    code,
    userMessage,
  };
};

// Convert worklet-safe error to AppError (use on JS thread)
export const convertToAppError = (workletError: {
  message: string;
  type: ErrorType;
  code?: string;
  userMessage: string;
}): AppError => {
  return new AppError(workletError.message, workletError.type, workletError.code);
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
