import { AppError } from "../../types/error";

/**
 * Compression options
 */
export interface CompressionOptions {
  /**
   * Compression level (0-9)
   */
  level?: number;

  /**
   * Whether to use GZIP compression
   */
  useGzip?: boolean;

  /**
   * Whether to use Deflate compression
   */
  useDeflate?: boolean;

  /**
   * Whether to use Brotli compression
   */
  useBrotli?: boolean;

  /**
   * Maximum file size for compression in bytes
   */
  maxFileSize?: number;

  /**
   * Minimum file size for compression in bytes
   */
  minFileSize?: number;

  /**
   * File types to exclude from compression
   */
  excludeTypes?: string[];

  /**
   * File extensions to exclude from compression
   */
  excludeExtensions?: string[];
}

/**
 * Compression result
 */
export interface CompressionResult {
  /**
   * The compressed file as a Blob
   */
  compressedFile: Blob;

  /**
   * The original file size in bytes
   */
  originalSize: number;

  /**
   * The compressed file size in bytes
   */
  compressedSize: number;

  /**
   * The compression ratio (0-1)
   */
  compressionRatio: number;

  /**
   * The compression method used
   */
  compressionMethod: "gzip" | "deflate" | "brotli" | "none";

  /**
   * Compression time in milliseconds
   */
  compressionTime: number;

  /**
   * Whether the compression was successful
   */
  success: boolean;

  /**
   * Error message if compression failed
   */
  error?: string;
}

/**
 * Decompression options
 */
export interface DecompressionOptions {
  /**
   * Maximum file size for decompression in bytes
   */
  maxFileSize?: number;

  /**
   * Whether to validate the decompressed file
   */
  validate?: boolean;
}

/**
 * Decompression result
 */
export interface DecompressionResult {
  /**
   * The decompressed file as a Blob
   */
  decompressedFile: Blob;

  /**
   * The compressed file size in bytes
   */
  compressedSize: number;

  /**
   * The decompressed file size in bytes
   */
  decompressedSize: number;

  /**
   * The compression method used
   */
  compressionMethod: "gzip" | "deflate" | "brotli" | "unknown";

  /**
   * Decompression time in milliseconds
   */
  decompressionTime: number;

  /**
   * Whether the decompression was successful
   */
  success: boolean;

  /**
   * Error message if decompression failed
   */
  error?: string;
}

/**
 * Utility class for compressing and decompressing files
 */
export class FileCompressor {
  /**
   * Default compression level (6)
   */
  private static readonly DEFAULT_COMPRESSION_LEVEL = 6;

  /**
   * Default maximum file size for compression (100MB)
   */
  private static readonly DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024;

  /**
   * Default minimum file size for compression (1KB)
   */
  private static readonly DEFAULT_MIN_FILE_SIZE = 1024;

  /**
   * File types that should not be compressed (already compressed)
   */
  private static readonly NON_COMPRESSIBLE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "audio/mp3",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "application/zip",
    "application/gzip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/x-gtar",
  ];

  /**
   * File extensions that should not be compressed (already compressed)
   */
  private static readonly NON_COMPRESSIBLE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".mp4",
    ".webm",
    ".ogg",
    ".mp3",
    ".wav",
    ".aac",
    ".zip",
    ".gz",
    ".rar",
    ".7z",
    ".tar",
    ".tgz",
  ];

  /**
   * Compress a file
   */
  static async compressFile(file: File, options: CompressionOptions = {}): Promise<CompressionResult> {
    try {
      const startTime = performance.now();

      // Set default options
      const level = options.level ?? this.DEFAULT_COMPRESSION_LEVEL;
      const useGzip = options.useGzip ?? true;
      const useDeflate = options.useDeflate ?? false;
      const useBrotli = options.useBrotli ?? false;
      const maxFileSize = options.maxFileSize ?? this.DEFAULT_MAX_FILE_SIZE;
      const minFileSize = options.minFileSize ?? this.DEFAULT_MIN_FILE_SIZE;
      const excludeTypes = [...this.NON_COMPRESSIBLE_TYPES, ...(options.excludeTypes ?? [])];
      const excludeExtensions = [...this.NON_COMPRESSIBLE_EXTENSIONS, ...(options.excludeExtensions ?? [])];

      // Initialize result
      const result: CompressionResult = {
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        compressionMethod: "none",
        compressionTime: 0,
        success: false,
      };

      // Check if file should be compressed
      const fileExtension = this.getFileExtension(file.name);

      if (
        file.size > maxFileSize ||
        file.size < minFileSize ||
        excludeTypes.includes(file.type) ||
        excludeExtensions.includes(fileExtension)
      ) {
        result.success = true;
        result.compressionTime = performance.now() - startTime;
        return result;
      }

      // Determine compression method
      let compressionMethod: "gzip" | "deflate" | "brotli" = "gzip";

      if (useBrotli && typeof CompressionStream !== "undefined") {
        compressionMethod = "brotli";
      } else if (useDeflate && typeof CompressionStream !== "undefined") {
        compressionMethod = "deflate";
      } else if (!useGzip) {
        // No compression method available or selected
        result.success = true;
        result.compressionTime = performance.now() - startTime;
        return result;
      }

      // Compress the file
      try {
        const compressedBlob = await this.compressBlob(file, compressionMethod, level);

        result.compressedFile = compressedBlob;
        result.compressedSize = compressedBlob.size;
        result.compressionRatio = 1 - compressedBlob.size / file.size;
        result.compressionMethod = compressionMethod;
        result.success = true;
      } catch (error) {
        result.error = error instanceof Error ? error.message : "Unknown error";

        // Fall back to original file
        result.compressedFile = file;
        result.compressedSize = file.size;
        result.compressionRatio = 0;
        result.compressionMethod = "none";
        result.success = true;
      }

      result.compressionTime = performance.now() - startTime;
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to compress file: ${error instanceof Error ? error.message : "Unknown error"}`,
        "COMPRESSION_ERROR",
        500,
      );
    }
  }

  /**
   * Decompress a file
   */
  static async decompressFile(blob: Blob, options: DecompressionOptions = {}): Promise<DecompressionResult> {
    try {
      const startTime = performance.now();

      // Set default options
      const maxFileSize = options.maxFileSize ?? this.DEFAULT_MAX_FILE_SIZE;
      const validate = options.validate ?? true;

      // Initialize result
      const result: DecompressionResult = {
        decompressedFile: blob,
        compressedSize: blob.size,
        decompressedSize: blob.size,
        compressionMethod: "unknown",
        decompressionTime: 0,
        success: false,
      };

      // Try to detect compression method
      let compressionMethod: "gzip" | "deflate" | "brotli" | "unknown" = "unknown";

      // Check for magic numbers
      const arrayBuffer = await blob.slice(0, 10).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // GZIP magic numbers: 0x1f, 0x8b
      if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
        compressionMethod = "gzip";
      }
      // Zlib magic numbers: 0x78, 0x01, 0x78, 0x9c, 0x78, 0xda
      else if (
        (uint8Array[0] === 0x78 && uint8Array[1] === 0x01) ||
        (uint8Array[0] === 0x78 && uint8Array[1] === 0x9c) ||
        (uint8Array[0] === 0x78 && uint8Array[1] === 0xda)
      ) {
        compressionMethod = "deflate";
      }
      // Brotli magic numbers: 0x1f, 0x8b (same as GZIP, but we'll try Brotli first)
      else if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
        compressionMethod = "brotli";
      }

      result.compressionMethod = compressionMethod;

      // If no compression method detected, return original blob
      if (compressionMethod === "unknown") {
        result.success = true;
        result.decompressionTime = performance.now() - startTime;
        return result;
      }

      // Decompress the file
      try {
        const decompressedBlob = await this.decompressBlob(blob, compressionMethod);

        // Check if decompressed file is too large
        if (decompressedBlob.size > maxFileSize) {
          throw new Error(`Decompressed file exceeds maximum size of ${this.formatFileSize(maxFileSize)}`);
        }

        result.decompressedFile = decompressedBlob;
        result.decompressedSize = decompressedBlob.size;
        result.success = true;
      } catch (error) {
        result.error = error instanceof Error ? error.message : "Unknown error";

        // Fall back to original blob
        result.decompressedFile = blob;
        result.decompressedSize = blob.size;
        result.success = false;
      }

      result.decompressionTime = performance.now() - startTime;
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to decompress file: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DECOMPRESSION_ERROR",
        500,
      );
    }
  }

  /**
   * Compress a blob using the specified method
   */
  private static async compressBlob(blob: Blob, method: "gzip" | "deflate" | "brotli", level: number): Promise<Blob> {
    if (typeof CompressionStream === "undefined") {
      throw new Error("CompressionStream API is not supported in this browser");
    }

    let compressionFormat: CompressionFormat;

    switch (method) {
      case "gzip":
        compressionFormat = "gzip";
        break;
      case "deflate":
        compressionFormat = "deflate";
        break;
      case "brotli":
        compressionFormat = "brotli";
        break;
      default:
        throw new Error(`Unsupported compression method: ${method}`);
    }

    const compressionStream = new CompressionStream(compressionFormat);
    const readableStream = blob.stream().pipeThrough(compressionStream);

    return new Response(readableStream).blob();
  }

  /**
   * Decompress a blob using the specified method
   */
  private static async decompressBlob(blob: Blob, method: "gzip" | "deflate" | "brotli"): Promise<Blob> {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("DecompressionStream API is not supported in this browser");
    }

    let decompressionFormat: CompressionFormat;

    switch (method) {
      case "gzip":
        decompressionFormat = "gzip";
        break;
      case "deflate":
        decompressionFormat = "deflate";
        break;
      case "brotli":
        decompressionFormat = "brotli";
        break;
      default:
        throw new Error(`Unsupported decompression method: ${method}`);
    }

    const decompressionStream = new DecompressionStream(decompressionFormat);
    const readableStream = blob.stream().pipeThrough(decompressionStream);

    return new Response(readableStream).blob();
  }

  /**
   * Get file extension from file name
   */
  private static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return "";
    }
    return fileName.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Format file size in human-readable format
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Check if a file type is compressible
   */
  static isCompressible(fileType: string): boolean {
    return !this.NON_COMPRESSIBLE_TYPES.includes(fileType);
  }

  /**
   * Check if a file extension is compressible
   */
  static isCompressibleExtension(fileExtension: string): boolean {
    return !this.NON_COMPRESSIBLE_EXTENSIONS.includes(fileExtension.toLowerCase());
  }

  /**
   * Check if the browser supports compression
   */
  static isCompressionSupported(): boolean {
    return typeof CompressionStream !== "undefined";
  }

  /**
   * Check if the browser supports decompression
   */
  static isDecompressionSupported(): boolean {
    return typeof DecompressionStream !== "undefined";
  }

  /**
   * Get supported compression methods
   */
  static getSupportedCompressionMethods(): ("gzip" | "deflate" | "brotli")[] {
    const methods: ("gzip" | "deflate" | "brotli")[] = [];

    if (typeof CompressionStream !== "undefined") {
      methods.push("gzip");
      methods.push("deflate");

      // Check if Brotli is supported
      try {
        new CompressionStream("brotli");
        methods.push("brotli");
      } catch {
        // Brotli not supported
      }
    }

    return methods;
  }
}
