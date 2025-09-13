-- Performance Optimization Indexes
-- Run this directly in Supabase SQL Editor

-- Enable trigram extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- LOCATION-BASED QUERY OPTIMIZATION
-- ============================================================================

-- Composite index for location-based review queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_reviews_location_composite 
ON reviews_firebase (status, category, created_at DESC) 
WHERE status = 'approved';

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
-- PERFORMANCE MONITORING VIEW
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

-- Run initial statistics update
SELECT update_table_statistics();

-- Show created indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%composite%'
  OR indexname LIKE 'idx_%trgm%'
  OR indexname LIKE 'idx_%room_timestamp%'
ORDER BY tablename, indexname;
