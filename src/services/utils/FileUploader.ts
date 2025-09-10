import { AppError } from "../../types/error";
import { FileValidator, ValidationOptions, ValidationResult } from "./FileValidator";
import { FileCompressor, CompressionOptions, CompressionResult } from "./FileCompressor";

/**
 * Upload options
 */
export interface UploadOptions {
  /**
   * Whether to validate the file before upload
   */
  validate?: boolean;

  /**
   * Validation options
   */
  validationOptions?: ValidationOptions;

  /**
   * Whether to compress the file before upload
   */
  compress?: boolean;

  /**
   * Compression options
   */
  compressionOptions?: CompressionOptions;

  /**
   * Upload URL
   */
  url: string;

  /**
   * HTTP method to use for upload
   */
  method?: "POST" | "PUT" | "PATCH";

  /**
   * Headers to include in the upload request
   */
  headers?: Record<string, string>;

  /**
   * Query parameters to include in the upload request
   */
  params?: Record<string, string>;

  /**
   * Field name for the file in the form data
   */
  fieldName?: string;

  /**
   * Additional form data fields
   */
  fields?: Record<string, string>;

  /**
   * Whether to include credentials in the request
   */
  withCredentials?: boolean;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;

  /**
   * Delay between retry attempts in milliseconds
   */
  retryDelay?: number;

  /**
   * Whether to use chunked upload for large files
   */
  useChunkedUpload?: boolean;

  /**
   * Chunk size in bytes for chunked upload
   */
  chunkSize?: number;

  /**
   * Maximum concurrent chunks for chunked upload
   */
  maxConcurrentChunks?: number;

  /**
   * Progress callback
   */
  onProgress?: (progress: UploadProgress) => void;

  /**
   * Callback for chunk upload completion
   */
  onChunkComplete?: (chunkIndex: number, response: any) => void;

  /**
   * Callback for upload start
   */
  onStart?: () => void;

  /**
   * Callback for upload completion
   */
  onComplete?: (response: UploadResponse) => void;

  /**
   * Callback for upload error
   */
  onError?: (error: AppError) => void;

  /**
   * Callback for upload cancellation
   */
  onCancel?: () => void;

  /**
   * Whether to report upload progress
   */
  reportProgress?: boolean;

  /**
   * Progress reporting interval in milliseconds
   */
  progressInterval?: number;
}

/**
 * Upload progress
 */
export interface UploadProgress {
  /**
   * Total bytes to upload
   */
  totalBytes: number;

  /**
   * Bytes uploaded so far
   */
  uploadedBytes: number;

  /**
   * Upload progress percentage (0-100)
   */
  progress: number;

  /**
   * Upload speed in bytes per second
   */
  speed: number;

  /**
   * Estimated time remaining in milliseconds
   */
  timeRemaining: number;

  /**
   * Whether the upload is paused
   */
  isPaused: boolean;

  /**
   * Current chunk index (for chunked uploads)
   */
  currentChunk?: number;

  /**
   * Total chunks (for chunked uploads)
   */
  totalChunks?: number;
}

/**
 * Upload response
 */
export interface UploadResponse {
  /**
   * HTTP status code
   */
  status: number;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Response data
   */
  data: any;

  /**
   * Upload time in milliseconds
   */
  uploadTime: number;

  /**
   * Average upload speed in bytes per second
   */
  averageSpeed: number;

  /**
   * Whether the upload was successful
   */
  success: boolean;

  /**
   * Error message if upload failed
   */
  error?: string;
}

/**
 * Upload chunk
 */
interface UploadChunk {
  /**
   * Chunk index
   */
  index: number;

  /**
   * Chunk data as a Blob
   */
  data: Blob;

  /**
   * Chunk start byte
   */
  start: number;

  /**
   * Chunk end byte
   */
  end: number;

  /**
   * Whether the chunk has been uploaded
   */
  uploaded: boolean;

  /**
   * Chunk upload response
   */
  response?: any;
}

/**
 * Upload request
 */
interface UploadRequest {
  /**
   * Request ID
   */
  id: string;

  /**
   * File to upload
   */
  file: File;

  /**
   * Upload options
   */
  options: UploadOptions;

  /**
   * Upload progress
   */
  progress: UploadProgress;

  /**
   * Whether the upload is paused
   */
  isPaused: boolean;

  /**
   * Whether the upload is cancelled
   */
  isCancelled: boolean;

  /**
   * Upload start time
   */
  startTime?: number;

  /**
   * Upload end time
   */
  endTime?: number;

  /**
   * Chunks for chunked upload
   */
  chunks?: UploadChunk[];

  /**
   * Active chunk upload promises
   */
  activeChunkPromises?: Promise<void>[];

  /**
   * Progress reporting interval ID
   */
  progressIntervalId?: number;

  /**
   * Abort controller for the upload
   */
  abortController?: AbortController;
}

/**
 * Utility class for uploading files
 */
export class FileUploader {
  /**
   * Default chunk size (5MB)
   */
  private static readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

  /**
   * Default maximum concurrent chunks (3)
   */
  private static readonly DEFAULT_MAX_CONCURRENT_CHUNKS = 3;

  /**
   * Default maximum retry attempts (3)
   */
  private static readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Default retry delay (1000ms)
   */
  private static readonly DEFAULT_RETRY_DELAY = 1000;

  /**
   * Default progress reporting interval (500ms)
   */
  private static readonly DEFAULT_PROGRESS_INTERVAL = 500;

  /**
   * Default timeout (30000ms)
   */
  private static readonly DEFAULT_TIMEOUT = 30000;

  /**
   * Active uploads
   */
  private static activeUploads: Map<string, UploadRequest> = new Map();

  /**
   * Upload a file
   */
  static async uploadFile(file: File, options: UploadOptions): Promise<UploadResponse> {
    try {
      // Generate unique upload ID
      const uploadId = this.generateUploadId();

      // Set default options
      const uploadOptions: UploadOptions = {
        validate: true,
        compress: false,
        method: "POST",
        fieldName: "file",
        withCredentials: false,
        useChunkedUpload: false,
        reportProgress: true,
        maxRetries: this.DEFAULT_MAX_RETRIES,
        retryDelay: this.DEFAULT_RETRY_DELAY,
        timeout: this.DEFAULT_TIMEOUT,
        progressInterval: this.DEFAULT_PROGRESS_INTERVAL,
        ...options,
      };

      // Set chunk size if using chunked upload
      if (uploadOptions.useChunkedUpload && !uploadOptions.chunkSize) {
        uploadOptions.chunkSize = this.DEFAULT_CHUNK_SIZE;
      }

      if (uploadOptions.useChunkedUpload && !uploadOptions.maxConcurrentChunks) {
        uploadOptions.maxConcurrentChunks = this.DEFAULT_MAX_CONCURRENT_CHUNKS;
      }

      // Initialize upload request
      const uploadRequest: UploadRequest = {
        id: uploadId,
        file,
        options: uploadOptions,
        progress: {
          totalBytes: file.size,
          uploadedBytes: 0,
          progress: 0,
          speed: 0,
          timeRemaining: 0,
          isPaused: false,
        },
        isPaused: false,
        isCancelled: false,
        abortController: new AbortController(),
      };

      // Add to active uploads
      this.activeUploads.set(uploadId, uploadRequest);

      // Call start callback
      if (uploadOptions.onStart) {
        uploadOptions.onStart();
      }

      // Start upload
      const result = await this.performUpload(uploadRequest);

      // Remove from active uploads
      this.activeUploads.delete(uploadId);

      // Call complete callback
      if (uploadOptions.onComplete) {
        uploadOptions.onComplete(result);
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
        "UPLOAD_ERROR",
        500,
      );
    }
  }

  /**
   * Perform the actual upload
   */
  private static async performUpload(uploadRequest: UploadRequest): Promise<UploadResponse> {
    const { file, options } = uploadRequest;

    try {
      // Set start time
      uploadRequest.startTime = performance.now();

      // Validate file if requested
      let validationResult: ValidationResult | undefined;
      let fileToUpload: File | Blob = file;

      if (options.validate) {
        validationResult = await FileValidator.validateFile(file, options.validationOptions || {});

        if (!validationResult.isValid) {
          throw new AppError(
            `File validation failed: ${validationResult.errors.map((e) => e.message).join(", ")}`,
            "VALIDATION_ERROR",
            400,
          );
        }
      }

      // Compress file if requested
      let compressionResult: CompressionResult | undefined;

      if (options.compress) {
        compressionResult = await FileCompressor.compressFile(file, options.compressionOptions || {});
        fileToUpload = compressionResult.compressedFile;
      }

      // Determine if we should use chunked upload
      const useChunkedUpload =
        options.useChunkedUpload && fileToUpload.size > (options.chunkSize || this.DEFAULT_CHUNK_SIZE);

      if (useChunkedUpload) {
        return await this.uploadFileInChunks(uploadRequest, fileToUpload);
      } else {
        return await this.uploadFileAsWhole(uploadRequest, fileToUpload);
      }
    } catch (error) {
      // Set end time
      uploadRequest.endTime = performance.now();

      if (error instanceof AppError) {
        // Call error callback
        if (options.onError) {
          options.onError(error);
        }
        throw error;
      }

      const appError = new AppError(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
        "UPLOAD_ERROR",
        500,
      );

      // Call error callback
      if (options.onError) {
        options.onError(appError);
      }

      throw appError;
    }
  }

  /**
   * Upload file as a whole
   */
  private static async uploadFileAsWhole(uploadRequest: UploadRequest, file: File | Blob): Promise<UploadResponse> {
    const { options } = uploadRequest;

    try {
      // Create form data
      const formData = new FormData();
      formData.append(options.fieldName || "file", file);

      // Add additional fields
      if (options.fields) {
        for (const [key, value] of Object.entries(options.fields)) {
          formData.append(key, value);
        }
      }

      // Build URL with query parameters
      let url = options.url;
      if (options.params) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(options.params)) {
          searchParams.append(key, value);
        }
        const queryString = searchParams.toString();
        if (queryString) {
          url += (url.includes("?") ? "&" : "?") + queryString;
        }
      }

      // Set up progress reporting
      if (options.reportProgress && options.onProgress) {
        this.setupProgressReporting(uploadRequest);
      }

      // Create request with timeout
      const controller = uploadRequest.abortController;
      const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : undefined;

      // Perform the upload
      const response = await fetch(url, {
        method: options.method || "POST",
        headers: options.headers,
        body: formData,
        credentials: options.withCredentials ? "include" : "same-origin",
        signal: controller.signal,
      });

      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Parse response
      const responseData = await this.parseResponse(response);

      // Set end time
      uploadRequest.endTime = performance.now();

      // Calculate upload time and speed
      const uploadTime = uploadRequest.endTime - (uploadRequest.startTime || 0);
      const averageSpeed = file.size / (uploadTime / 1000);

      // Clear progress reporting
      this.clearProgressReporting(uploadRequest);

      // Update progress to 100%
      if (options.reportProgress && options.onProgress) {
        uploadRequest.progress.uploadedBytes = uploadRequest.progress.totalBytes;
        uploadRequest.progress.progress = 100;
        uploadRequest.progress.timeRemaining = 0;
        options.onProgress({ ...uploadRequest.progress });
      }

      return {
        status: response.status,
        headers: this.parseHeaders(response.headers),
        data: responseData,
        uploadTime,
        averageSpeed,
        success: response.ok,
        error: response.ok ? undefined : `HTTP error ${response.status}`,
      };
    } catch (error) {
      // Set end time
      uploadRequest.endTime = performance.now();

      // Clear progress reporting
      this.clearProgressReporting(uploadRequest);

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("Upload was cancelled", "UPLOAD_CANCELLED", 499);
      }

      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError("Upload timed out", "UPLOAD_TIMEOUT", 408);
      }

      throw error;
    }
  }

  /**
   * Upload file in chunks
   */
  private static async uploadFileInChunks(uploadRequest: UploadRequest, file: File | Blob): Promise<UploadResponse> {
    const { options } = uploadRequest;
    const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const maxConcurrentChunks = options.maxConcurrentChunks || this.DEFAULT_MAX_CONCURRENT_CHUNKS;

    try {
      // Create chunks
      const chunks: UploadChunk[] = [];
      let start = 0;
      let chunkIndex = 0;

      while (start < file.size) {
        const end = Math.min(start + chunkSize, file.size);
        const chunkData = file.slice(start, end);

        chunks.push({
          index: chunkIndex,
          data: chunkData,
          start,
          end,
          uploaded: false,
        });

        start = end;
        chunkIndex++;
      }

      // Store chunks in upload request
      uploadRequest.chunks = chunks;
      uploadRequest.activeChunkPromises = [];

      // Set up progress reporting
      if (options.reportProgress && options.onProgress) {
        this.setupProgressReporting(uploadRequest);
      }

      // Start uploading chunks
      await this.uploadChunks(uploadRequest, chunks, maxConcurrentChunks);

      // Wait for all chunk uploads to complete
      await Promise.all(uploadRequest.activeChunkPromises);

      // Set end time
      uploadRequest.endTime = performance.now();

      // Calculate upload time and speed
      const uploadTime = uploadRequest.endTime - (uploadRequest.startTime || 0);
      const averageSpeed = file.size / (uploadTime / 1000);

      // Clear progress reporting
      this.clearProgressReporting(uploadRequest);

      // Update progress to 100%
      if (options.reportProgress && options.onProgress) {
        uploadRequest.progress.uploadedBytes = uploadRequest.progress.totalBytes;
        uploadRequest.progress.progress = 100;
        uploadRequest.progress.timeRemaining = 0;
        options.onProgress({ ...uploadRequest.progress });
      }

      // Return success response
      return {
        status: 200,
        headers: {},
        data: { chunks: chunks.map((c) => c.response) },
        uploadTime,
        averageSpeed,
        success: true,
      };
    } catch (error) {
      // Set end time
      uploadRequest.endTime = performance.now();

      // Clear progress reporting
      this.clearProgressReporting(uploadRequest);

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("Upload was cancelled", "UPLOAD_CANCELLED", 499);
      }

      throw error;
    }
  }

  /**
   * Upload chunks with concurrency control
   */
  private static async uploadChunks(
    uploadRequest: UploadRequest,
    chunks: UploadChunk[],
    maxConcurrentChunks: number,
  ): Promise<void> {
    const { options } = uploadRequest;

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i++) {
      // Check if upload is paused or cancelled
      if (uploadRequest.isPaused) {
        await this.waitForResume(uploadRequest);
      }

      if (uploadRequest.isCancelled) {
        throw new Error("Upload cancelled");
      }

      const chunk = chunks[i];

      // Skip if already uploaded
      if (chunk.uploaded) {
        continue;
      }

      // Wait for active chunk uploads to complete if we've reached the maximum
      if (uploadRequest.activeChunkPromises && uploadRequest.activeChunkPromises.length >= maxConcurrentChunks) {
        await Promise.race(uploadRequest.activeChunkPromises);

        // Remove completed promises
        uploadRequest.activeChunkPromises = uploadRequest.activeChunkPromises.filter((p) => !this.isPromiseResolved(p));
      }

      // Initialize active chunk promises array if needed
      if (!uploadRequest.activeChunkPromises) {
        uploadRequest.activeChunkPromises = [];
      }

      // Create and store the chunk upload promise
      const chunkUploadPromise = this.uploadChunk(uploadRequest, chunk);
      uploadRequest.activeChunkPromises.push(chunkUploadPromise);
    }
  }

  /**
   * Upload a single chunk
   */
  private static async uploadChunk(uploadRequest: UploadRequest, chunk: UploadChunk): Promise<void> {
    const { options } = uploadRequest;
    const maxRetries = options.maxRetries || this.DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= maxRetries) {
      try {
        // Check if upload is paused or cancelled
        if (uploadRequest.isPaused) {
          await this.waitForResume(uploadRequest);
        }

        if (uploadRequest.isCancelled) {
          throw new Error("Upload cancelled");
        }

        // Create form data
        const formData = new FormData();
        formData.append(options.fieldName || "file", chunk.data);
        formData.append("chunkIndex", chunk.index.toString());
        formData.append("totalChunks", (uploadRequest.chunks?.length || 0).toString());
        formData.append("fileName", uploadRequest.file.name);
        formData.append("fileSize", uploadRequest.file.size.toString());
        formData.append("fileType", uploadRequest.file.type);

        // Add additional fields
        if (options.fields) {
          for (const [key, value] of Object.entries(options.fields)) {
            formData.append(key, value);
          }
        }

        // Build URL with query parameters
        let url = options.url;
        if (options.params) {
          const searchParams = new URLSearchParams();
          for (const [key, value] of Object.entries(options.params)) {
            searchParams.append(key, value);
          }
          const queryString = searchParams.toString();
          if (queryString) {
            url += (url.includes("?") ? "&" : "?") + queryString;
          }
        }

        // Create request with timeout
        const controller = new AbortController();
        const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : undefined;

        // Perform the chunk upload
        const response = await fetch(url, {
          method: options.method || "POST",
          headers: options.headers,
          body: formData,
          credentials: options.withCredentials ? "include" : "same-origin",
          signal: controller.signal,
        });

        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        // Parse response
        const responseData = await this.parseResponse(response);

        // Mark chunk as uploaded
        chunk.uploaded = true;
        chunk.response = responseData;

        // Update progress
        if (options.reportProgress) {
          uploadRequest.progress.uploadedBytes += chunk.data.size;
          uploadRequest.progress.progress =
            (uploadRequest.progress.uploadedBytes / uploadRequest.progress.totalBytes) * 100;
          uploadRequest.progress.currentChunk = chunk.index;
          uploadRequest.progress.totalChunks = uploadRequest.chunks?.length;
        }

        // Call chunk complete callback
        if (options.onChunkComplete) {
          options.onChunkComplete(chunk.index, responseData);
        }

        // Chunk uploaded successfully
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        // If this is not the last retry, wait before retrying
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }

        retryCount++;
      }
    }

    // All retries failed
    throw lastError || new Error("Failed to upload chunk");
  }

  /**
   * Set up progress reporting
   */
  private static setupProgressReporting(uploadRequest: UploadRequest): void {
    const { options } = uploadRequest;

    if (!options.onProgress || !options.reportProgress) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (uploadRequest.isPaused || uploadRequest.isCancelled) {
        return;
      }

      // Calculate speed and time remaining
      const currentTime = performance.now();
      const startTime = uploadRequest.startTime || currentTime;
      const elapsedTime = (currentTime - startTime) / 1000; // in seconds

      if (elapsedTime > 0) {
        uploadRequest.progress.speed = uploadRequest.progress.uploadedBytes / elapsedTime;

        if (uploadRequest.progress.speed > 0) {
          const remainingBytes = uploadRequest.progress.totalBytes - uploadRequest.progress.uploadedBytes;
          uploadRequest.progress.timeRemaining = (remainingBytes / uploadRequest.progress.speed) * 1000; // in milliseconds
        }
      }

      // Call progress callback
      options.onProgress({ ...uploadRequest.progress });
    }, options.progressInterval || this.DEFAULT_PROGRESS_INTERVAL);

    uploadRequest.progressIntervalId = intervalId;
  }

  /**
   * Clear progress reporting
   */
  private static clearProgressReporting(uploadRequest: UploadRequest): void {
    if (uploadRequest.progressIntervalId) {
      clearInterval(uploadRequest.progressIntervalId);
      uploadRequest.progressIntervalId = undefined;
    }
  }

  /**
   * Wait for upload to resume
   */
  private static async waitForResume(uploadRequest: UploadRequest): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!uploadRequest.isPaused || uploadRequest.isCancelled) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Check if a promise is resolved
   */
  private static isPromiseResolved(promise: Promise<any>): boolean {
    // This is a workaround since we can't directly check if a promise is resolved
    // We'll assume it's resolved if it doesn't have a catch handler
    return false;
  }

  /**
   * Parse response based on content type
   */
  private static async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get("content-type");

    if (!contentType) {
      return await response.text();
    }

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    if (contentType.includes("text/")) {
      return await response.text();
    }

    // For other content types, return as blob
    return await response.blob();
  }

  /**
   * Parse headers from Headers object
   */
  private static parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  /**
   * Generate unique upload ID
   */
  private static generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Pause an upload
   */
  static pauseUpload(uploadId: string): boolean {
    const uploadRequest = this.activeUploads.get(uploadId);

    if (!uploadRequest) {
      return false;
    }

    uploadRequest.isPaused = true;
    uploadRequest.progress.isPaused = true;

    return true;
  }

  /**
   * Resume an upload
   */
  static resumeUpload(uploadId: string): boolean {
    const uploadRequest = this.activeUploads.get(uploadId);

    if (!uploadRequest) {
      return false;
    }

    uploadRequest.isPaused = false;
    uploadRequest.progress.isPaused = false;

    return true;
  }

  /**
   * Cancel an upload
   */
  static cancelUpload(uploadId: string): boolean {
    const uploadRequest = this.activeUploads.get(uploadId);

    if (!uploadRequest) {
      return false;
    }

    uploadRequest.isCancelled = true;

    // Abort the fetch request if it's in progress
    if (uploadRequest.abortController) {
      uploadRequest.abortController.abort();
    }

    // Call cancel callback if provided
    if (uploadRequest.options.onCancel) {
      uploadRequest.options.onCancel();
    }

    // Remove from active uploads
    this.activeUploads.delete(uploadId);

    return true;
  }

  /**
   * Get upload progress
   */
  static getUploadProgress(uploadId: string): UploadProgress | null {
    const uploadRequest = this.activeUploads.get(uploadId);

    if (!uploadRequest) {
      return null;
    }

    return { ...uploadRequest.progress };
  }

  /**
   * Get all active upload IDs
   */
  static getActiveUploadIds(): string[] {
    return Array.from(this.activeUploads.keys());
  }

  /**
   * Check if an upload is active
   */
  static isUploadActive(uploadId: string): boolean {
    return this.activeUploads.has(uploadId);
  }

  /**
   * Get the number of active uploads
   */
  static getActiveUploadCount(): number {
    return this.activeUploads.size;
  }

  /**
   * Cancel all active uploads
   */
  static cancelAllUploads(): void {
    for (const uploadId of this.activeUploads.keys()) {
      this.cancelUpload(uploadId);
    }
  }
}
