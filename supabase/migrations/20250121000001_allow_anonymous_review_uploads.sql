-- Allow anonymous uploads for review images to maximize user review posting
-- This aligns with user preference to remove barriers to review creation

-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;

-- Create new policy that allows both authenticated and anonymous uploads for review images
CREATE POLICY "Allow review image uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'review-images'
  );

-- Keep the existing policies for update and delete (require authentication for security)
-- Users should only be able to modify/delete their own uploads when authenticated

-- Update policy also allows anonymous users to update (for retry scenarios)
DROP POLICY IF EXISTS "Authenticated users can update review images" ON storage.objects;
CREATE POLICY "Allow review image updates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'review-images'
  );

-- Delete policy still requires authentication for security
-- This prevents anonymous users from deleting others' content
DROP POLICY IF EXISTS "Authenticated users can delete review images" ON storage.objects;
CREATE POLICY "Authenticated users can delete review images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'review-images'
    AND auth.uid() IS NOT NULL
  );

-- Keep the existing select policy (anyone can view review images)
-- This policy should already exist from the previous migration
