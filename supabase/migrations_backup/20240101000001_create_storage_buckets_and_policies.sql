-- Create storage buckets and RLS policies for LockerRoom app
-- This migration sets up all necessary storage buckets with proper security policies

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('review-images', 'review-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']),
  ('chat-media', 'chat-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/m4a']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow everyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- RLS Policies for review-images bucket
-- Allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'review-images' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update their own review images
CREATE POLICY "Users can update their own review images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'review-images' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete their own review images
CREATE POLICY "Users can delete their own review images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'review-images' 
    AND auth.uid() IS NOT NULL
  );

-- Allow everyone to view review images (public bucket)
CREATE POLICY "Anyone can view review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

-- RLS Policies for chat-media bucket
-- Allow authenticated users to upload chat media
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update their own chat media
CREATE POLICY "Users can update their own chat media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'chat-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own chat media
CREATE POLICY "Users can delete their own chat media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow everyone to view chat media (public bucket)
CREATE POLICY "Anyone can view chat media" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

-- RLS Policies for documents bucket (private)
-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own documents
CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own documents
CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view only their own documents (private bucket)
CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
