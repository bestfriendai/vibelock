-- Migration to fix missing database objects and columns
-- Run this after analyzing the TypeScript code requirements

-- 1. Add missing columns to chat_messages_firebase table
ALTER TABLE chat_messages_firebase 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT NOW();

-- 2. Create review_likes table (missing but referenced in code)
CREATE TABLE IF NOT EXISTS review_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES reviews_firebase(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS on review_likes
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for review_likes
CREATE POLICY "Users can create review likes" 
  ON review_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
  ON review_likes FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view review likes" 
  ON review_likes FOR SELECT 
  USING (true);

-- 3. Create missing search functions
CREATE OR REPLACE FUNCTION search_messages_in_room(
  p_room_id uuid,
  p_query text,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  chat_room_id uuid,
  content text,
  sender_id uuid,
  sender_name text,
  timestamp timestamp with time zone,
  created_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.chat_room_id,
    m.content,
    m.sender_id,
    m.sender_name,
    m.timestamp,
    COALESCE(m.created_at, m.timestamp) as created_at
  FROM chat_messages_firebase m
  WHERE m.chat_room_id = p_room_id
    AND m.content ILIKE '%' || p_query || '%'
    AND m.is_deleted = false
  ORDER BY m.timestamp DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION search_messages_global(
  p_query text,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  chat_room_id uuid,
  content text,
  sender_id uuid,
  sender_name text,
  timestamp timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.chat_room_id,
    m.content,
    m.sender_id,
    m.sender_name,
    m.timestamp,
    COALESCE(m.created_at, m.timestamp) as created_at
  FROM chat_messages_firebase m
  WHERE m.content ILIKE '%' || p_query || '%'
    AND m.is_deleted = false
  ORDER BY m.timestamp DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_search_suggestions(
  p_prefix text,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  suggestion text,
  type text,
  count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Get name suggestions from reviews
  SELECT 
    reviewed_person_name as suggestion,
    'person' as type,
    COUNT(*)::int as count
  FROM reviews_firebase
  WHERE reviewed_person_name ILIKE p_prefix || '%'
    AND status = 'approved'
  GROUP BY reviewed_person_name
  
  UNION ALL
  
  -- Get location suggestions
  SELECT 
    DISTINCT (reviewed_person_location->>'city')::text as suggestion,
    'location' as type,
    COUNT(*)::int as count
  FROM reviews_firebase
  WHERE (reviewed_person_location->>'city')::text ILIKE p_prefix || '%'
    AND status = 'approved'
  GROUP BY (reviewed_person_location->>'city')::text
  
  ORDER BY count DESC, suggestion
  LIMIT p_limit;
END;
$$;

-- 4. Create search_analytics table for search tracking
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  results_count int DEFAULT 0,
  search_type text CHECK (search_type IN ('reviews', 'messages', 'profiles', 'all')),
  created_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on search_analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for search_analytics
CREATE POLICY "Users can insert their own search analytics" 
  ON search_analytics FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Service role can read all analytics" 
  ON search_analytics FOR SELECT 
  USING (auth.role() = 'service_role');

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);

-- 6. Fix the comments_firebase table to match TypeScript expectations
-- The table expects author_name but TypeScript sends userId
ALTER TABLE comments_firebase 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- Update existing records to set user_id from author_id if needed
UPDATE comments_firebase 
SET user_id = author_id 
WHERE user_id IS NULL AND author_id IS NOT NULL;

-- 7. Grant necessary permissions
GRANT ALL ON review_likes TO authenticated;
GRANT ALL ON search_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages_in_room TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages_global TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated;

-- 8. Add a trigger to update review like counts
CREATE OR REPLACE FUNCTION update_review_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews_firebase 
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews_firebase 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_like_count
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW EXECUTE FUNCTION update_review_like_count();

-- 9. Fix nullable field handling by updating TypeScript types
-- Note: The author_id field in reviews_firebase can be null for anonymous reviews
-- This is by design and the TypeScript types should handle this properly

COMMENT ON COLUMN reviews_firebase.author_id IS 'Can be null for anonymous reviews';
COMMENT ON TABLE review_likes IS 'Tracks user likes on reviews';
COMMENT ON TABLE search_analytics IS 'Tracks search queries for analytics';