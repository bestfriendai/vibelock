import { supabase } from '../config/supabase';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

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
    AVATARS: 'avatars',
    REVIEW_IMAGES: 'review-images',
    CHAT_MEDIA: 'chat-media',
    DOCUMENTS: 'documents',
  };

  /**
   * Upload a file to Supabase storage
   */
  async uploadFile(
    fileUri: string,
    options: FileUploadOptions
  ): Promise<UploadResult> {
    try {
      // Validate file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File does not exist' };
      }

      // Generate file name if not provided
      const fileName = options.fileName || this.generateFileName(fileUri);
      const filePath = options.folder ? `${options.folder}/${fileName}` : fileName;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      // Determine content type
      const contentType = options.contentType || this.getContentType(fileUri);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: options.upsert || false,
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Storage service upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
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
      contentType: 'image/jpeg',
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
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload chat media
   */
  async uploadChatMedia(fileUri: string, userId: string, chatRoomId: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, {
      bucket: this.buckets.CHAT_MEDIA,
      folder: `${userId}/${chatRoomId}`,
      fileName: `chat-media-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload document
   */
  async uploadDocument(fileUri: string, userId: string, documentType: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, {
      bucket: this.buckets.DOCUMENTS,
      folder: `${userId}/${documentType}`,
      contentType: 'application/pdf',
    });
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Storage service delete error:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, filePath: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Create signed URL for private files
   */
  async createSignedUrl(bucket: string, filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Signed URL error:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Storage service signed URL error:', error);
      return null;
    }
  }

  /**
   * Pick image from gallery or camera
   */
  async pickImage(options: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    source?: 'gallery' | 'camera';
  } = {}): Promise<ImagePicker.ImagePickerResult> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission not granted');
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        quality: options.quality ?? 0.8,
      };

      let result: ImagePicker.ImagePickerResult;

      if (options.source === 'camera') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          throw new Error('Camera permission not granted');
        }
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }

      return result;
    } catch (error) {
      console.error('Image picker error:', error);
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
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );

      return manipResult.uri;
    } catch (error) {
      console.error('Image compression error:', error);
      return uri; // Return original if compression fails
    }
  }

  /**
   * Generate a unique file name
   */
  private generateFileName(fileUri: string): string {
    const extension = fileUri.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.${extension}`;
  }

  /**
   * Get content type from file URI
   */
  private getContentType(fileUri: string): string {
    const extension = fileUri.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
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
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit,
          offset: 0,
        });

      if (error) {
        console.error('List files error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Storage service list files error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
