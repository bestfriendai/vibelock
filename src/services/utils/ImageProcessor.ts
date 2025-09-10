import { AppError } from "../../types/error";
import { FileValidator } from "./FileValidator";

/**
 * Utility class for processing images
 */
export class ImageProcessor {
  /**
   * Maximum dimensions for processed images
   */
  private static readonly MAX_DIMENSION = 4096;

  /**
   * Quality settings for JPEG compression (0-100)
   */
  private static readonly JPEG_QUALITY = 85;

  /**
   * Resize an image to fit within the specified dimensions
   */
  static async resizeImage(
    file: File,
    maxWidth: number = this.MAX_DIMENSION,
    maxHeight: number = this.MAX_DIMENSION,
  ): Promise<File> {
    if (!FileValidator.isImageFile(file)) {
      throw new AppError("File is not an image", "INVALID_FILE_TYPE", 400);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Create a canvas and resize the image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new AppError("Failed to get canvas context", "CANVAS_ERROR", 500));
          return;
        }

        // Draw the resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert back to a file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new AppError("Failed to create blob", "BLOB_ERROR", 500));
              return;
            }

            const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const mimeType = this.getMimeType(extension);
            const fileName = this.generateFileName(file.name, width, height);

            const resizedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(resizedFile);
          },
          this.getMimeType(file.name.split(".").pop()?.toLowerCase() || "jpg"),
          this.JPEG_QUALITY / 100,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new AppError("Failed to load image", "IMAGE_LOAD_ERROR", 500));
      };

      img.src = url;
    });
  }

  /**
   * Generate a thumbnail for an image
   */
  static async generateThumbnail(file: File, size: number = 200): Promise<File> {
    if (!FileValidator.isImageFile(file)) {
      throw new AppError("File is not an image", "INVALID_FILE_TYPE", 400);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Calculate dimensions for a square thumbnail
        let width = img.width;
        let height = img.height;

        // Crop to a square centered on the image
        const minDimension = Math.min(width, height);
        const startX = (width - minDimension) / 2;
        const startY = (height - minDimension) / 2;

        // Create a canvas and draw the thumbnail
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new AppError("Failed to get canvas context", "CANVAS_ERROR", 500));
          return;
        }

        // Draw the cropped and resized image
        ctx.drawImage(img, startX, startY, minDimension, minDimension, 0, 0, size, size);

        // Convert back to a file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new AppError("Failed to create blob", "BLOB_ERROR", 500));
              return;
            }

            const fileName = `thumb_${file.name}`;
            const mimeType = "image/jpeg";

            const thumbnailFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(thumbnailFile);
          },
          "image/jpeg",
          this.JPEG_QUALITY / 100,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new AppError("Failed to load image", "IMAGE_LOAD_ERROR", 500));
      };

      img.src = url;
    });
  }

  /**
   * Get the dimensions of an image
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    if (!FileValidator.isImageFile(file)) {
      throw new AppError("File is not an image", "INVALID_FILE_TYPE", 400);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new AppError("Failed to load image", "IMAGE_LOAD_ERROR", 500));
      };

      img.src = url;
    });
  }

  /**
   * Convert an image to a different format
   */
  static async convertImageFormat(file: File, targetFormat: "jpeg" | "png" | "webp"): Promise<File> {
    if (!FileValidator.isImageFile(file)) {
      throw new AppError("File is not an image", "INVALID_FILE_TYPE", 400);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Create a canvas with the same dimensions
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new AppError("Failed to get canvas context", "CANVAS_ERROR", 500));
          return;
        }

        // Draw the image
        ctx.drawImage(img, 0, 0);

        // Convert to the target format
        const mimeType = this.getMimeType(targetFormat);
        const extension = targetFormat === "jpeg" ? "jpg" : targetFormat;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new AppError("Failed to create blob", "BLOB_ERROR", 500));
              return;
            }

            const fileName = this.generateFileName(file.name, img.width, img.height, extension);

            const convertedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(convertedFile);
          },
          mimeType,
          this.JPEG_QUALITY / 100,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new AppError("Failed to load image", "IMAGE_LOAD_ERROR", 500));
      };

      img.src = url;
    });
  }

  /**
   * Get the MIME type for a given image format
   */
  private static getMimeType(format: string): string {
    switch (format.toLowerCase()) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      case "gif":
        return "image/gif";
      case "svg":
        return "image/svg+xml";
      default:
        return "image/jpeg";
    }
  }

  /**
   * Generate a new file name with dimensions and format
   */
  private static generateFileName(originalName: string, width?: number, height?: number, extension?: string): string {
    const baseName = originalName.split(".")[0];
    const ext = extension || originalName.split(".").pop() || "jpg";

    if (width !== undefined && height !== undefined) {
      return `${baseName}_${width}x${height}.${ext}`;
    }

    return `${baseName}.${ext}`;
  }

  /**
   * Compress an image to reduce file size
   */
  static async compressImage(
    file: File,
    quality: number = this.JPEG_QUALITY,
    maxWidth?: number,
    maxHeight?: number,
  ): Promise<File> {
    if (!FileValidator.isImageFile(file)) {
      throw new AppError("File is not an image", "INVALID_FILE_TYPE", 400);
    }

    // If dimensions are specified, resize first
    let processedFile = file;
    if (maxWidth || maxHeight) {
      processedFile = await this.resizeImage(file, maxWidth || this.MAX_DIMENSION, maxHeight || this.MAX_DIMENSION);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(processedFile);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Create a canvas with the same dimensions
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new AppError("Failed to get canvas context", "CANVAS_ERROR", 500));
          return;
        }

        // Draw the image
        ctx.drawImage(img, 0, 0);

        // Get the original file extension
        const extension = processedFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType = this.getMimeType(extension);

        // Convert with the specified quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new AppError("Failed to create blob", "BLOB_ERROR", 500));
              return;
            }

            const fileName = this.generateFileName(processedFile.name, img.width, img.height);

            const compressedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          mimeType,
          quality / 100,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new AppError("Failed to load image", "IMAGE_LOAD_ERROR", 500));
      };

      img.src = url;
    });
  }
}
