import { AppError } from "../../types/error";

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;

  /**
   * Minimum file size in bytes
   */
  minSize?: number;

  /**
   * Allowed file types
   */
  allowedTypes?: string[];

  /**
   * Blocked file types
   */
  blockedTypes?: string[];

  /**
   * Allowed file extensions
   */
  allowedExtensions?: string[];

  /**
   * Blocked file extensions
   */
  blockedExtensions?: string[];

  /**
   * Whether to validate file content
   */
  validateContent?: boolean;

  /**
   * Whether to scan for malware
   */
  scanForMalware?: boolean;

  /**
   * Custom validation rules
   */
  customRules?: {
    [key: string]: (file: File) => boolean | Promise<boolean>;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether the file is valid
   */
  isValid: boolean;

  /**
   * Validation errors
   */
  errors: AppError[];

  /**
   * Validation warnings
   */
  warnings: string[];

  /**
   * File metadata
   */
  metadata?: {
    size: number;
    type: string;
    name: string;
    extension: string;
    lastModified: number;
    [key: string]: any;
  };

  /**
   * Validation time in milliseconds
   */
  validationTime: number;
}

/**
 * Utility class for validating files
 */
export class FileValidator {
  /**
   * Default maximum file size (50MB)
   */
  private static readonly DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

  /**
   * Default minimum file size (1 byte)
   */
  private static readonly DEFAULT_MIN_SIZE = 1;

  /**
   * Common dangerous file extensions
   */
  private static readonly DANGEROUS_EXTENSIONS = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".scr",
    ".pif",
    ".jar",
    ".app",
    ".deb",
    ".pkg",
    ".dmg",
    ".iso",
    ".bin",
    ".sh",
    ".php",
    ".asp",
    ".aspx",
    ".jsp",
    ".cgi",
    ".pl",
    ".py",
    ".rb",
    ".js",
    ".vbs",
    ".ps1",
    ".reg",
    ".dll",
    ".sys",
    ".drv",
    ".ocx",
    ".cpl",
    ".msc",
    ".msp",
    ".mst",
    ".ws",
    ".wsc",
    ".wsf",
    ".wsh",
  ];

  /**
   * Common dangerous file types
   */
  private static readonly DANGEROUS_TYPES = [
    "application/x-msdownload",
    "application/x-msdos-program",
    "application/x-ms-shortcut",
    "application/x-sh",
    "application/x-shellscript",
    "application/x-php",
    "application/x-asp",
    "application/x-javascript",
    "application/x-perl",
    "application/x-python",
    "application/x-ruby",
    "application/x-tcl",
    "application/x-vbscript",
    "application/xml-dtd",
    "text/x-php",
    "text/x-perl",
    "text/x-python",
    "text/x-ruby",
    "text/x-shellscript",
  ];

  /**
   * Validate a file against the given options
   */
  static async validateFile(file: File, options: ValidationOptions = {}): Promise<ValidationResult> {
    try {
      const startTime = performance.now();

      // Set default options
      const maxSize = options.maxSize ?? this.DEFAULT_MAX_SIZE;
      const minSize = options.minSize ?? this.DEFAULT_MIN_SIZE;
      const allowedTypes = options.allowedTypes ?? [];
      const blockedTypes = [...this.DANGEROUS_TYPES, ...(options.blockedTypes ?? [])];
      const allowedExtensions = options.allowedExtensions ?? [];
      const blockedExtensions = [...this.DANGEROUS_EXTENSIONS, ...(options.blockedExtensions ?? [])];
      const validateContent = options.validateContent ?? false;
      const scanForMalware = options.scanForMalware ?? false;
      const customRules = options.customRules ?? {};

      // Initialize result
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: file.size,
          type: file.type,
          name: file.name,
          extension: this.getFileExtension(file.name),
          lastModified: file.lastModified,
        },
        validationTime: 0,
      };

      // Validate file size
      if (file.size > maxSize) {
        result.isValid = false;
        result.errors.push(
          new AppError(
            `File size exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`,
            "FILE_TOO_LARGE",
            400,
          ),
        );
      }

      if (file.size < minSize) {
        result.isValid = false;
        result.errors.push(
          new AppError(
            `File size is below minimum allowed size of ${this.formatFileSize(minSize)}`,
            "FILE_TOO_SMALL",
            400,
          ),
        );
      }

      // Validate file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        result.isValid = false;
        result.errors.push(new AppError(`File type "${file.type}" is not allowed`, "INVALID_FILE_TYPE", 400));
      }

      if (blockedTypes.includes(file.type)) {
        result.isValid = false;
        result.errors.push(
          new AppError(`File type "${file.type}" is blocked for security reasons`, "BLOCKED_FILE_TYPE", 400),
        );
      }

      // Validate file extension
      const fileExtension = this.getFileExtension(file.name);

      if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExtension)) {
        result.isValid = false;
        result.errors.push(
          new AppError(`File extension "${fileExtension}" is not allowed`, "INVALID_FILE_EXTENSION", 400),
        );
      }

      if (blockedExtensions.includes(fileExtension)) {
        result.isValid = false;
        result.errors.push(
          new AppError(
            `File extension "${fileExtension}" is blocked for security reasons`,
            "BLOCKED_FILE_EXTENSION",
            400,
          ),
        );
      }

      // Validate file content if requested
      if (validateContent && result.isValid) {
        try {
          const contentValidationResult = await this.validateFileContent(file);
          if (!contentValidationResult.isValid) {
            result.isValid = false;
            result.errors.push(...contentValidationResult.errors);
          }
          result.warnings.push(...contentValidationResult.warnings);
        } catch (error) {
          result.warnings.push(
            `Failed to validate file content: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Scan for malware if requested
      if (scanForMalware && result.isValid) {
        try {
          const malwareScanResult = await this.scanForMalware(file);
          if (!malwareScanResult.isClean) {
            result.isValid = false;
            result.errors.push(
              new AppError(
                `File may contain malware: ${malwareScanResult.threats.join(", ")}`,
                "MALWARE_DETECTED",
                400,
              ),
            );
          }
        } catch (error) {
          result.warnings.push(
            `Failed to scan for malware: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Apply custom validation rules
      for (const [ruleName, ruleFunction] of Object.entries(customRules)) {
        try {
          const ruleResult = await ruleFunction(file);
          if (!ruleResult) {
            result.isValid = false;
            result.errors.push(
              new AppError(`File failed custom validation rule: ${ruleName}`, "CUSTOM_VALIDATION_FAILED", 400),
            );
          }
        } catch (error) {
          result.warnings.push(
            `Failed to apply custom validation rule "${ruleName}": ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      const endTime = performance.now();
      result.validationTime = endTime - startTime;

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to validate file: ${error instanceof Error ? error.message : "Unknown error"}`,
        "VALIDATION_ERROR",
        500,
      );
    }
  }

  /**
   * Validate file content
   */
  private static async validateFileContent(file: File): Promise<{
    isValid: boolean;
    errors: AppError[];
    warnings: string[];
  }> {
    return new Promise((resolve) => {
      const result = {
        isValid: true,
        errors: [] as AppError[],
        warnings: [] as string[],
      };

      // For text files, we can check for suspicious content
      if (file.type.startsWith("text/") || file.type === "application/json") {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            const content = reader.result as string;

            // Check for suspicious patterns in text files
            const suspiciousPatterns = [
              /<script[^>]*>.*?<\/script>/gis, // Script tags
              /javascript\s*:/gis, // JavaScript protocol
              /eval\s*\(/gis, // eval() function
              /document\.(write|cookie)/gis, // Document manipulation
              /window\.(location|open)/gis, // Window manipulation
              /<\?php/gis, // PHP code
              /<%.*?%>/gis, // ASP code
              /system\s*\(/gis, // System calls
              /exec\s*\(/gis, // Exec calls
              /shell_exec\s*\(/gis, // Shell exec calls
              /passthru\s*\(/gis, // Passthru calls
            ];

            for (const pattern of suspiciousPatterns) {
              if (pattern.test(content)) {
                result.warnings.push(`File contains potentially suspicious content: ${pattern.toString()}`);
              }
            }
          } catch (error) {
            result.warnings.push(
              `Failed to analyze file content: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }

          resolve(result);
        };

        reader.onerror = () => {
          result.warnings.push("Failed to read file content");
          resolve(result);
        };

        // Only read the first 10KB to check for suspicious content
        const slice = file.slice(0, 10 * 1024);
        reader.readAsText(slice);
      } else {
        // For non-text files, we can't easily validate content in the browser
        resolve(result);
      }
    });
  }

  /**
   * Scan for malware (simplified implementation)
   */
  private static async scanForMalware(file: File): Promise<{
    isClean: boolean;
    threats: string[];
  }> {
    // In a real implementation, this would use a proper malware scanning service
    // For now, we'll just check for some basic signatures

    return new Promise((resolve) => {
      const result = {
        isClean: true,
        threats: [] as string[],
      };

      // For executable files, we can check for some basic signatures
      if (file.type === "application/x-msdownload" || file.name.endsWith(".exe") || file.name.endsWith(".dll")) {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);

            // Check for PE header signature
            if (uint8Array[0] === 0x4d && uint8Array[1] === 0x5a) {
              // This is a PE file, but we can't scan it properly in the browser
              result.threats.push("Executable file detected");
              result.isClean = false;
            }
          } catch (error) {
            // Failed to scan, assume it's clean
          }

          resolve(result);
        };

        reader.onerror = () => {
          resolve(result);
        };

        // Only read the first 100 bytes to check for signatures
        const slice = file.slice(0, 100);
        reader.readAsArrayBuffer(slice);
      } else {
        resolve(result);
      }
    });
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
   * Check if a file type is dangerous
   */
  static isDangerousType(fileType: string): boolean {
    return this.DANGEROUS_TYPES.includes(fileType);
  }

  /**
   * Check if a file extension is dangerous
   */
  static isDangerousExtension(fileExtension: string): boolean {
    return this.DANGEROUS_EXTENSIONS.includes(fileExtension.toLowerCase());
  }

  /**
   * Get default validation options for common use cases
   */
  static getDefaultOptions(useCase: "images" | "documents" | "videos" | "audio" | "all"): ValidationOptions {
    switch (useCase) {
      case "images":
        return {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
          allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
        };
      case "documents":
        return {
          maxSize: 20 * 1024 * 1024, // 20MB
          allowedTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
          ],
          allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"],
        };
      case "videos":
        return {
          maxSize: 100 * 1024 * 1024, // 100MB
          allowedTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
          allowedExtensions: [".mp4", ".webm", ".ogg", ".mov"],
        };
      case "audio":
        return {
          maxSize: 20 * 1024 * 1024, // 20MB
          allowedTypes: ["audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/aac"],
          allowedExtensions: [".mp3", ".wav", ".ogg", ".webm", ".aac"],
        };
      case "all":
      default:
        return {
          maxSize: this.DEFAULT_MAX_SIZE,
          blockedTypes: this.DANGEROUS_TYPES,
          blockedExtensions: this.DANGEROUS_EXTENSIONS,
        };
    }
  }
}
