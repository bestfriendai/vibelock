-- SUPABASE DATABASE ISSUE FIXES
-- Run this script to fix all identified issues from the verification

-- =============================================================================
-- 1. BACKUP CRITICAL DATA BEFORE FIXES
-- =============================================================================

-- Create backup of orphaned reviews before deletion (optional)
CREATE TABLE IF NOT EXISTS orphaned_reviews_backup AS
SELECT r.*, 'orphaned_' || r.author_id as backup_reason
FROM reviews_firebase r
LEFT JOIN auth.users u ON r.author_id = u.id
WHERE u.id IS NULL;

-- =============================================================================
-- 2. FIX DATA INTEGRITY ISSUES
-- =============================================================================

-- Fix 1: Delete orphaned reviews (8 records)
-- These reviews reference non-existent users and cause data integrity issues
DELETE FROM reviews_firebase 
WHERE author_id NOT IN (SELECT id FROM auth.users);

-- Verify orphaned reviews are cleaned up
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM reviews_firebase r
    LEFT JOIN auth.users u ON r.author_id = u.id
    WHERE u.id IS NULL;
    
    RAISE NOTICE 'Orphaned reviews remaining: %', orphaned_count;
END $$;

-- =============================================================================
-- 3. FIX AUTHENTICATION SYNC ISSUES
-- =============================================================================

-- Fix 2: Create missing user profiles (3 missing profiles)
-- Insert user profiles for auth users who don't have profiles yet
INSERT INTO users (
    id, 
    email, 
    anonymous_id,
    city,
    state,
    gender_preference,
    gender,
    is_blocked,
    created_at, 
    updated_at
)
SELECT 
    u.id,
    u.email,
    'anon_' || SUBSTRING(u.id::text, 1, 8) as anonymous_id,
    'Unknown' as city,
    'Unknown' as state,
    'all' as gender_preference,
    NULL as gender,
    false as is_blocked,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN users p ON u.id = p.id
WHERE p.id IS NULL;

-- Verify user profile sync is fixed
DO $$
DECLARE
    auth_count INTEGER;
    profile_count INTEGER;
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM users;
    missing_count := auth_count - profile_count;
    
    RAISE NOTICE 'Auth users: %, Profile users: %, Missing profiles: %', 
                 auth_count, profile_count, missing_count;
END $$;

-- =============================================================================
-- 4. CLEAN UP DUPLICATE/LEGACY TABLES (OPTIONAL)
-- =============================================================================

-- Optional: Drop legacy tables that are not being used by the app
-- Uncomment these if you want to clean up unused tables

-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS chat_rooms CASCADE;
-- DROP TABLE IF EXISTS comments CASCADE;
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS evidence CASCADE;
-- DROP TABLE IF EXISTS moderation_logs CASCADE;
-- DROP TABLE IF EXISTS social_media_profiles CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS typing_indicators CASCADE;
-- DROP TABLE IF EXISTS user_blocks CASCADE;
-- DROP TABLE IF EXISTS user_interactions CASCADE;
-- DROP TABLE IF EXISTS user_sessions CASCADE;
-- DROP TABLE IF EXISTS user_warnings CASCADE;
-- DROP TABLE IF EXISTS chat_message_likes CASCADE;

-- =============================================================================
-- 5. OPTIMIZE DATABASE PERFORMANCE
-- =============================================================================

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_author_id ON reviews_firebase(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_created_at ON reviews_firebase(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_status ON reviews_firebase(status);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_location ON reviews_firebase USING GIN(reviewed_person_location);

CREATE INDEX IF NOT EXISTS idx_comments_firebase_review_id ON comments_firebase(review_id);
CREATE INDEX IF NOT EXISTS idx_comments_firebase_author_id ON comments_firebase(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_firebase_created_at ON comments_firebase(created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_firebase_room_id ON chat_messages_firebase(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_firebase_sender_id ON chat_messages_firebase(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_firebase_timestamp ON chat_messages_firebase(timestamp);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_type ON chat_rooms_firebase(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_category ON chat_rooms_firebase(category);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_location ON chat_rooms_firebase USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_active ON chat_rooms_firebase(is_active);

CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(city, state);
CREATE INDEX IF NOT EXISTS idx_users_gender_preference ON users(gender_preference);

-- =============================================================================
-- 6. UPDATE STATISTICS AND ANALYZE TABLES
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE reviews_firebase;
ANALYZE comments_firebase;
ANALYZE chat_rooms_firebase;
ANALYZE chat_messages_firebase;
ANALYZE notifications;
ANALYZE push_tokens;
ANALYZE reports;

-- =============================================================================
-- 7. VERIFY ALL FIXES
-- =============================================================================

-- Final verification query to confirm all issues are resolved
WITH final_verification AS (
  -- Check orphaned reviews
  SELECT 'Orphaned Reviews' as check_name, COUNT(*)::text as result
  FROM reviews_firebase r
  LEFT JOIN auth.users u ON r.author_id = u.id
  WHERE u.id IS NULL
  
  UNION ALL
  
  -- Check orphaned comments
  SELECT 'Orphaned Comments' as check_name, COUNT(*)::text as result
  FROM comments_firebase c
  LEFT JOIN reviews_firebase r ON c.review_id = r.id
  WHERE r.id IS NULL
  
  UNION ALL
  
  -- Check orphaned chat messages
  SELECT 'Orphaned Chat Messages' as check_name, COUNT(*)::text as result
  FROM chat_messages_firebase m
  LEFT JOIN chat_rooms_firebase r ON m.chat_room_id = r.id
  WHERE r.id IS NULL
  
  UNION ALL
  
  -- Check auth sync
  SELECT 'Missing User Profiles' as check_name, 
         (COUNT(DISTINCT u.id) - COUNT(DISTINCT p.id))::text as result
  FROM auth.users u
  LEFT JOIN users p ON u.id = p.id
)
SELECT 
  check_name,
  result,
  CASE 
    WHEN result::integer = 0 THEN '✅ FIXED'
    ELSE '❌ STILL HAS ISSUES'
  END as status
FROM final_verification
ORDER BY check_name;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 DATABASE FIXES COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ Orphaned reviews cleaned up';
    RAISE NOTICE '✅ Missing user profiles created';
    RAISE NOTICE '✅ Performance indexes added';
    RAISE NOTICE '✅ Table statistics updated';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '1. Run the verification query again to confirm all fixes';
    RAISE NOTICE '2. Test your app functionality';
    RAISE NOTICE '3. Consider uncommenting the table cleanup section if needed';
END $$;
