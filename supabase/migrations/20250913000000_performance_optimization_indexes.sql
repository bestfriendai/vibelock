-- Performance Optimization Migration
-- This migration adds comprehensive indexes for better query performance
-- Created: 2025-01-13

-- ============================================================================
-- LOCATION-BASED QUERY OPTIMIZATION
-- ============================================================================

-- Composite index for location-based review queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_reviews_location_composite 
ON reviews_firebase (status, category, created_at DESC) 
WHERE status = 'approved';

-- Spatial index for efficient location queries using coordinates
CREATE INDEX IF NOT EXISTS idx_reviews_location_spatial 
ON reviews_firebase USING GIST (
  ll_to_earth(
    CAST(reviewed_person_location->>'latitude' AS FLOAT), 
    CAST(reviewed_person_location->>'longitude' AS FLOAT)
  )
) WHERE status = 'approved' 
AND reviewed_person_location->>'latitude' IS NOT NULL 
AND reviewed_person_location->>'longitude' IS NOT NULL;

-- Index for city-based filtering (very common)
CREATE INDEX IF NOT EXISTS idx_reviews_city_category 
ON reviews_firebase (
  (reviewed_person_location->>'city'), 
  category, 
  created_at DESC
) WHERE status = 'approved';

-- Index for state-based filtering
CREATE INDEX IF NOT EXISTS idx_reviews_state_category 
ON reviews_firebase (
  (reviewed_person_location->>'state'), 
  category, 
  created_at DESC
) WHERE status = 'approved';

-- ============================================================================
-- SEARCH OPTIMIZATION
-- ============================================================================

-- Full-text search index for review content (using GIN trigram for better performance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_reviews_text_search 
ON reviews_firebase USING GIN (
  (review_text || ' ' || reviewed_person_name) gin_trgm_ops
) WHERE status = 'approved';

-- Separate index for person name searches (very common)
CREATE INDEX IF NOT EXISTS idx_reviews_person_name_trgm 
ON reviews_firebase USING GIN (reviewed_person_name gin_trgm_ops) 
WHERE status = 'approved';

-- ============================================================================
-- CHAT PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Composite index for chat message queries (room + timestamp)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_timestamp 
ON chat_messages_firebase (chat_room_id, timestamp DESC) 
WHERE is_deleted = false;

-- Index for unread message counts
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
ON chat_messages_firebase (chat_room_id, is_read, timestamp DESC) 
WHERE is_deleted = false AND is_read = false;

-- Index for message search within rooms
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search 
ON chat_messages_firebase USING GIN (content gin_trgm_ops) 
WHERE is_deleted = false;

-- ============================================================================
-- USER AND PROFILE OPTIMIZATION
-- ============================================================================

-- Index for user location queries
CREATE INDEX IF NOT EXISTS idx_users_location_spatial 
ON users USING GIST (ll_to_earth(latitude, longitude)) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for college-based user queries
CREATE INDEX IF NOT EXISTS idx_users_college 
ON users (college_id, created_at DESC) 
WHERE college_id IS NOT NULL;

-- ============================================================================
-- NOTIFICATION OPTIMIZATION
-- ============================================================================

-- Composite index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications (user_id, is_read, created_at DESC);

-- Index for notification cleanup (old read notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup 
ON notifications (created_at, is_read) 
WHERE is_read = true;

-- ============================================================================
-- REPORTING AND MODERATION OPTIMIZATION
-- ============================================================================

-- Index for pending reports (moderation queue)
CREATE INDEX IF NOT EXISTS idx_reports_moderation 
ON reports (status, created_at DESC) 
WHERE status = 'pending';

-- Index for user report history
CREATE INDEX IF NOT EXISTS idx_reports_user_history 
ON reports (reporter_id, created_at DESC);

-- ============================================================================
-- ANALYTICS AND TRENDING OPTIMIZATION
-- ============================================================================

-- Index for trending content (most liked/commented)
CREATE INDEX IF NOT EXISTS idx_reviews_trending 
ON reviews_firebase (like_count DESC, comment_count DESC, created_at DESC) 
WHERE status = 'approved';

-- Index for user activity analytics
CREATE INDEX IF NOT EXISTS idx_reviews_author_activity 
ON reviews_firebase (author_id, created_at DESC) 
WHERE status = 'approved';

-- ============================================================================
-- COLLEGE SEARCH OPTIMIZATION
-- ============================================================================

-- Index for college search by name and aliases
CREATE INDEX IF NOT EXISTS idx_colleges_search 
ON colleges USING GIN (
  (name || ' ' || COALESCE(alias, '')) gin_trgm_ops
);

-- Index for college location searches
CREATE INDEX IF NOT EXISTS idx_colleges_location 
ON colleges (state, city, name);

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Create a view to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Create a view to monitor slow queries
CREATE OR REPLACE VIEW slow_query_stats AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 100 -- queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to analyze table statistics (run periodically)
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE reviews_firebase;
  ANALYZE chat_messages_firebase;
  ANALYZE users;
  ANALYZE notifications;
  ANALYZE colleges;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete old read notifications (older than 30 days)
  DELETE FROM notifications 
  WHERE is_read = true 
  AND created_at < NOW() - INTERVAL '30 days';
  
  -- Delete old deleted messages (older than 90 days)
  DELETE FROM chat_messages_firebase 
  WHERE is_deleted = true 
  AND updated_at < NOW() - INTERVAL '90 days';
  
  -- Update statistics after cleanup
  PERFORM update_table_statistics();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_reviews_location_composite IS 'Optimizes location-based review queries with status and category filtering';
COMMENT ON INDEX idx_reviews_location_spatial IS 'Enables efficient radius-based location searches using PostGIS';
COMMENT ON INDEX idx_reviews_text_search IS 'Full-text search for review content and person names';
COMMENT ON INDEX idx_chat_messages_room_timestamp IS 'Optimizes chat message loading and pagination';
COMMENT ON FUNCTION cleanup_old_data IS 'Periodic maintenance function to remove old data and update statistics';
