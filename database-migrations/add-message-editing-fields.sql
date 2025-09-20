-- Migration: Add message editing and forwarding fields
-- Purpose: Support message editing and forwarding functionality

-- Add editing fields to chat_messages_firebase table
ALTER TABLE chat_messages_firebase
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add forwarding fields to chat_messages_firebase table
ALTER TABLE chat_messages_firebase
  ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES chat_messages_firebase(id),
  ADD COLUMN IF NOT EXISTS forwarded_from_room_id UUID REFERENCES chat_rooms_firebase(id),
  ADD COLUMN IF NOT EXISTS forwarded_from_sender TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_edited_at
  ON chat_messages_firebase(edited_at)
  WHERE edited_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_forwarded_from
  ON chat_messages_firebase(forwarded_from_id)
  WHERE forwarded_from_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN chat_messages_firebase.edited_at IS 'Timestamp when the message was last edited';
COMMENT ON COLUMN chat_messages_firebase.is_edited IS 'Flag indicating if the message has been edited';
COMMENT ON COLUMN chat_messages_firebase.forwarded_from_id IS 'Reference to the original message if this is a forwarded message';
COMMENT ON COLUMN chat_messages_firebase.forwarded_from_room_id IS 'Reference to the original room if this is a forwarded message';
COMMENT ON COLUMN chat_messages_firebase.forwarded_from_sender IS 'Original sender name for forwarded messages';

-- Create RLS policies for message editing
CREATE POLICY "Users can edit their own messages within time limit"
  ON chat_messages_firebase
  FOR UPDATE
  USING (
    auth.uid() = sender_id
    AND created_at > NOW() - INTERVAL '15 minutes'
    AND message_type = 'text'
  );

-- Create RLS policies for message forwarding
CREATE POLICY "Users can forward messages they have access to"
  ON chat_messages_firebase
  FOR INSERT
  WITH CHECK (
    -- User must be a member of the target room
    EXISTS (
      SELECT 1 FROM chat_members_firebase
      WHERE user_id = auth.uid()
      AND chat_room_id = chat_messages_firebase.chat_room_id
      AND is_active = true
    )
    AND (
      -- If forwarding, user must have access to source message
      forwarded_from_id IS NULL
      OR EXISTS (
        SELECT 1 FROM chat_messages_firebase source_msg
        JOIN chat_members_firebase cm ON cm.chat_room_id = source_msg.chat_room_id
        WHERE source_msg.id = forwarded_from_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
      )
    )
  );

-- Create audit log tables for tracking edits and forwards
CREATE TABLE IF NOT EXISTS message_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages_firebase(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  original_content TEXT,
  new_content TEXT,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_forward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages_firebase(id),
  target_room_id UUID REFERENCES chat_rooms_firebase(id),
  user_id UUID REFERENCES auth.users(id),
  has_comment BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes on log tables
CREATE INDEX IF NOT EXISTS idx_message_edit_logs_message_id
  ON message_edit_logs(message_id);

CREATE INDEX IF NOT EXISTS idx_message_edit_logs_user_id
  ON message_edit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_message_forward_logs_message_id
  ON message_forward_logs(message_id);

CREATE INDEX IF NOT EXISTS idx_message_forward_logs_user_id
  ON message_forward_logs(user_id);

-- Add RLS policies for audit log tables
ALTER TABLE message_edit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_forward_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserting logs (no updates or deletes for audit trail)
CREATE POLICY "Users can create edit logs for their actions"
  ON message_edit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create forward logs for their actions"
  ON message_forward_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update edited_at timestamp
CREATE OR REPLACE FUNCTION update_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.edited_at = NOW();
    NEW.is_edited = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update edited_at
CREATE TRIGGER trigger_update_edited_at
  BEFORE UPDATE ON chat_messages_firebase
  FOR EACH ROW
  EXECUTE FUNCTION update_edited_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON chat_messages_firebase TO authenticated;
GRANT SELECT, INSERT ON message_edit_logs TO authenticated;
GRANT SELECT, INSERT ON message_forward_logs TO authenticated;