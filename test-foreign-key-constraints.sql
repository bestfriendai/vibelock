-- =====================================================
-- FOREIGN KEY CONSTRAINTS TEST SUITE
-- =====================================================
-- This script tests all foreign key constraints to ensure they work correctly
-- Run this AFTER executing database-foreign-key-constraints.sql

-- =====================================================
-- TEST SETUP: Create test data
-- =====================================================

-- Create test user profile
INSERT INTO public.user_profiles_firebase (
    id, 
    email, 
    first_name, 
    last_name, 
    created_at, 
    updated_at
) VALUES (
    'test-user-fk-001',
    'test-fk@example.com',
    'Test',
    'User',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Create test chat room
INSERT INTO public.chat_rooms_firebase (
    id,
    name,
    description,
    created_at,
    updated_at
) VALUES (
    'test-room-fk-001',
    'Test Chat Room FK',
    'Test room for foreign key testing',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Create test review
INSERT INTO public.reviews_firebase (
    id,
    user_id,
    reviewed_person_name,
    reviewed_person_location,
    review_text,
    status,
    created_at,
    updated_at
) VALUES (
    'test-review-fk-001',
    'test-user-fk-001',
    'Test Person',
    '{"city": "Test City", "state": "Test State"}',
    'This is a test review for foreign key testing',
    'approved',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    review_text = EXCLUDED.review_text,
    updated_at = NOW();

-- Create test comment
INSERT INTO public.comments_firebase (
    id,
    review_id,
    author_id,
    author_name,
    content,
    created_at,
    updated_at
) VALUES (
    'test-comment-fk-001',
    'test-review-fk-001',
    'test-user-fk-001',
    'Test User',
    'This is a test comment for foreign key testing',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Create test chat message
INSERT INTO public.chat_messages_firebase (
    id,
    chat_room_id,
    sender_id,
    sender_name,
    message_text,
    timestamp,
    created_at
) VALUES (
    'test-message-fk-001',
    'test-room-fk-001',
    'test-user-fk-001',
    'Test User',
    'This is a test message for foreign key testing',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    message_text = EXCLUDED.message_text;

-- =====================================================
-- TEST 1: Verify test data was created
-- =====================================================

SELECT 'TEST 1: Verifying test data creation' as test_name;

SELECT 
    'user_profiles_firebase' as table_name,
    COUNT(*) as test_records
FROM public.user_profiles_firebase 
WHERE id = 'test-user-fk-001'

UNION ALL

SELECT 
    'chat_rooms_firebase' as table_name,
    COUNT(*) as test_records
FROM public.chat_rooms_firebase 
WHERE id = 'test-room-fk-001'

UNION ALL

SELECT 
    'reviews_firebase' as table_name,
    COUNT(*) as test_records
FROM public.reviews_firebase 
WHERE id = 'test-review-fk-001'

UNION ALL

SELECT 
    'comments_firebase' as table_name,
    COUNT(*) as test_records
FROM public.comments_firebase 
WHERE id = 'test-comment-fk-001'

UNION ALL

SELECT 
    'chat_messages_firebase' as table_name,
    COUNT(*) as test_records
FROM public.chat_messages_firebase 
WHERE id = 'test-message-fk-001';

-- =====================================================
-- TEST 2: Verify foreign key constraints exist
-- =====================================================

SELECT 'TEST 2: Verifying foreign key constraints exist' as test_name;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE'
        ELSE '❌ NOT CASCADE'
    END as cascade_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('comments_firebase', 'chat_messages_firebase', 'reviews_firebase', 'user_profiles_firebase')
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- TEST 3: Test CASCADE DELETE - Comments when Review deleted
-- =====================================================

SELECT 'TEST 3: Testing CASCADE DELETE - Comments when Review deleted' as test_name;

-- Count comments before deletion
SELECT 
    'Before deletion' as status,
    COUNT(*) as comment_count
FROM public.comments_firebase 
WHERE review_id = 'test-review-fk-001';

-- Delete the review (should cascade delete comments)
DELETE FROM public.reviews_firebase WHERE id = 'test-review-fk-001';

-- Count comments after deletion (should be 0)
SELECT 
    'After deletion' as status,
    COUNT(*) as comment_count
FROM public.comments_firebase 
WHERE review_id = 'test-review-fk-001';

-- =====================================================
-- TEST 4: Test CASCADE DELETE - Messages when Chat Room deleted
-- =====================================================

SELECT 'TEST 4: Testing CASCADE DELETE - Messages when Chat Room deleted' as test_name;

-- Count messages before deletion
SELECT 
    'Before deletion' as status,
    COUNT(*) as message_count
FROM public.chat_messages_firebase 
WHERE chat_room_id = 'test-room-fk-001';

-- Delete the chat room (should cascade delete messages)
DELETE FROM public.chat_rooms_firebase WHERE id = 'test-room-fk-001';

-- Count messages after deletion (should be 0)
SELECT 
    'After deletion' as status,
    COUNT(*) as message_count
FROM public.chat_messages_firebase 
WHERE chat_room_id = 'test-room-fk-001';

-- =====================================================
-- TEST 5: Verify indexes were created
-- =====================================================

SELECT 'TEST 5: Verifying performance indexes exist' as test_name;

SELECT 
    schemaname,
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE 'idx_%' THEN '✅ Custom Index'
        ELSE '❓ Other Index'
    END as index_status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('comments_firebase', 'chat_messages_firebase', 'reviews_firebase', 'user_profiles_firebase')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- CLEANUP: Remove test data
-- =====================================================

SELECT 'CLEANUP: Removing test data' as test_name;

-- Clean up remaining test data
DELETE FROM public.user_profiles_firebase WHERE id = 'test-user-fk-001';

-- Verify cleanup
SELECT 
    'Final cleanup verification' as status,
    (
        SELECT COUNT(*) FROM public.user_profiles_firebase WHERE id = 'test-user-fk-001'
    ) +
    (
        SELECT COUNT(*) FROM public.chat_rooms_firebase WHERE id = 'test-room-fk-001'
    ) +
    (
        SELECT COUNT(*) FROM public.reviews_firebase WHERE id = 'test-review-fk-001'
    ) +
    (
        SELECT COUNT(*) FROM public.comments_firebase WHERE id = 'test-comment-fk-001'
    ) +
    (
        SELECT COUNT(*) FROM public.chat_messages_firebase WHERE id = 'test-message-fk-001'
    ) as remaining_test_records;

SELECT 'Foreign Key Constraints Test Suite Completed Successfully!' as final_status;
