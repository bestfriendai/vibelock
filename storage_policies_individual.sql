-- Individual Storage Policies for LockerRoom App
-- Apply these one by one in Supabase Dashboard > Storage > Policies

-- First, create the buckets if they don't exist
-- Go to Storage > Buckets and create these manually:
-- 1. avatars (public: true, file size limit: 50MB)
-- 2. review-images (public: true, file size limit: 50MB) 
-- 3. chat-media (public: true, file size limit: 50MB)
-- 4. documents (public: false, file size limit: 50MB)

-- POLICY 1: Review Images Upload (Most Important)
-- Name: "Authenticated users can upload review images"
-- Bucket: review-images
-- Operation: INSERT
-- Policy Definition:
auth.uid() IS NOT NULL

-- POLICY 2: Review Images View
-- Name: "Anyone can view review images" 
-- Bucket: review-images
-- Operation: SELECT
-- Policy Definition:
true

-- POLICY 3: Review Images Update
-- Name: "Authenticated users can update review images"
-- Bucket: review-images  
-- Operation: UPDATE
-- Policy Definition:
auth.uid() IS NOT NULL

-- POLICY 4: Review Images Delete
-- Name: "Authenticated users can delete review images"
-- Bucket: review-images
-- Operation: DELETE  
-- Policy Definition:
auth.uid() IS NOT NULL

-- POLICY 5: Chat Media Upload
-- Name: "Authenticated users can upload chat media"
-- Bucket: chat-media
-- Operation: INSERT
-- Policy Definition:
auth.uid() IS NOT NULL

-- POLICY 6: Chat Media View
-- Name: "Anyone can view chat media"
-- Bucket: chat-media
-- Operation: SELECT
-- Policy Definition:
true

-- POLICY 7: Avatar Upload (User-specific)
-- Name: "Users can upload their own avatar"
-- Bucket: avatars
-- Operation: INSERT
-- Policy Definition:
auth.uid()::text = (storage.foldername(name))[1]

-- POLICY 8: Avatar View
-- Name: "Anyone can view avatars"
-- Bucket: avatars
-- Operation: SELECT
-- Policy Definition:
true
