-- Add missing columns to chat_rooms_firebase table
-- This migration fixes the error: column "unread_count" does not exist

-- Add all missing columns that the chatStore expects
ALTER TABLE chat_rooms_firebase
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

ALTER TABLE chat_rooms_firebase  
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'all';

ALTER TABLE chat_rooms_firebase
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns from the existing setup
ALTER TABLE chat_rooms_firebase
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE chat_rooms_firebase
ADD COLUMN IF NOT EXISTS online_count INTEGER DEFAULT 0;

ALTER TABLE chat_rooms_firebase
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure type column exists with correct default
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_rooms_firebase' AND column_name = 'type') THEN
        ALTER TABLE chat_rooms_firebase ADD COLUMN type VARCHAR(50) DEFAULT 'local';
    END IF;
END $$;

-- Add critical performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_category
ON chat_rooms_firebase (category);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_unread_count
ON chat_rooms_firebase (unread_count)
WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_activity_sorted
ON chat_rooms_firebase (last_activity DESC)
WHERE is_active = true;

-- Update existing rooms to have last_activity if NULL
UPDATE chat_rooms_firebase 
SET last_activity = COALESCE(updated_at, created_at, NOW())
WHERE last_activity IS NULL;