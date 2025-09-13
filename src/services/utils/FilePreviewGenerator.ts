import { AppError, ErrorType } from "../../types/error";

/**
 * Preview options
 */
export interface PreviewOptions {
  /**
   * Maximum width for image previews
   */
  maxWidth?: number;

  /**
   * Maximum height for image previews
   */
  maxHeight?: number;

  /**
   * Quality for image previews (0-1)
   */
  quality?: number;

  /**
   * Whether to generate thumbnails
   */
  generateThumbnail?: boolean;

  /**
   * Maximum length for text previews
   */
  maxTextLength?: number;

  /**
   * Whether to include metadata in preview
   */
  includeMetadata?: boolean;
}

/**
 * Preview result
 */
export interface PreviewResult {
  /**
   * The preview URL
   */
  previewUrl: string;

  /**
   * The thumbnail URL (if generated)
   */
  thumbnailUrl?: string;

  /**
   * The preview type
   */
  previewType: "image" | "text" | "video" | "audio" | "document" | "other";

  /**
   * Preview metadata
   */
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
    format?: string;
    pages?: number;
    author?: string;
    title?: string;
    creationDate?: Date;
    modificationDate?: Date;
    [key: string]: any;
  };

  /**
   * Preview content (for text files)
   */
  content?: string;

  /**
   * Generation time in milliseconds
   */
  generationTime: number;
}

/**
 * Utility class for generating file previews
 */
export class FilePreviewGenerator {
  /**
   * Default maximum width for image previews
   */
  private static readonly DEFAULT_MAX_WIDTH = 800;

  /**
   * Default maximum height for image previews
   */
  private static readonly DEFAULT_MAX_HEIGHT = 600;

  /**
   * Default quality for image previews
   */
  private static readonly DEFAULT_QUALITY = 0.8;

  /**
   * Default maximum text length for text previews
   */
  private static readonly DEFAULT_MAX_TEXT_LENGTH = 1000;

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
    "application/xhtml+xml",
  ];

  /**
   * Supported video formats for preview
   */
  private static readonly SUPPORTED_VIDEO_FORMATS = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];

  /**
   * Supported audio formats for preview
   */
  private static readonly SUPPORTED_AUDIO_FORMATS = [
    "audio/mp3",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
  ];

  /**
   * Supported document formats for preview
   */
  private static readonly SUPPORTED_DOCUMENT_FORMATS = ["application/pdf"];

  /**
   * Generate a preview for a file
   */
  static async generatePreview(file: File, options: PreviewOptions = {}): Promise<PreviewResult> {
    try {
      const startTime = performance.now();

      // Set default options
      const maxWidth = options.maxWidth ?? this.DEFAULT_MAX_WIDTH;
      const maxHeight = options.maxHeight ?? this.DEFAULT_MAX_HEIGHT;
      const quality = options.quality ?? this.DEFAULT_QUALITY;
      const maxTextLength = options.maxTextLength ?? this.DEFAULT_MAX_TEXT_LENGTH;
      const includeMetadata = options.includeMetadata ?? true;

      // Determine preview type based on file type
      let previewType: PreviewResult["previewType"] = "other";
      let previewUrl = "";
      let thumbnailUrl = "";
      let content = "";
      let metadata: PreviewResult["metadata"] = {};

      if (this.SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
        previewType = "image";
        const result = await this.generateImagePreview(file, {
          maxWidth,
          maxHeight,
          quality,
          generateThumbnail: options.generateThumbnail,
          includeMetadata,
        });
        previewUrl = result.previewUrl;
        thumbnailUrl = result.thumbnailUrl || "";
        metadata = result.metadata || {};
      } else if (this.SUPPORTED_TEXT_FORMATS.includes(file.type)) {
        previewType = "text";
        const result = await this.generateTextPreview(file, {
          maxTextLength,
          includeMetadata,
        });
        content = result.content || "";
        metadata = result.metadata || {};
        previewUrl = result.previewUrl;
      } else if (this.SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
        previewType = "video";
        const result = await this.generateVideoPreview(file, {
          includeMetadata,
        });
        previewUrl = result.previewUrl;
        metadata = result.metadata || {};
      } else if (this.SUPPORTED_AUDIO_FORMATS.includes(file.type)) {
        previewType = "audio";
        const result = await this.generateAudioPreview(file, {
          includeMetadata,
        });
        previewUrl = result.previewUrl;
        metadata = result.metadata || {};
      } else if (this.SUPPORTED_DOCUMENT_FORMATS.includes(file.type)) {
        previewType = "document";
        const result = await this.generateDocumentPreview(file, {
          includeMetadata,
        });
        previewUrl = result.previewUrl;
        metadata = result.metadata || {};
      } else {
        // For unsupported file types, create a generic preview
        previewUrl = URL.createObjectURL(file);
        metadata = {
          size: file.size,
          format: file.type,
          name: file.name,
        };
      }

      const endTime = performance.now();
      const generationTime = endTime - startTime;

      return {
        previewUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        previewType,
        metadata: includeMetadata ? metadata : undefined,
        content: content || undefined,
        generationTime,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to generate preview: ${error instanceof Error ? error.message : "Unknown error"}`,
        ErrorType.PREVIEW_GENERATION_ERROR,
        undefined,
        500,
      );
    }
  }

  /**
   * Generate an image preview
   */
  private static async generateImagePreview(
    file: File,
    options: {
      maxWidth: number;
      maxHeight: number;
      quality: number;
      generateThumbnail?: boolean;
      includeMetadata?: boolean;
    },
  ): Promise<{
    previewUrl: string;
    thumbnailUrl?: string;
    metadata?: PreviewResult["metadata"];
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // Create canvas for preview
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            URL.revokeObjectURL(imageUrl);
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Calculate dimensions for preview
          let width = img.width;
          let height = img.height;

          if (width > options.maxWidth) {
            const ratio = options.maxWidth / width;
            width = options.maxWidth;
            height = Math.floor(height * ratio);
          }

          if (height > options.maxHeight) {
            const ratio = options.maxHeight / height;
            height = options.maxHeight;
            width = Math.floor(width * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Get preview URL
          const previewUrl = canvas.toDataURL(file.type, options.quality);

          // Generate thumbnail if requested
          let thumbnailUrl = "";
          if (options.generateThumbnail) {
            const thumbCanvas = document.createElement("canvas");
            const thumbCtx = thumbCanvas.getContext("2d");

            if (thumbCtx) {
              // Thumbnail dimensions (max 200x200)
              let thumbWidth = img.width;
              let thumbHeight = img.height;

              if (thumbWidth > 200) {
                const ratio = 200 / thumbWidth;
                thumbWidth = 200;
                thumbHeight = Math.floor(thumbHeight * ratio);
              }

              if (thumbHeight > 200) {
                const ratio = 200 / thumbHeight;
                thumbHeight = 200;
                thumbWidth = Math.floor(thumbWidth * ratio);
              }

              thumbCanvas.width = thumbWidth;
              thumbCanvas.height = thumbHeight;

              thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
              thumbnailUrl = thumbCanvas.toDataURL(file.type, options.quality);
            }
          }

          // Clean up
          URL.revokeObjectURL(imageUrl);

          // Prepare metadata
          const metadata: PreviewResult["metadata"] = options.includeMetadata
            ? {
                width: img.width,
                height: img.height,
                format: file.type,
                size: file.size,
              }
            : undefined;

          resolve({
            previewUrl,
            thumbnailUrl: thumbnailUrl || undefined,
            metadata,
          });
        } catch (error) {
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error("Failed to load image"));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Generate a text preview
   */
  private static async generateTextPreview(
    file: File,
    options: {
      maxTextLength: number;
      includeMetadata?: boolean;
    },
  ): Promise<{
    previewUrl: string;
    content?: string;
    metadata?: PreviewResult["metadata"];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const content = reader.result as string;
          const truncatedContent = content.substring(0, options.maxTextLength);

          // Create a blob with the truncated content
          const blob = new Blob([truncatedContent], { type: file.type });
          const previewUrl = URL.createObjectURL(blob);

          // Prepare metadata
          const metadata: PreviewResult["metadata"] = options.includeMetadata
            ? {
                size: file.size,
                format: file.type,
                name: file.name,
                length: content.length,
                truncated: content.length > options.maxTextLength,
              }
            : undefined;

          resolve({
            previewUrl,
            content: truncatedContent,
            metadata,
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read text file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Generate a video preview
   */
  private static async generateVideoPreview(
    file: File,
    options: {
      includeMetadata?: boolean;
    },
  ): Promise<{
    previewUrl: string;
    metadata?: PreviewResult["metadata"];
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const videoUrl = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        try {
          // Prepare metadata
          const metadata: PreviewResult["metadata"] = options.includeMetadata
            ? {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                format: file.type,
                size: file.size,
              }
            : undefined;

          resolve({
            previewUrl: videoUrl,
            metadata,
          });
        } catch (error) {
          URL.revokeObjectURL(videoUrl);
          reject(error);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error("Failed to load video"));
      };

      video.src = videoUrl;
    });
  }

  /**
   * Generate an audio preview
   */
  private static async generateAudioPreview(
    file: File,
    options: {
      includeMetadata?: boolean;
    },
  ): Promise<{
    previewUrl: string;
    metadata?: PreviewResult["metadata"];
  }> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      const audioUrl = URL.createObjectURL(file);

      audio.onloadedmetadata = () => {
        try {
          // Prepare metadata
          const metadata: PreviewResult["metadata"] = options.includeMetadata
            ? {
                duration: audio.duration,
                format: file.type,
                size: file.size,
              }
            : undefined;

          resolve({
            previewUrl: audioUrl,
            metadata,
          });
        } catch (error) {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error("Failed to load audio"));
      };

      audio.src = audioUrl;
    });
  }

  /**
   * Generate a document preview
   */
  private static async generateDocumentPreview(
    file: File,
    options: {
      includeMetadata?: boolean;
    },
  ): Promise<{
    previewUrl: string;
    metadata?: PreviewResult["metadata"];
  }> {
    // For PDF files, we can create an object URL
    // In a real implementation, you might use PDF.js to render the PDF
    const previewUrl = URL.createObjectURL(file);

    // Prepare metadata
    const metadata: PreviewResult["metadata"] = options.includeMetadata
      ? {
          format: file.type,
          size: file.size,
          name: file.name,
        }
      : undefined;

    return {
      previewUrl,
      metadata,
    };
  }

  /**
   * Check if a file type can be previewed
   */
  static canPreview(fileType: string): boolean {
    return (
      this.SUPPORTED_IMAGE_FORMATS.includes(fileType) ||
      this.SUPPORTED_TEXT_FORMATS.includes(fileType) ||
      this.SUPPORTED_VIDEO_FORMATS.includes(fileType) ||
      this.SUPPORTED_AUDIO_FORMATS.includes(fileType) ||
      this.SUPPORTED_DOCUMENT_FORMATS.includes(fileType)
    );
  }

  /**
   * Get supported formats for preview
   */
  static getSupportedFormats(): string[] {
    return [
      ...this.SUPPORTED_IMAGE_FORMATS,
      ...this.SUPPORTED_TEXT_FORMATS,
      ...this.SUPPORTED_VIDEO_FORMATS,
      ...this.SUPPORTED_AUDIO_FORMATS,
      ...this.SUPPORTED_DOCUMENT_FORMATS,
    ];
  }

  /**
   * Revoke a preview URL to free up memory
   */
  static revokePreviewUrl(previewUrl: string): void {
    URL.revokeObjectURL(previewUrl);
  }
}
