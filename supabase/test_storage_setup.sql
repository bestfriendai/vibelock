-- Test script to verify storage setup and policies
-- Run this in Supabase SQL Editor to check your storage configuration

-- Check if storage buckets exist
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY name;

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Test authentication context (run when logged in)
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as current_user_email,
  auth.role() as current_role;

-- Check current storage objects (if any)
SELECT 
  id,
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
ORDER BY created_at DESC
LIMIT 10;
