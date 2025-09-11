// Storage-related types

export interface FileMetadata {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  bucket: string;
  path: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  upsert?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  timeout?: number;
}

export interface DownloadOptions {
  timeout?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface StorageError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}
