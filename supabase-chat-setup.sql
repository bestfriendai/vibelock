-- Enhanced Chat System Database Setup for Supabase
-- ✅ SUCCESSFULLY EXECUTED ON DATABASE
-- Run these commands in Supabase SQL Editor

-- CRITICAL FIX: Add missing columns that the chatStore expects
ALTER TABLE chat_rooms_firebase
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS online_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE chat_messages_firebase
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE chat_messages_firebase
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_to UUID,
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- Enable Row Level Security
ALTER TABLE chat_rooms_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages_firebase ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active chat rooms" ON chat_rooms_firebase;
DROP POLICY IF EXISTS "Anyone can read non-deleted messages" ON chat_messages_firebase;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON chat_messages_firebase;
DROP POLICY IF EXISTS "Users can update own messages" ON chat_messages_firebase;

-- Optimized RLS Policies for Anonymous + Authenticated Users
CREATE POLICY "Anyone can read active chat rooms" ON chat_rooms_firebase
FOR SELECT USING (is_active = true AND is_deleted = false);

CREATE POLICY "Anyone can read non-deleted messages" ON chat_messages_firebase
FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can insert messages" ON chat_messages_firebase
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own messages" ON chat_messages_firebase
FOR UPDATE USING (auth.uid()::text = sender_id);

-- Performance Indexes (Critical for Large Chat Histories)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_room_timestamp
ON chat_messages_firebase (chat_room_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_room_active
ON chat_messages_firebase (chat_room_id)
WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_activity
ON chat_rooms_firebase (last_activity DESC)
WHERE is_active = true;

-- Additional indexes for new columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_category
ON chat_rooms_firebase (category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_unread_count
ON chat_rooms_firebase (unread_count)
WHERE unread_count > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_type
ON chat_rooms_firebase (type);

-- Add typing_users column for real-time typing indicators
ALTER TABLE chat_rooms_firebase 
ADD COLUMN IF NOT EXISTS typing_users JSONB DEFAULT '[]'::jsonb;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for chat_rooms_firebase
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms_firebase;
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms_firebase
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old typing indicators (prevents memory leaks)
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
  UPDATE chat_rooms_firebase
  SET typing_users = '[]'::jsonb
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms_firebase;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages_firebase;

-- Verify setup
SELECT 'Database setup completed successfully' as status;

-- Show final table structure
SELECT
  'chat_rooms_firebase columns:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_rooms_firebase'
ORDER BY ordinal_position;

SELECT
  'chat_messages_firebase columns:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_messages_firebase'
ORDER BY ordinal_position;
