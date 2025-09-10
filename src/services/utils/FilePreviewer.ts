import { AppError } from "../../types/error";
import { FileMetadata } from "../../types/storage";

/**
 * Utility class for handling file previews
 */
export class FilePreviewer {
  /**
   * Maximum file size for preview (in bytes)
   */
  private static readonly MAX_PREVIEW_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Supported image formats for preview
   */
  private static readonly SUPPORTED_IMAGE_FORMATS = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  /**
   * Supported text formats for preview
   */
  private static readonly SUPPORTED_TEXT_FORMATS = [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
    "application/xml",
    "text/xml",
  ];

  /**
   * Supported video formats for preview
   */
  private static readonly SUPPORTED_VIDEO_FORMATS = ["video/mp4", "video/webm", "video/ogg"];

  /**
   * Supported audio formats for preview
   */
  private static readonly SUPPORTED_AUDIO_FORMATS = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];

  /**
   * Supported PDF format for preview
   */
  private static readonly SUPPORTED_PDF_FORMAT = "application/pdf";

  /**
   * Generate a preview URL for a file
   */
  static async generatePreviewUrl(file: File | FileMetadata, url?: string): Promise<string> {
    try {
      if (file instanceof File) {
        // For File objects, create an object URL
        if (file.size > this.MAX_PREVIEW_SIZE) {
          throw new AppError("File too large for preview", "FILE_TOO_LARGE", 400);
        }

        if (!this.isPreviewable(file.type)) {
          throw new AppError("File type not supported for preview", "UNSUPPORTED_TYPE", 400);
        }

        return URL.createObjectURL(file);
      } else {
        // For FileMetadata objects, use the provided URL
        if (!url) {
          throw new AppError("URL is required for FileMetadata", "MISSING_URL", 400);
        }

        if (file.size > this.MAX_PREVIEW_SIZE) {
          throw new AppError("File too large for preview", "FILE_TOO_LARGE", 400);
        }

        if (!this.isPreviewable(file.type)) {
          throw new AppError("File type not supported for preview", "UNSUPPORTED_TYPE", 400);
        }

        return url;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to generate preview URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        "PREVIEW_FAILED",
        500,
      );
    }
  }

  /**
   * Generate a thumbnail for an image file
   */
  static async generateThumbnail(file: File, maxWidth: number = 200, maxHeight: number = 200): Promise<string> {
    try {
      if (!this.isImageFile(file)) {
        throw new AppError("File is not a supported image format", "UNSUPPORTED_TYPE", 400);
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          // Calculate dimensions for the thumbnail
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          // Create a canvas and draw the thumbnail
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new AppError("Failed to get canvas context", "CANVAS_ERROR", 500));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to a data URL
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new AppError("Failed to load image", "IMAGE_LOAD_ERROR", 500));
        };

        img.src = url;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to generate thumbnail: ${error instanceof Error ? error.message : "Unknown error"}`,
        "THUMBNAIL_FAILED",
        500,
      );
    }
  }

  /**
   * Get the content of a text file for preview
   */
  static async getTextContent(file: File): Promise<string> {
    try {
      if (!this.isTextFile(file)) {
        throw new AppError("File is not a supported text format", "UNSUPPORTED_TYPE", 400);
      }

      if (file.size > this.MAX_PREVIEW_SIZE) {
        throw new AppError("File too large for preview", "FILE_TOO_LARGE", 400);
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = () => {
          reject(new AppError("Failed to read file", "FILE_READ_ERROR", 500));
        };

        reader.readAsText(file);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to get text content: ${error instanceof Error ? error.message : "Unknown error"}`,
        "TEXT_CONTENT_FAILED",
        500,
      );
    }
  }

  /**
   * Check if a file type is previewable
   */
  static isPreviewable(mimeType: string): boolean {
    return (
      this.isImageFile({ type: mimeType } as File) ||
      this.isTextFile({ type: mimeType } as File) ||
      this.isVideoFile({ type: mimeType } as File) ||
      this.isAudioFile({ type: mimeType } as File) ||
      this.isPdfFile({ type: mimeType } as File)
    );
  }

  /**
   * Check if a file is an image
   */
  static isImageFile(file: File | FileMetadata): boolean {
    return this.SUPPORTED_IMAGE_FORMATS.includes(file.type);
  }

  /**
   * Check if a file is a text file
   */
  static isTextFile(file: File | FileMetadata): boolean {
    return this.SUPPORTED_TEXT_FORMATS.includes(file.type);
  }

  /**
   * Check if a file is a video file
   */
  static isVideoFile(file: File | FileMetadata): boolean {
    return this.SUPPORTED_VIDEO_FORMATS.includes(file.type);
  }

  /**
   * Check if a file is an audio file
   */
  static isAudioFile(file: File | FileMetadata): boolean {
    return this.SUPPORTED_AUDIO_FORMATS.includes(file.type);
  }

  /**
   * Check if a file is a PDF file
   */
  static isPdfFile(file: File | FileMetadata): boolean {
    return file.type === this.SUPPORTED_PDF_FORMAT;
  }

  /**
   * Get the preview type for a file
   */
  static getPreviewType(file: File | FileMetadata): "image" | "text" | "video" | "audio" | "pdf" | "unsupported" {
    if (this.isImageFile(file)) {
      return "image";
    }

    if (this.isTextFile(file)) {
      return "text";
    }

    if (this.isVideoFile(file)) {
      return "video";
    }

    if (this.isAudioFile(file)) {
      return "audio";
    }

    if (this.isPdfFile(file)) {
      return "pdf";
    }

    return "unsupported";
  }

  /**
   * Clean up preview URLs
   */
  static cleanupPreviewUrl(url: string): void {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Get a generic icon for a file type
   */
  static getGenericIcon(mimeType: string): string {
    const type = this.getPreviewType({ type: mimeType } as FileMetadata);

    switch (type) {
      case "image":
        return "🖼️";
      case "text":
        return "📄";
      case "video":
        return "🎬";
      case "audio":
        return "🎵";
      case "pdf":
        return "📕";
      default:
        return "📎";
    }
  }

  /**
   * Get a color for a file type
   */
  static getFileTypeColor(mimeType: string): string {
    const type = this.getPreviewType({ type: mimeType } as FileMetadata);

    switch (type) {
      case "image":
        return "#4CAF50"; // Green
      case "text":
        return "#2196F3"; // Blue
      case "video":
        return "#FF9800"; // Orange
      case "audio":
        return "#9C27B0"; // Purple
      case "pdf":
        return "#F44336"; // Red
      default:
        return "#9E9E9E"; // Grey
    }
  }
}
