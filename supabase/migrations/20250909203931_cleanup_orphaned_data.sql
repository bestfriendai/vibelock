-- Phase 3 Task 3.1: Clean up orphaned data before adding foreign key constraints
-- This migration removes orphaned records that would violate foreign key constraints

-- =====================================================
-- BACKUP ORPHANED DATA (for recovery if needed)
-- =====================================================

-- Create backup tables for orphaned data
CREATE TABLE IF NOT EXISTS orphaned_comments_backup AS
SELECT c.*, 'missing_review' as orphan_reason, NOW() as backup_timestamp
FROM public.comments_firebase c
LEFT JOIN public.reviews_firebase r ON c.review_id = r.id
WHERE r.id IS NULL;

CREATE TABLE IF NOT EXISTS orphaned_messages_backup AS
SELECT m.*, 'missing_chat_room' as orphan_reason, NOW() as backup_timestamp
FROM public.chat_messages_firebase m
LEFT JOIN public.chat_rooms_firebase cr ON m.chat_room_id = cr.id
WHERE cr.id IS NULL;

-- =====================================================
-- CLEAN UP ORPHANED DATA
-- =====================================================

-- Log the count of orphaned records before cleanup
DO $$
DECLARE
    orphaned_comments_count INTEGER;
    orphaned_messages_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_comments_count
    FROM public.comments_firebase c
    LEFT JOIN public.reviews_firebase r ON c.review_id = r.id
    WHERE r.id IS NULL;

    SELECT COUNT(*) INTO orphaned_messages_count
    FROM public.chat_messages_firebase m
    LEFT JOIN public.chat_rooms_firebase cr ON m.chat_room_id = cr.id
    WHERE cr.id IS NULL;

    RAISE NOTICE 'Found % orphaned comments and % orphaned messages', orphaned_comments_count, orphaned_messages_count;
END $$;

-- Delete orphaned comments (comments that reference non-existent reviews)
DELETE FROM public.comments_firebase
WHERE id IN (
    SELECT c.id
    FROM public.comments_firebase c
    LEFT JOIN public.reviews_firebase r ON c.review_id = r.id
    WHERE r.id IS NULL
);

-- Delete orphaned chat messages (messages that reference non-existent chat rooms)
DELETE FROM public.chat_messages_firebase
WHERE id IN (
    SELECT m.id
    FROM public.chat_messages_firebase m
    LEFT JOIN public.chat_rooms_firebase cr ON m.chat_room_id = cr.id
    WHERE cr.id IS NULL
);

-- Note: user_profiles_firebase table doesn't exist in this database
-- The users table is used instead and has proper auth.users foreign key constraints

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify cleanup was successful
DO $$
DECLARE
    remaining_orphaned_comments INTEGER;
    remaining_orphaned_messages INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphaned_comments
    FROM public.comments_firebase c
    LEFT JOIN public.reviews_firebase r ON c.review_id = r.id
    WHERE r.id IS NULL;

    SELECT COUNT(*) INTO remaining_orphaned_messages
    FROM public.chat_messages_firebase m
    LEFT JOIN public.chat_rooms_firebase cr ON m.chat_room_id = cr.id
    WHERE cr.id IS NULL;

    IF remaining_orphaned_comments > 0 OR remaining_orphaned_messages > 0 THEN
        RAISE EXCEPTION 'Cleanup failed: % orphaned comments and % orphaned messages remain',
            remaining_orphaned_comments, remaining_orphaned_messages;
    ELSE
        RAISE NOTICE 'Cleanup successful: All orphaned data has been removed';
    END IF;
END $$;

-- Show backup table counts
SELECT
    'orphaned_comments_backup' as table_name,
    COUNT(*) as backed_up_records
FROM orphaned_comments_backup
UNION ALL
SELECT
    'orphaned_messages_backup' as table_name,
    COUNT(*) as backed_up_records
FROM orphaned_messages_backup;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Orphaned data cleanup completed successfully!' as status;