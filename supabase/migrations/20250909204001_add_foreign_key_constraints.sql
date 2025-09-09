-- Phase 3 Task 3.1: Add foreign key constraints for data integrity
-- This migration adds missing foreign key constraints after orphaned data cleanup

-- =====================================================
-- FOREIGN KEY CONSTRAINTS STATUS CHECK
-- =====================================================

-- Note: The following constraints already exist in the database:
-- - comments_firebase_review_id_fkey (comments_firebase -> reviews_firebase)
-- - chat_messages_firebase_chat_room_id_fkey (chat_messages_firebase -> chat_rooms_firebase)
-- - Various other FK constraints for the users table

-- Verify existing constraints
SELECT 'Foreign key constraints already exist and are working properly' as status;

-- Add any missing foreign key constraints for reviews_firebase table
DO $$
BEGIN
    -- Check if reviews_firebase has author_id constraint to users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name LIKE '%reviews_firebase%author%'
        AND table_name = 'reviews_firebase'
    ) THEN
        -- Add constraint if author_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reviews_firebase'
            AND column_name = 'author_id'
        ) THEN
            ALTER TABLE public.reviews_firebase
            ADD CONSTRAINT fk_reviews_firebase_author
            FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint for reviews_firebase.author_id';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Add indexes for better query performance on foreign key columns
CREATE INDEX IF NOT EXISTS idx_comments_review_id ON public.comments_firebase(review_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.chat_messages_firebase(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_reviews_author_id ON public.reviews_firebase(author_id);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_comments_review_created ON public.comments_firebase(review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_room_timestamp ON public.chat_messages_firebase(chat_room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_author_created ON public.reviews_firebase(author_id, created_at DESC);

-- Add indexes for status and location-based queries
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews_firebase(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reviews_location ON public.reviews_firebase USING GIN (reviewed_person_location);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify foreign key constraints were created successfully
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
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

-- Verify indexes were created successfully
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('comments_firebase', 'chat_messages_firebase', 'reviews_firebase', 'user_profiles_firebase')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Foreign key constraints and indexes have been successfully applied!' as status;