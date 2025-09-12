import { AppError, ErrorType } from "../../types/error";
import { FileMetadata } from "../../types/storage";

/**
 * Utility class for handling file downloads
 */
export class FileDownloader {
  /**
   * Download a file from the given URL
   */
  static async downloadFile(url: string, filename?: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      // Validate the URL
      if (!this.isValidUrl(url)) {
        throw new AppError("Invalid URL provided", ErrorType.VALIDATION, "INVALID_URL", 400);
      }

      // Fetch the file
      const response = await fetch(url);

      if (!response.ok) {
        throw new AppError(
          `Failed to download file: ${response.statusText}`,
          ErrorType.NETWORK,
          "DOWNLOAD_FAILED",
          response.status,
        );
      }

      // Get the content length to track progress
      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Get the reader for the response body
      const reader = response.body?.getReader();

      if (!reader) {
        throw new AppError("Failed to get response reader", ErrorType.SERVER, "READER_ERROR", 500);
      }

      // Get the filename from the response headers if not provided
      const contentDisposition = response.headers.get("Content-Disposition");
      const finalFilename = filename || this.getFilenameFromHeaders(contentDisposition) || "download";

      // Create a new blob to store the file data
      const chunks: Uint8Array[] = [];
      let received = 0;

      // Read the data in chunks
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        received += value.length;

        // Report progress if callback is provided and total is known
        if (onProgress && total > 0) {
          onProgress((received / total) * 100);
        }
      }

      // Create a blob from the chunks
      const blob = new Blob(chunks as BlobPart[]);

      // Create a download link and trigger the download
      this.triggerDownload(blob, finalFilename);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`,
        ErrorType.NETWORK,
        "DOWNLOAD_FAILED",
        500,
      );
    }
  }

  /**
   * Download multiple files
   */
  static async downloadMultipleFiles(
    files: { url: string; filename?: string }[],
    onProgress?: (progress: number, fileIndex: number, fileName: string) => void,
  ): Promise<void> {
    if (!files || files.length === 0) {
      throw new AppError("No files provided", ErrorType.VALIDATION, "NO_FILES", 400);
    }

    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];

      if (!file) {
        console.warn(`File at index ${i} is undefined`);
        continue;
      }

      try {
        // Create a progress callback for this specific file
        const fileProgressCallback = onProgress
          ? (progress: number) => {
              // Calculate overall progress
              const overallProgress = ((i + progress / 100) / totalFiles) * 100;
              onProgress(overallProgress, i, file.filename || `file_${i}`);
            }
          : undefined;

        // Download the file
        await this.downloadFile(file.url, file.filename, fileProgressCallback);
      } catch (error) {
        console.warn(`Failed to download file ${file.filename || file.url}:`, error);
        // Continue with other files even if one fails
      }
    }
  }

  /**
   * Get file metadata from a URL
   */
  static async getFileMetadata(url: string): Promise<FileMetadata> {
    try {
      if (!this.isValidUrl(url)) {
        throw new AppError("Invalid URL provided", ErrorType.VALIDATION, "INVALID_URL", 400);
      }

      // Use a HEAD request to get the metadata without downloading the file
      const response = await fetch(url, { method: "HEAD" });

      if (!response.ok) {
        throw new AppError(
          `Failed to get file metadata: ${response.statusText}`,
          ErrorType.NETWORK,
          "METADATA_FAILED",
          response.status,
        );
      }

      // Extract metadata from headers
      const contentLength = response.headers.get("Content-Length");
      const contentType = response.headers.get("Content-Type");
      const contentDisposition = response.headers.get("Content-Disposition");
      const lastModified = response.headers.get("Last-Modified");

      const filename = this.getFilenameFromHeaders(contentDisposition);
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      const type = contentType || "application/octet-stream";

      // Parse the last modified date
      let lastModifiedDate: number | undefined;
      if (lastModified) {
        lastModifiedDate = new Date(lastModified).getTime();
      }

      return {
        id: url, // Use URL as ID for downloaded files
        filename: filename || "unknown",
        url,
        size,
        contentType: type,
        uploadedAt: new Date(lastModifiedDate || Date.now()),
        bucket: "downloads", // Default bucket for downloads
        path: filename || "unknown",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
        ErrorType.NETWORK,
        "METADATA_FAILED",
        500,
      );
    }
  }

  /**
   * Check if a URL is valid
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract filename from Content-Disposition header
   */
  private static getFilenameFromHeaders(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    // Look for filename="..." or filename=...
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);

    if (filenameMatch && filenameMatch[1]) {
      // Remove quotes if present
      let filename = filenameMatch[1].replace(/^["']|["']$/g, "");

      // Handle URL encoded filenames
      try {
        filename = decodeURIComponent(filename);
      } catch {
        // If decoding fails, use the original filename
      }

      return filename;
    }

    return null;
  }

  /**
   * Trigger a download in the browser
   */
  private static triggerDownload(blob: Blob, filename: string): void {
    // Create a URL for the blob
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;

    // Append the link to the body
    document.body.appendChild(link);

    // Trigger the download
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  }

  /**
   * Download a file as a data URL
   */
  static async downloadAsDataUrl(url: string, onProgress?: (progress: number) => void): Promise<string> {
    try {
      if (!this.isValidUrl(url)) {
        throw new AppError("Invalid URL provided", ErrorType.VALIDATION, "INVALID_URL", 400);
      }

      // Fetch the file
      const response = await fetch(url);

      if (!response.ok) {
        throw new AppError(
          `Failed to download file: ${response.statusText}`,
          ErrorType.NETWORK,
          "DOWNLOAD_FAILED",
          response.status,
        );
      }

      // Get the content length to track progress
      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Get the reader for the response body
      const reader = response.body?.getReader();

      if (!reader) {
        throw new AppError("Failed to get response reader", ErrorType.SERVER, "READER_ERROR", 500);
      }

      // Get the content type
      const contentType = response.headers.get("Content-Type") || "application/octet-stream";

      // Create a new blob to store the file data
      const chunks: Uint8Array[] = [];
      let received = 0;

      // Read the data in chunks
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        received += value.length;

        // Report progress if callback is provided and total is known
        if (onProgress && total > 0) {
          onProgress((received / total) * 100);
        }
      }

      // Create a blob from the chunks
      const blob = new Blob(chunks as BlobPart[], { type: contentType });

      // Convert the blob to a data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = () => {
          reject(new AppError("Failed to convert blob to data URL", ErrorType.SERVER, "CONVERSION_ERROR", 500));
        };

        reader.readAsDataURL(blob);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to download file as data URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        ErrorType.NETWORK,
        "DOWNLOAD_FAILED",
        500,
      );
    }
  }
}
