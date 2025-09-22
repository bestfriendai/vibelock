import supabase, { handleSupabaseError } from "../config/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

// Define FileObject type locally since it's no longer exported in Supabase v2
interface FileObject {
  name: string;
  bucket_id?: string;
  owner?: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
  buckets?: string[];
  size?: number;
}

// Enhanced types for v2.57.4 compatibility
interface StorageResult<T = any> {
  data: T | null;
  error: any; // StorageError is different from PostgrestError
}

interface UploadResult {
  path: string;
  id?: string;
  fullPath?: string;
}

interface StorageFileInfo {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
  buckets?: string[];
  size?: number;
}

// Validation helpers for v2.57.4
const validateBucketName = (bucket: string): void => {
  if (!bucket || typeof bucket !== "string") {
    throw new Error("Bucket name is required and must be a string");
  }

  if (!/^[a-z0-9][a-z0-9\-_]{1,62}$/.test(bucket)) {
    throw new Error("Invalid bucket name format. Must be lowercase alphanumeric with hyphens/underscores");
  }
};

const validateFilePath = (path: string): void => {
  if (!path || typeof path !== "string") {
    throw new Error("File path is required and must be a string");
  }

  if (path.startsWith("/") || path.includes("..")) {
    throw new Error("Invalid file path. Cannot start with '/' or contain '..'");
  }
};

const handleStorageError = (error: any, operation: string): never => {
  const message = handleSupabaseError(error);
  throw new Error(`${operation} failed: ${message}`);
};

const validateStorageResponse = <T>(response: StorageResult<T>, operation: string): T => {
  if (response.error) {
    handleStorageError(response.error, operation);
  }

  if (response.data === null) {
    throw new Error(`${operation} returned null data`);
  }

  return response.data;
};

export class StorageService {
  // Enhanced file upload with v2.57.4 validation and error handling
  async uploadFile(
    bucket: string,
    path: string,
    file: any,
    options?: { upsert?: boolean; metadata?: Record<string, any>; contentType?: string },
  ): Promise<{ url: string; path: string; id?: string }> {
    validateBucketName(bucket);
    validateFilePath(path);

    if (!file) {
      throw new Error("File is required for upload");
    }

    try {
      // Check if bucket exists
      await this.validateBucket(bucket);

      const uploadResponse = await supabase.storage.from(bucket).upload(path, file, {
        upsert: options?.upsert ?? true,
        metadata: options?.metadata,
        contentType: options?.contentType,
      });

      if (uploadResponse.error) {
        // Provide more specific error handling for RLS issues
        if (uploadResponse.error.message?.includes("row-level security policy")) {
          console.error(`RLS Policy Error: User may need to be authenticated to upload to ${bucket}`);
          throw new Error(
            `Upload failed: Authentication may be required for ${bucket} uploads. Please ensure user is signed in.`,
          );
        }
        handleStorageError(uploadResponse.error, "Upload");
      }

      const uploadData = validateStorageResponse(uploadResponse, "Upload");

      // Get public URL using v2.57.4 API
      const urlResponse = supabase.storage.from(bucket).getPublicUrl(uploadData.path);

      if (!urlResponse.data?.publicUrl) {
        throw new Error("Failed to generate public URL after upload");
      }

      return {
        url: urlResponse.data.publicUrl,
        path: uploadData.path,
        id: uploadData.id,
      };
    } catch (error: any) {
      console.error(`Failed to upload file to ${bucket}/${path}:`, error);

      // Provide user-friendly error messages for common issues
      if (error.message?.includes("row-level security policy")) {
        throw new Error(`Upload failed: Authentication required for ${bucket} uploads. Please sign in and try again.`);
      }

      throw error;
    }
  }

  // Enhanced file deletion with v2.57.4 validation and existence check
  async deleteFile(bucket: string, path: string): Promise<void> {
    validateBucketName(bucket);
    validateFilePath(path);

    try {
      // Check if file exists before attempting deletion
      const exists = await this.fileExists(bucket, path);
      if (!exists) {
        return; // Don't throw error for non-existent files
      }

      const response = await supabase.storage.from(bucket).remove([path]);

      if (response.error) {
        handleStorageError(response.error, "Delete");
      }
    } catch (error: any) {
      console.error(`Failed to delete file from ${bucket}/${path}:`, error);
      throw error;
    }
  }

  // Enhanced batch file deletion
  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    validateBucketName(bucket);

    if (!paths || paths.length === 0) {
      throw new Error("Paths array is required and must not be empty");
    }

    // Validate all paths
    paths.forEach((path) => validateFilePath(path));

    try {
      const response = await supabase.storage.from(bucket).remove(paths);

      if (response.error) {
        handleStorageError(response.error, "Batch Delete");
      }
    } catch (error: any) {
      console.error(`Failed to delete files from bucket ${bucket}:`, error);
      throw error;
    }
  }

  // Enhanced public URL generation with v2.57.4 validation
  getPublicUrl(
    bucket: string,
    path: string,
    transform?: { width?: number; height?: number; quality?: number },
  ): string {
    validateBucketName(bucket);
    validateFilePath(path);

    try {
      const response = supabase.storage.from(bucket).getPublicUrl(path, {
        transform: transform,
      });

      if (!response.data?.publicUrl) {
        throw new Error("Failed to generate public URL");
      }

      return response.data.publicUrl;
    } catch (error: any) {
      console.error(`Failed to get public URL for ${bucket}/${path}:`, error);
      throw error;
    }
  }

  // Enhanced signed URL creation with v2.57.4 validation and options
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600,
    options?: { download?: boolean | string; transform?: { width?: number; height?: number; quality?: number } },
  ): Promise<string> {
    validateBucketName(bucket);
    validateFilePath(path);

    if (expiresIn <= 0 || expiresIn > 604800) {
      // Max 7 days
      throw new Error("expiresIn must be between 1 second and 7 days (604800 seconds)");
    }

    try {
      // Check if file exists before creating signed URL
      const exists = await this.fileExists(bucket, path);
      if (!exists) {
        throw new Error(`File ${path} not found in bucket ${bucket}`);
      }

      const response = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn, options);

      if (response.error) {
        handleStorageError(response.error, "Create Signed URL");
      }

      const signedData = validateStorageResponse(response, "Create Signed URL");

      if (!signedData.signedUrl) {
        throw new Error("Signed URL not returned in response");
      }

      return signedData.signedUrl;
    } catch (error: any) {
      console.error(`Failed to create signed URL for ${bucket}/${path}:`, error);
      throw error;
    }
  }

  // Enhanced batch signed URLs creation
  async createSignedUrls(
    bucket: string,
    paths: string[],
    expiresIn: number = 3600,
  ): Promise<{ path: string; signedUrl: string | null; error?: string }[]> {
    validateBucketName(bucket);

    if (!paths || paths.length === 0) {
      throw new Error("Paths array is required and must not be empty");
    }

    const results = await Promise.allSettled(
      paths.map(async (path) => {
        try {
          const signedUrl = await this.createSignedUrl(bucket, path, expiresIn);
          return { path, signedUrl };
        } catch (error: any) {
          return { path, signedUrl: null, error: error.message };
        }
      }),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return { path: paths[index] || "", signedUrl: null, error: result.reason?.message || "Unknown error" };
      }
    });
  }

  // Enhanced file listing with v2.57.4 pagination and filtering
  async listFiles(
    bucket: string,
    folder?: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: "asc" | "desc" };
      search?: string;
    },
  ): Promise<FileObject[]> {
    validateBucketName(bucket);

    if (folder) {
      validateFilePath(folder);
    }

    const limit = Math.min(options?.limit || 100, 1000); // Max 1000 per request
    const offset = Math.max(options?.offset || 0, 0);

    try {
      const response = await supabase.storage.from(bucket).list(folder, {
        limit,
        offset,
        sortBy: options?.sortBy,
        search: options?.search,
      });

      if (response.error) {
        handleStorageError(response.error, "List Files");
      }

      return (validateStorageResponse(response, "List Files") || []) as any;
    } catch (error: any) {
      console.error(`Failed to list files in bucket ${bucket}:`, error);
      throw error;
    }
  }

  // Enhanced method to get all files with pagination
  async getAllFiles(bucket: string, folder?: string, batchSize: number = 100): Promise<FileObject[]> {
    const allFiles: FileObject[] = []; // TODO: Define local FileObject type[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const files = await this.listFiles(bucket, folder, { limit: batchSize, offset });

      if (files.length === 0) {
        hasMore = false;
      } else {
        allFiles.push(...files);
        offset += files.length;
        hasMore = files.length === batchSize;
      }
    }

    return allFiles;
  }

  // Enhanced file move with v2.57.4 validation and existence checks
  async moveFile(bucket: string, fromPath: string, toPath: string): Promise<void> {
    validateBucketName(bucket);
    validateFilePath(fromPath);
    validateFilePath(toPath);

    if (fromPath === toPath) {
      throw new Error("Source and destination paths cannot be the same");
    }

    try {
      // Check if source file exists
      const sourceExists = await this.fileExists(bucket, fromPath);
      if (!sourceExists) {
        throw new Error(`Source file ${fromPath} not found in bucket ${bucket}`);
      }

      // Check if destination already exists
      const destExists = await this.fileExists(bucket, toPath);
      if (destExists) {
        throw new Error(`Destination file ${toPath} already exists in bucket ${bucket}`);
      }

      const response = await supabase.storage.from(bucket).move(fromPath, toPath);

      if (response.error) {
        handleStorageError(response.error, "Move File");
      }
    } catch (error: any) {
      console.error(`Failed to move file from ${fromPath} to ${toPath} in bucket ${bucket}:`, error);
      throw error;
    }
  }

  // Enhanced file copy with v2.57.4 validation and existence checks
  async copyFile(bucket: string, fromPath: string, toPath: string): Promise<void> {
    validateBucketName(bucket);
    validateFilePath(fromPath);
    validateFilePath(toPath);

    if (fromPath === toPath) {
      throw new Error("Source and destination paths cannot be the same");
    }

    try {
      // Check if source file exists
      const sourceExists = await this.fileExists(bucket, fromPath);
      if (!sourceExists) {
        throw new Error(`Source file ${fromPath} not found in bucket ${bucket}`);
      }

      const response = await supabase.storage.from(bucket).copy(fromPath, toPath);

      if (response.error) {
        handleStorageError(response.error, "Copy File");
      }
    } catch (error: any) {
      console.error(`Failed to copy file from ${fromPath} to ${toPath} in bucket ${bucket}:`, error);
      throw error;
    }
  }

  // Utility method to check if file exists
  async fileExists(bucket: string, path: string): Promise<boolean> {
    try {
      validateBucketName(bucket);
      validateFilePath(path);

      const folder = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : undefined;
      const fileName = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;

      const files = await this.listFiles(bucket, folder, { search: fileName });
      return files.some((file) => file.name === fileName);
    } catch (error) {
      return false;
    }
  }

  // Utility method to get file info
  async getFileInfo(bucket: string, path: string): Promise<FileObject | null> {
    try {
      const folder = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : undefined;
      const fileName = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;

      const files = await this.listFiles(bucket, folder, { search: fileName });
      return files.find((file) => file.name === fileName) || null;
    } catch (error) {
      return null;
    }
  }

  // Utility method to validate bucket exists and is accessible
  async validateBucket(bucket: string): Promise<void> {
    try {
      // Instead of listing all buckets (which may fail due to RLS),
      // try to access the bucket directly by listing its contents
      const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });

      if (error) {
        // If we get a specific "bucket not found" error, throw our custom error
        if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
          throw new Error(`Bucket '${bucket}' does not exist or is not accessible`);
        }
        // For other errors (like RLS), we assume the bucket exists but we don't have list permissions
        // This is acceptable for upload operations
      }

      // If we reach here, the bucket is accessible (either no error or acceptable RLS error)
    } catch (error: any) {
      console.error(`Bucket validation failed for ${bucket}:`, error);
      throw error;
    }
  }

  // Utility method to get bucket info
  async getBucketInfo(bucket: string): Promise<any> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        handleStorageError(error, "Get Bucket Info");
      }

      const bucketInfo = buckets?.find((b) => b.name === bucket);
      if (!bucketInfo) {
        throw new Error(`Bucket '${bucket}' not found`);
      }

      return bucketInfo;
    } catch (error: any) {
      console.error(`Failed to get bucket info for ${bucket}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export for direct usage
export default storageService;
