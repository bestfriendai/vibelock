-- COMPLETE SUPABASE DATABASE VERIFICATION
-- Run this single query in your Supabase SQL Editor to verify everything

WITH verification_results AS (
  -- 1. SCHEMA VERIFICATION - Check if all required tables exist
  SELECT 'SCHEMA VERIFICATION' as category, 'Required Tables' as test_name, '' as detail, '' as status, 1 as sort_order
  UNION ALL
  SELECT 
    'SCHEMA' as category,
    'Table: ' || table_name as test_name,
    table_type as detail,
    CASE 
      WHEN table_name IN (
        'users', 'reviews_firebase', 'comments_firebase', 
        'chat_rooms_firebase', 'chat_messages_firebase', 
        'notifications', 'push_tokens', 'reports', 'chat_room_subscriptions'
      ) THEN '✅ Required'
      ELSE '⚠️ Additional'
    END as status,
    2 as sort_order
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'

  UNION ALL

  -- 2. ROW LEVEL SECURITY VERIFICATION
  SELECT 'RLS VERIFICATION' as category, 'Row Level Security Status' as test_name, '' as detail, '' as status, 3 as sort_order
  UNION ALL
  SELECT 
    'RLS' as category,
    'RLS: ' || tablename as test_name,
    'Security Policy' as detail,
    CASE 
      WHEN rowsecurity THEN '✅ Enabled'
      ELSE '❌ Disabled'
    END as status,
    4 as sort_order
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'reviews_firebase', 'comments_firebase',
      'chat_rooms_firebase', 'chat_messages_firebase',
      'notifications', 'push_tokens', 'reports'
    )

  UNION ALL

  -- 3. FOREIGN KEY CONSTRAINTS VERIFICATION
  SELECT 'FOREIGN KEYS' as category, 'Foreign Key Constraints' as test_name, '' as detail, '' as status, 5 as sort_order
  UNION ALL
  SELECT 
    'FOREIGN KEYS' as category,
    'FK: ' || tc.table_name || '.' || kcu.column_name as test_name,
    'References ' || ccu.table_name || '.' || ccu.column_name as detail,
    '✅ Constraint Active' as status,
    6 as sort_order
  FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'

  UNION ALL

  -- 4. STORAGE BUCKETS VERIFICATION
  SELECT 'STORAGE' as category, 'Storage Buckets' as test_name, '' as detail, '' as status, 7 as sort_order
  UNION ALL
  SELECT 
    'STORAGE' as category,
    'Bucket: ' || name as test_name,
    CASE WHEN public THEN 'Public Access' ELSE 'Private Access' END as detail,
    CASE 
      WHEN name IN ('avatars', 'evidence', 'thumbnails', 'chat-media') THEN '✅ Required'
      ELSE '⚠️ Additional'
    END as status,
    8 as sort_order
  FROM storage.buckets

  UNION ALL

  -- 5. REALTIME PUBLICATION VERIFICATION
  SELECT 'REALTIME' as category, 'Realtime Publications' as test_name, '' as detail, '' as status, 9 as sort_order
  UNION ALL
  SELECT 
    'REALTIME' as category,
    'Realtime: ' || tablename as test_name,
    'Publication: ' || pubname as detail,
    CASE 
      WHEN tablename IN ('chat_messages_firebase', 'chat_rooms_firebase', 'comments_firebase') 
      THEN '✅ Required for Realtime'
      ELSE '⚠️ Check if needed'
    END as status,
    10 as sort_order
  FROM pg_publication_tables 
  WHERE pubname = 'supabase_realtime'

  UNION ALL

  -- 6. FUNCTIONS AND TRIGGERS VERIFICATION
  SELECT 'FUNCTIONS' as category, 'Database Functions' as test_name, '' as detail, '' as status, 11 as sort_order
  UNION ALL
  SELECT 
    'FUNCTIONS' as category,
    'Function: ' || routine_name as test_name,
    routine_type || ' -> ' || COALESCE(data_type, 'trigger') as detail,
    '✅ Function Exists' as status,
    12 as sort_order
  FROM information_schema.routines 
  WHERE routine_schema = 'public'
    AND routine_name LIKE '%updated_at%'
  UNION ALL
  SELECT 
    'TRIGGERS' as category,
    'Trigger: ' || trigger_name as test_name,
    'Table: ' || event_object_table || ' (' || action_timing || ' ' || event_manipulation || ')' as detail,
    '✅ Trigger Active' as status,
    13 as sort_order
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%updated_at%'

  UNION ALL

  -- 7. DATA INTEGRITY CHECKS
  SELECT 'DATA INTEGRITY' as category, 'Data Integrity Checks' as test_name, '' as detail, '' as status, 14 as sort_order
  UNION ALL
  SELECT 
    'DATA INTEGRITY' as category,
    'Orphaned Reviews Check' as test_name,
    COUNT(*)::text || ' orphaned records' as detail,
    CASE WHEN COUNT(*) = 0 THEN '✅ No Issues' ELSE '❌ ' || COUNT(*) || ' Issues Found' END as status,
    15 as sort_order
  FROM reviews_firebase r
  LEFT JOIN auth.users u ON r.author_id = u.id
  WHERE u.id IS NULL
  UNION ALL
  SELECT 
    'DATA INTEGRITY' as category,
    'Orphaned Comments Check' as test_name,
    COUNT(*)::text || ' orphaned records' as detail,
    CASE WHEN COUNT(*) = 0 THEN '✅ No Issues' ELSE '❌ ' || COUNT(*) || ' Issues Found' END as status,
    16 as sort_order
  FROM comments_firebase c
  LEFT JOIN reviews_firebase r ON c.review_id = r.id
  WHERE r.id IS NULL
  UNION ALL
  SELECT 
    'DATA INTEGRITY' as category,
    'Orphaned Chat Messages Check' as test_name,
    COUNT(*)::text || ' orphaned records' as detail,
    CASE WHEN COUNT(*) = 0 THEN '✅ No Issues' ELSE '❌ ' || COUNT(*) || ' Issues Found' END as status,
    17 as sort_order
  FROM chat_messages_firebase m
  LEFT JOIN chat_rooms_firebase r ON m.chat_room_id = r.id
  WHERE r.id IS NULL

  UNION ALL

  -- 8. RECORD COUNTS
  SELECT 'RECORD COUNTS' as category, 'Database Population' as test_name, '' as detail, '' as status, 18 as sort_order
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'users' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 19 as sort_order FROM users
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'reviews_firebase' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 20 as sort_order FROM reviews_firebase
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'comments_firebase' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 21 as sort_order FROM comments_firebase
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'chat_rooms_firebase' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 22 as sort_order FROM chat_rooms_firebase
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'chat_messages_firebase' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 23 as sort_order FROM chat_messages_firebase
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'notifications' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 24 as sort_order FROM notifications
  UNION ALL
  SELECT 'RECORD COUNTS' as category, 'push_tokens' as test_name, COUNT(*)::text || ' records' as detail, '📊 Data Count' as status, 25 as sort_order FROM push_tokens

  UNION ALL

  -- 9. AUTHENTICATION INTEGRATION CHECK
  SELECT 'AUTH INTEGRATION' as category, 'Authentication Integration' as test_name, '' as detail, '' as status, 26 as sort_order
  UNION ALL
  SELECT 
    'AUTH INTEGRATION' as category,
    'User Profile Sync' as test_name,
    'Auth Users: ' || COUNT(DISTINCT u.id)::text || ', Profile Users: ' || COUNT(DISTINCT p.id)::text as detail,
    CASE 
      WHEN COUNT(DISTINCT u.id) = COUNT(DISTINCT p.id) THEN '✅ Perfect Sync'
      WHEN COUNT(DISTINCT u.id) > COUNT(DISTINCT p.id) THEN '⚠️ Missing ' || (COUNT(DISTINCT u.id) - COUNT(DISTINCT p.id))::text || ' Profiles'
      ELSE '⚠️ Extra Profiles'
    END as status,
    27 as sort_order
  FROM auth.users u
  LEFT JOIN users p ON u.id = p.id
)

-- Final Results
SELECT 
  category,
  test_name,
  detail,
  status
FROM verification_results
ORDER BY sort_order, category, test_name;
