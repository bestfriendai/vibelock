/**
 * Tests for media error handling utilities
 */

// Mock react-native-reanimated to avoid import issues
jest.mock("react-native-reanimated", () => ({
  runOnJS: (fn: Function) => fn,
}));

import {
  createMediaError,
  handleMediaUploadError,
  withMediaErrorHandling,
  convertMediaErrorToAppError,
} from "../mediaErrorHandling";
import { ErrorType } from "../errorHandling";

describe("mediaErrorHandling", () => {
  describe("createMediaError", () => {
    it("should create a media error with correct properties", () => {
      const error = createMediaError("Test error", "UPLOAD_FAILED", true);

      expect(error.message).toBe("Test error");
      expect(error.type).toBe("UPLOAD_FAILED");
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toBe("Failed to upload media. Please try again.");
    });

    it("should handle unknown error type", () => {
      const error = createMediaError("Test error");

      expect(error.type).toBe("UNKNOWN");
      expect(error.userMessage).toBe("An error occurred while processing media. Please try again.");
    });
  });

  describe("handleMediaUploadError", () => {
    it("should categorize network errors correctly", () => {
      const networkError = new Error("Network request failed");
      const result = handleMediaUploadError(networkError, "test");

      expect(result.type).toBe("NETWORK_ERROR");
      expect(result.retryable).toBe(true);
    });

    it("should categorize permission errors correctly", () => {
      const permissionError = new Error("Permission denied");
      const result = handleMediaUploadError(permissionError, "test");

      expect(result.type).toBe("PERMISSION_DENIED");
      expect(result.retryable).toBe(false);
    });

    it("should handle unknown errors", () => {
      const unknownError = new Error("Something went wrong");
      const result = handleMediaUploadError(unknownError, "test");

      expect(result.type).toBe("UPLOAD_FAILED");
      expect(result.retryable).toBe(true);
    });
  });

  describe("withMediaErrorHandling", () => {
    it("should return result on success", async () => {
      const operation = jest.fn().mockResolvedValue("success");
      const result = await withMediaErrorHandling(operation, "test");

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Test error"));
      const result = await withMediaErrorHandling(operation, "test");

      expect(result).toBeNull();
      expect(operation).toHaveBeenCalled();
    });
  });

  describe("convertMediaErrorToAppError", () => {
    it("should convert media error to app error correctly", () => {
      const mediaError = createMediaError("Test error", "NETWORK_ERROR", true);
      const appError = convertMediaErrorToAppError(mediaError);

      expect(appError.message).toBe("Test error");
      expect(appError.type).toBe(ErrorType.NETWORK);
      expect(appError.code).toBe("NETWORK_ERROR");
      expect(appError.retryable).toBe(true);
    });
  });
});
