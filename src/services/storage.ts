import { supabase } from '../config/supabase';

export class StorageService {
  async uploadFile(bucket: string, path: string, file: any): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async createSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  }

  async listFiles(bucket: string, folder?: string, limit: number = 100): Promise<any[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit,
        offset: 0,
      });

    if (error) throw error;
    return data || [];
  }

  async moveFile(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) throw error;
  }

  async copyFile(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) throw error;
  }
}

export const storageService = new StorageService();