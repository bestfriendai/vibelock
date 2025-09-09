-- Add performance indexes for chat_rooms_firebase table
-- These indexes were separated from the column additions due to pipeline restrictions

-- Add critical performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_category 
ON chat_rooms_firebase (category);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_unread_count 
ON chat_rooms_firebase (unread_count) 
WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_activity_sorted 
ON chat_rooms_firebase (last_activity DESC) 
WHERE is_active = true;

-- Update existing rooms to have last_activity if NULL (in case it wasn't done before)
UPDATE chat_rooms_firebase 
SET last_activity = COALESCE(updated_at, created_at, NOW())
WHERE last_activity IS NULL;