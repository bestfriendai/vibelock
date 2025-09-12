-- Quick Storage Fix - Try this first
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled on storage.objects
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- If RLS is enabled and causing issues, you can temporarily disable it
-- WARNING: This makes storage less secure but will fix the immediate issue
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Better approach: Create a simple permissive policy
-- This allows any authenticated user to upload to any bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Allow public reads" ON storage.objects
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (auth.uid() IS NOT NULL);
