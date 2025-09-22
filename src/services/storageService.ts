import supabase from "../config/supabase";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import { AppError, ErrorType, parseSupabaseError } from "../utils/errorHandling";
import { Alert } from "react-native";

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface FileUploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  upsert?: boolean;
}

class StorageService {
  private readonly buckets = {
    AVATARS: "avatars",
    REVIEW_IMAGES: "review-images",
    CHAT_MEDIA: "chat-media",
    DOCUMENTS: "documents",
  };

  // File validation constants
  private readonly ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  private readonly ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
  private readonly ALLOWED_AUDIO_TYPES = ["audio/mp4", "audio/mpeg", "audio/wav"];
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // Magic bytes for file type validation
  private readonly MAGIC_BYTES = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "image/webp": [
      [0x52, 0x49, 0x46, 0x46],
      [0x57, 0x45, 0x42, 0x50],
    ], // RIFF...WEBP
    "video/mp4": [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ],
    "video/quicktime": [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74]],
    "audio/mp4": [[0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41]],
    "audio/mpeg": [
      [0xff, 0xfb],
      [0xff, 0xf3],
      [0xff, 0xf2],
    ],
    "audio/wav": [[0x52, 0x49, 0x46, 0x46]],
  };

  /**
   * Sanitize file path to prevent directory traversal attacks
   * Enhanced security implementation with comprehensive path validation
   */
  private sanitizePath(path: string): string {
    if (!path || typeof path !== "string") {
      throw new AppError("Invalid file path: path must be a non-empty string", ErrorType.VALIDATION, "INVALID_PATH");
    }

    // Remove null bytes and control characters
    let sanitized = path.replace(/[\x00-\x1f\x7f-\x9f]/g, "");

    // Remove various directory traversal patterns
    sanitized = sanitized
      .replace(/\.\.\//g, "") // Remove ../
      .replace(/\.\.\\/g, "") // Remove ..\
      .replace(/\.\.%2f/gi, "") // Remove URL encoded ../
      .replace(/\.\.%5c/gi, "") // Remove URL encoded ..\
      .replace(/%2e%2e%2f/gi, "") // Remove double URL encoded ../
      .replace(/%2e%2e%5c/gi, "") // Remove double URL encoded ..\
      .replace(/\\/g, "/") // Normalize backslashes to forward slashes
      .replace(/\/+/g, "/") // Normalize multiple slashes
      .replace(/^\/+|\/+$/g, ""); // Remove leading/trailing slashes

    // Additional security checks
    if (
      sanitized.includes("..") ||
      sanitized.includes("%2e%2e") ||
      sanitized.includes("~") ||
      sanitized.includes("$") ||
      sanitized.match(/[<>:"|?*]/)
    ) {
      throw new AppError("Invalid file path: contains forbidden characters", ErrorType.VALIDATION, "PATH_TRAVERSAL");
    }

    // Ensure path doesn't start with system directories
    const forbiddenPrefixes = ["etc/", "var/", "usr/", "bin/", "sbin/", "root/", "home/", "tmp/", "proc/", "sys/"];
    const lowerPath = sanitized.toLowerCase();
    if (forbiddenPrefixes.some((prefix) => lowerPath.startsWith(prefix))) {
      throw new AppError(
        "Invalid file path: system directory access denied",
        ErrorType.VALIDATION,
        "SYSTEM_PATH_ACCESS",
      );
    }

    // Limit path length
    if (sanitized.length > 255) {
      throw new AppError("Invalid file path: path too long", ErrorType.VALIDATION, "PATH_TOO_LONG");
    }

    // Additional check: ensure path doesn't contain consecutive dots that could be used for traversal
    if (sanitized.match(/\.{2,}/)) {
      throw new AppError("Invalid file path: contains suspicious dot patterns", ErrorType.VALIDATION, "DOT_PATTERN");
    }

    return sanitized;
  }

  /**
   * Comprehensive file validation including size, MIME type, and magic bytes
   */
  private async validateFile(fileUri: string, expectedType: "image" | "video" | "audio"): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new AppError("File does not exist", ErrorType.VALIDATION, "FILE_NOT_FOUND");
    }

    // Check file size
    if (fileInfo.size && fileInfo.size > this.MAX_FILE_SIZE) {
      throw new AppError("File too large (max 50MB)", ErrorType.VALIDATION, "FILE_TOO_LARGE");
    }

    // Validate MIME type
    const contentType = this.getContentType(fileUri);
    const allowedTypes =
      expectedType === "image"
        ? this.ALLOWED_IMAGE_TYPES
        : expectedType === "video"
          ? this.ALLOWED_VIDEO_TYPES
          : this.ALLOWED_AUDIO_TYPES;

    if (!allowedTypes.includes(contentType)) {
      throw new AppError(`Invalid file type: ${contentType}`, ErrorType.VALIDATION, "INVALID_FILE_TYPE");
    }

    // Check file header (magic bytes) to prevent MIME type spoofing
    await this.validateFileHeader(fileUri, contentType);
  }

  /**
   * Validate file header using magic bytes to prevent MIME type spoofing
   */
  private async validateFileHeader(fileUri: string, expectedType: string): Promise<void> {
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64" as any,
        length: 20, // Read first 20 bytes
      });

      const bytes = atob(base64);
      const header = Array.from(bytes).map((char) => char.charCodeAt(0));

      // Validate magic bytes for the expected file type
      const isValidHeader = this.checkMagicBytes(header, expectedType);
      if (!isValidHeader) {
        throw new AppError("File header validation failed", ErrorType.VALIDATION, "INVALID_FILE_HEADER");
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to validate file header", ErrorType.VALIDATION, "HEADER_VALIDATION_ERROR");
    }
  }

  /**
   * Check if file header matches expected magic bytes
   */
  private checkMagicBytes(header: number[], expectedType: string): boolean {
    const magicBytes = this.MAGIC_BYTES[expectedType as keyof typeof this.MAGIC_BYTES];
    if (!magicBytes) return false;

    return magicBytes.some((pattern) => {
      if (header.length < pattern.length) return false;
      return pattern.every((byte, index) => header[index] === byte);
    });
  }

  /**
   * Upload a file to Supabase storage with comprehensive security validation
   */
  async uploadFile(fileUri: string, options: FileUploadOptions): Promise<UploadResult> {
    try {
      // Check authentication - but allow anonymous uploads for review images to maximize user review posting
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // Allow anonymous uploads for review images (per user preference to maximize review posting)
      const allowAnonymous = options.bucket === this.buckets.REVIEW_IMAGES;

      if (!allowAnonymous && (authError || !user)) {
        throw new AppError("Authentication required. Please sign in and try again.", ErrorType.AUTH, "AUTH_REQUIRED");
      }

      if (allowAnonymous && !user) {
      } else if (user) {
      }

      // Validate bucket name to prevent injection attacks
      this.validateBucket(options.bucket);

      // Determine file type for validation
      const contentType = options.contentType || this.getContentType(fileUri);
      let expectedType: "image" | "video" | "audio" = "image";

      if (this.ALLOWED_VIDEO_TYPES.includes(contentType)) {
        expectedType = "video";
      } else if (this.ALLOWED_AUDIO_TYPES.includes(contentType)) {
        expectedType = "audio";
      }

      // Comprehensive file validation (size, MIME type, magic bytes)
      await this.validateFile(fileUri, expectedType);

      // Generate file name if not provided
      const fileName = options.fileName || this.generateFileName(fileUri);
      const rawFilePath = options.folder ? `${options.folder}/${fileName}` : fileName;
      const filePath = this.sanitizePath(rawFilePath);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64" as any,
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      // Upload to Supabase (contentType already determined above)
      const { data, error } = await supabase.storage.from(options.bucket).upload(filePath, arrayBuffer, {
        contentType,
        upsert: options.upsert || false,
      });

      if (error) {
        const appError = parseSupabaseError(error);
        throw appError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(options.bucket).getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      // Safely handle error construction to avoid worklet issues
      try {
        const appError = error instanceof AppError ? error : parseSupabaseError(error);
        throw appError;
      } catch (constructionError) {
        // Fallback to simple error if class construction fails
        throw new Error(`File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatarImage(fileUri: string, userId: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, {
      bucket: this.buckets.AVATARS,
      folder: userId,
      fileName: `avatar-${Date.now()}.jpg`,
      contentType: "image/jpeg",
      upsert: true,
    });
  }

  /**
   * Upload review image
   */
  async uploadReviewImage(fileUri: string, reviewId: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, {
      bucket: this.buckets.REVIEW_IMAGES,
      folder: reviewId,
      fileName: `review-image-${Date.now()}.jpg`,
      contentType: "image/jpeg",
    });
  }

  /**
   * Upload chat media
   */
  async uploadChatMedia(fileUri: string, userId: string, chatRoomId: string): Promise<UploadResult> {
    const contentType = this.getContentType(fileUri);
    const extension = fileUri.split(".").pop()?.toLowerCase() || "jpg";

    return this.uploadFile(fileUri, {
      bucket: this.buckets.CHAT_MEDIA,
      folder: `${userId}/${chatRoomId}`,
      fileName: `chat-media-${Date.now()}.${extension}`,
      contentType,
    });
  }

  /**
   * Upload chat audio
   */
  async uploadChatAudio(fileUri: string, userId: string, chatRoomId: string): Promise<UploadResult> {
    const extension = fileUri.split(".").pop()?.toLowerCase() || "m4a";

    return this.uploadFile(fileUri, {
      bucket: this.buckets.CHAT_MEDIA,
      folder: `${userId}/${chatRoomId}/audio`,
      fileName: `voice-${Date.now()}.${extension}`,
      contentType: this.getContentType(fileUri),
    });
  }

  /**
   * Upload document
   */
  async uploadDocument(fileUri: string, userId: string, documentType: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, {
      bucket: this.buckets.DOCUMENTS,
      folder: `${userId}/${documentType}`,
      contentType: "application/pdf",
    });
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, filePath: string): Promise<boolean> {
    try {
      // Validate bucket name to prevent injection attacks
      this.validateBucket(bucket);
      // Sanitize file path to prevent directory traversal attacks
      const sanitizedPath = this.sanitizePath(filePath);

      const { error } = await supabase.storage.from(bucket).remove([sanitizedPath]);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, filePath: string): string {
    try {
      // Validate bucket name to prevent injection attacks
      this.validateBucket(bucket);

      // Sanitize file path to prevent directory traversal attacks
      const sanitizedPath = this.sanitizePath(filePath);

      const { data } = supabase.storage.from(bucket).getPublicUrl(sanitizedPath);
      return data.publicUrl;
    } catch (error) {
      return "";
    }
  }

  /**
   * Create signed URL for private files
   */
  async createSignedUrl(bucket: string, filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      // Validate bucket name to prevent injection attacks
      this.validateBucket(bucket);

      // Sanitize file path to prevent directory traversal attacks
      const sanitizedPath = this.sanitizePath(filePath);

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(sanitizedPath, expiresIn);

      if (error) {
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      return null;
    }
  }

  /**
   * Pick image from gallery or camera
   */
  async pickImage(
    options: {
      allowsEditing?: boolean;
      aspect?: [number, number];
      quality?: number;
      source?: "gallery" | "camera";
    } = {},
  ): Promise<ImagePicker.ImagePickerResult> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Media library permission not granted");
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        quality: options.quality ?? 0.8,
      };

      let result: ImagePicker.ImagePickerResult;

      if (options.source === "camera") {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== "granted") {
          throw new Error("Camera permission not granted");
        }
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Compress image before upload
   */
  async compressImage(uri: string, quality: number = 0.8): Promise<string> {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Resize to max width of 1024px
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
      );

      return manipResult.uri;
    } catch (error) {
      Alert.alert("Warning", "Image not compressed. Upload may be large.");
      return uri; // Return original if compression fails
    }
  }

  /**
   * Generate a secure file name with timestamp and random suffix
   * Enhanced with additional security measures
   */
  private generateFileName(fileUri: string): string {
    const extension = this.sanitizeFileExtension(fileUri.split(".").pop() || "jpg");
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.${extension}`;
  }

  /**
   * Sanitize file extension to prevent malicious extensions
   */
  private sanitizeFileExtension(extension: string): string {
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "mp4", "mov", "mp3", "wav", "m4a"];
    const cleanExt = extension.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!allowedExtensions.includes(cleanExt)) {
      return "jpg"; // Default to safe extension
    }

    return cleanExt;
  }

  /**
   * Validate bucket name to prevent injection attacks
   */
  private validateBucket(bucket: string): void {
    const validBuckets = Object.values(this.buckets);
    if (!validBuckets.includes(bucket)) {
      throw new AppError("Invalid storage bucket", ErrorType.VALIDATION, "INVALID_BUCKET");
    }
  }

  /**
   * Get content type from file URI
   */
  private getContentType(fileUri: string): string {
    const extension = fileUri.split(".").pop()?.toLowerCase();

    switch (extension) {
      // Images
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";

      // Videos
      case "mp4":
        return "video/mp4";
      case "mov":
        return "video/quicktime";
      case "avi":
        return "video/x-msvideo";

      // Audio
      case "mp3":
        return "audio/mpeg";
      case "m4a":
        return "audio/mp4";
      case "wav":
        return "audio/wav";
      case "aac":
        return "audio/aac";

      // Documents
      case "pdf":
        return "application/pdf";
      case "doc":
        return "application/msword";
      case "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      default:
        return "application/octet-stream";
    }
  }

  /**
   * Get available buckets
   */
  getBuckets() {
    return this.buckets;
  }

  /**
   * List files in a bucket folder
   */
  async listFiles(bucket: string, folder?: string, limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit,
        offset: 0,
      });

      if (error) {
        const appError = parseSupabaseError(error);
        throw appError;
      }

      return data || [];
    } catch (error) {
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw appError;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
