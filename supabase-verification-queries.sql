-- Comprehensive Supabase Database Verification Queries
-- Run these queries in your Supabase SQL Editor to verify implementation

-- =============================================================================
-- 1. SCHEMA VERIFICATION - Check if all required tables exist
-- =============================================================================

SELECT 'SCHEMA VERIFICATION' as test_category;

-- Check all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'users', 'reviews_firebase', 'comments_firebase', 
      'chat_rooms_firebase', 'chat_messages_firebase', 
      'notifications', 'push_tokens', 'reports', 'chat_room_subscriptions'
    ) THEN '✅ Required'
    ELSE '⚠️ Additional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================================================
-- 2. TABLE STRUCTURE VERIFICATION - Check column definitions
-- =============================================================================

SELECT 'TABLE STRUCTURE VERIFICATION' as test_category;

-- Users table structure
SELECT 'users' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Reviews table structure  
SELECT 'reviews_firebase' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'reviews_firebase'
ORDER BY ordinal_position;

-- Chat rooms table structure
SELECT 'chat_rooms_firebase' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'chat_rooms_firebase'
ORDER BY ordinal_position;

-- Chat messages table structure
SELECT 'chat_messages_firebase' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'chat_messages_firebase'
ORDER BY ordinal_position;

-- Comments table structure
SELECT 'comments_firebase' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'comments_firebase'
ORDER BY ordinal_position;

-- =============================================================================
-- 3. FOREIGN KEY CONSTRAINTS VERIFICATION
-- =============================================================================

SELECT 'FOREIGN KEY CONSTRAINTS' as test_category;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) VERIFICATION
-- =============================================================================

SELECT 'ROW LEVEL SECURITY STATUS' as test_category;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'reviews_firebase', 'comments_firebase',
    'chat_rooms_firebase', 'chat_messages_firebase',
    'notifications', 'push_tokens', 'reports'
  )
ORDER BY tablename;

-- Check RLS policies
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- 5. INDEXES VERIFICATION
-- =============================================================================

SELECT 'INDEXES VERIFICATION' as test_category, '' as detail, '' as status
UNION ALL
SELECT
  'Index: ' || indexname as test_category,
  tablename as detail,
  '✅ Exists' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'reviews_firebase', 'comments_firebase',
    'chat_rooms_firebase', 'chat_messages_firebase'
  )

UNION ALL

-- =============================================================================
-- 6. STORAGE BUCKETS VERIFICATION
-- =============================================================================

SELECT 'STORAGE BUCKETS VERIFICATION' as test_category, '' as detail, '' as status
UNION ALL
SELECT
  'Bucket: ' || name as test_category,
  CASE WHEN public THEN 'Public' ELSE 'Private' END as detail,
  CASE
    WHEN name IN ('avatars', 'evidence', 'thumbnails', 'chat-media') THEN '✅ Required'
    ELSE '⚠️ Additional'
  END as status
FROM storage.buckets

UNION ALL

-- =============================================================================
-- 7. REALTIME PUBLICATION VERIFICATION
-- =============================================================================

SELECT 'REALTIME PUBLICATION VERIFICATION' as test_category, '' as detail, '' as status
UNION ALL
SELECT
  'Realtime: ' || tablename as test_category,
  schemaname as detail,
  CASE
    WHEN tablename IN ('chat_messages_firebase', 'chat_rooms_firebase', 'comments_firebase')
    THEN '✅ Should be in realtime'
    ELSE '⚠️ Check if needed'
  END as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'

UNION ALL

-- =============================================================================
-- 8. TRIGGERS AND FUNCTIONS VERIFICATION
-- =============================================================================

SELECT 'TRIGGERS AND FUNCTIONS VERIFICATION' as test_category, '' as detail, '' as status
UNION ALL
SELECT
  'Function: ' || routine_name as test_category,
  routine_type as detail,
  '✅ Exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%updated_at%'
UNION ALL
SELECT
  'Trigger: ' || trigger_name as test_category,
  event_object_table as detail,
  '✅ Active' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'

UNION ALL

-- =============================================================================
-- 9. DATA INTEGRITY CHECKS
-- =============================================================================

SELECT 'DATA INTEGRITY CHECKS' as test_category, '' as detail, '' as status
UNION ALL
SELECT
  'Orphaned Reviews' as test_category,
  COUNT(*)::text as detail,
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '❌ Issues Found' END as status
FROM reviews_firebase r
LEFT JOIN auth.users u ON r.author_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT
  'Orphaned Comments' as test_category,
  COUNT(*)::text as detail,
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '❌ Issues Found' END as status
FROM comments_firebase c
LEFT JOIN reviews_firebase r ON c.review_id = r.id
WHERE r.id IS NULL
UNION ALL
SELECT
  'Orphaned Chat Messages' as test_category,
  COUNT(*)::text as detail,
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '❌ Issues Found' END as status
FROM chat_messages_firebase m
LEFT JOIN chat_rooms_firebase r ON m.chat_room_id = r.id
WHERE r.id IS NULL

UNION ALL

-- =============================================================================
-- 10. RECORD COUNTS
-- =============================================================================

SELECT 'RECORD COUNTS' as test_category, '' as detail, '' as status
UNION ALL
SELECT 'users' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM users
UNION ALL
SELECT 'reviews_firebase' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM reviews_firebase
UNION ALL
SELECT 'comments_firebase' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM comments_firebase
UNION ALL
SELECT 'chat_rooms_firebase' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM chat_rooms_firebase
UNION ALL
SELECT 'chat_messages_firebase' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM chat_messages_firebase
UNION ALL
SELECT 'notifications' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM notifications
UNION ALL
SELECT 'push_tokens' as test_category, COUNT(*)::text as detail, '📊 Records' as status FROM push_tokens

ORDER BY test_category;

-- =============================================================================
-- 6. STORAGE BUCKETS VERIFICATION
-- =============================================================================

SELECT 'STORAGE BUCKETS VERIFICATION' as test_category;

-- Check if required storage buckets exist
SELECT
  name as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types,
  CASE
    WHEN name IN ('avatars', 'evidence', 'thumbnails', 'chat-media') THEN '✅ Required'
    ELSE '⚠️ Additional'
  END as status
FROM storage.buckets
ORDER BY name;

-- =============================================================================
-- 7. REALTIME PUBLICATION VERIFICATION
-- =============================================================================

SELECT 'REALTIME PUBLICATION VERIFICATION' as test_category;

-- Check realtime publication tables
SELECT
  schemaname,
  tablename,
  CASE
    WHEN tablename IN ('chat_messages_firebase', 'chat_rooms_firebase', 'comments_firebase')
    THEN '✅ Should be in realtime'
    ELSE '⚠️ Check if needed'
  END as realtime_status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =============================================================================
-- 8. TRIGGERS AND FUNCTIONS VERIFICATION
-- =============================================================================

SELECT 'TRIGGERS AND FUNCTIONS VERIFICATION' as test_category;

-- Check for update_updated_at_column function
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%updated_at%'
ORDER BY routine_name;

-- Check triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- =============================================================================
-- 9. DATA INTEGRITY CHECKS
-- =============================================================================

SELECT 'DATA INTEGRITY CHECKS' as test_category;

-- Check for orphaned records (if tables have data)
-- Reviews without valid authors
SELECT 'Orphaned Reviews' as check_type, COUNT(*) as count
FROM reviews_firebase r
LEFT JOIN auth.users u ON r.author_id = u.id
WHERE u.id IS NULL;

-- Comments without valid reviews
SELECT 'Orphaned Comments' as check_type, COUNT(*) as count
FROM comments_firebase c
LEFT JOIN reviews_firebase r ON c.review_id = r.id
WHERE r.id IS NULL;

-- Chat messages without valid rooms
SELECT 'Orphaned Chat Messages' as check_type, COUNT(*) as count
FROM chat_messages_firebase m
LEFT JOIN chat_rooms_firebase r ON m.chat_room_id = r.id
WHERE r.id IS NULL;

-- =============================================================================
-- 10. SAMPLE DATA VERIFICATION (if data exists)
-- =============================================================================

SELECT 'SAMPLE DATA VERIFICATION' as test_category;

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'reviews_firebase', COUNT(*) FROM reviews_firebase
UNION ALL
SELECT 'comments_firebase', COUNT(*) FROM comments_firebase
UNION ALL
SELECT 'chat_rooms_firebase', COUNT(*) FROM chat_rooms_firebase
UNION ALL
SELECT 'chat_messages_firebase', COUNT(*) FROM chat_messages_firebase
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'push_tokens', COUNT(*) FROM push_tokens
ORDER BY table_name;

-- =============================================================================
-- 11. AUTHENTICATION INTEGRATION CHECK
-- =============================================================================

SELECT 'AUTHENTICATION INTEGRATION' as test_category;

-- Check if users table is properly linked to auth.users
SELECT
  'User Profile Integration' as check_type,
  COUNT(DISTINCT u.id) as auth_users,
  COUNT(DISTINCT p.id) as profile_users,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT p.id) as missing_profiles
FROM auth.users u
LEFT JOIN users p ON u.id = p.id;

-- =============================================================================
-- 12. PERFORMANCE CHECKS
-- =============================================================================

SELECT 'PERFORMANCE CHECKS' as test_category;

-- Check for missing indexes on foreign keys
SELECT
  t.table_name,
  kcu.column_name,
  CASE
    WHEN i.indexname IS NULL THEN '❌ Missing Index'
    ELSE '✅ Indexed'
  END as index_status
FROM information_schema.table_constraints AS t
JOIN information_schema.key_column_usage AS kcu
  ON t.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes i
  ON i.tablename = t.table_name
  AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE t.constraint_type = 'FOREIGN KEY'
  AND t.table_schema = 'public'
ORDER BY t.table_name, kcu.column_name;
