CREATE INDEX idx_chat_messages_timestamp ON chat_messages_firebase (timestamp DESC);
CREATE INDEX idx_chat_rooms_activity ON chat_rooms_firebase (last_activity DESC);
-- Partition if >1M rows
ALTER TABLE chat_messages_firebase PARTITION BY RANGE (timestamp);