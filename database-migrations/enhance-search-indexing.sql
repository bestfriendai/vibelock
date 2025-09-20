-- Migration: Enhanced search indexing for messages
-- Purpose: Optimize full-text search performance for message content

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add search vector column for full-text search
ALTER TABLE chat_messages_firebase
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to generate search vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Combine content, sender info, and room context for comprehensive search
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.sender_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.transcription, '')), 'B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search vector on insert and update
DROP TRIGGER IF EXISTS trigger_update_message_search_vector ON chat_messages_firebase;
CREATE TRIGGER trigger_update_message_search_vector
  BEFORE INSERT OR UPDATE OF content, sender_name, transcription
  ON chat_messages_firebase
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_chat_messages_search_vector
  ON chat_messages_firebase
  USING GIN(search_vector);

-- Create compound indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON chat_messages_firebase(chat_room_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created
  ON chat_messages_firebase(sender_id, created_at DESC)
  WHERE is_deleted = false;

-- Create trigram index for fuzzy text matching
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_trgm
  ON chat_messages_firebase
  USING GIN(content gin_trgm_ops)
  WHERE is_deleted = false;

-- Create function for room-specific message search
CREATE OR REPLACE FUNCTION search_messages_in_room(
  p_room_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  content TEXT,
  sender_id UUID,
  sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL,
  snippet TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS message_id,
    m.content,
    m.sender_id,
    m.sender_name,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', p_query)) AS rank,
    ts_headline(
      'english',
      m.content,
      plainto_tsquery('english', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
    ) AS snippet
  FROM chat_messages_firebase m
  WHERE
    m.chat_room_id = p_room_id
    AND m.is_deleted = false
    AND m.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create function for global message search across all accessible rooms
CREATE OR REPLACE FUNCTION search_messages_global(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  room_id UUID,
  room_name TEXT,
  content TEXT,
  sender_id UUID,
  sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL,
  snippet TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS message_id,
    m.chat_room_id AS room_id,
    r.name AS room_name,
    m.content,
    m.sender_id,
    m.sender_name,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', p_query)) AS rank,
    ts_headline(
      'english',
      m.content,
      plainto_tsquery('english', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
    ) AS snippet
  FROM chat_messages_firebase m
  INNER JOIN chat_rooms_firebase r ON m.chat_room_id = r.id
  INNER JOIN chat_members_firebase cm ON cm.chat_room_id = m.chat_room_id
  WHERE
    cm.user_id = p_user_id
    AND cm.is_active = true
    AND m.is_deleted = false
    AND m.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create function for fuzzy search (handles typos)
CREATE OR REPLACE FUNCTION search_messages_fuzzy(
  p_room_id UUID,
  p_query TEXT,
  p_similarity REAL DEFAULT 0.3,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  message_id UUID,
  content TEXT,
  sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS message_id,
    m.content,
    m.sender_name,
    m.created_at,
    similarity(m.content, p_query) AS similarity_score
  FROM chat_messages_firebase m
  WHERE
    m.chat_room_id = p_room_id
    AND m.is_deleted = false
    AND similarity(m.content, p_query) > p_similarity
  ORDER BY similarity_score DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Update existing messages to populate search vector
UPDATE chat_messages_firebase
SET search_vector =
  setweight(to_tsvector('english', COALESCE(content, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(sender_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(transcription, '')), 'B')
WHERE search_vector IS NULL;

-- Create materialized view for search suggestions
CREATE MATERIALIZED VIEW IF NOT EXISTS message_search_suggestions AS
SELECT
  word,
  ndoc,
  nentry
FROM ts_stat(
  'SELECT search_vector FROM chat_messages_firebase WHERE is_deleted = false'
)
WHERE nentry > 5  -- Only include words that appear in at least 5 messages
ORDER BY nentry DESC
LIMIT 1000;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_search_suggestions_word
  ON message_search_suggestions(word);

-- Create function to refresh search suggestions
CREATE OR REPLACE FUNCTION refresh_search_suggestions()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY message_search_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Create function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
  p_prefix TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (suggestion TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT word AS suggestion
  FROM message_search_suggestions
  WHERE word ILIKE p_prefix || '%'
  ORDER BY nentry DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION search_messages_in_room TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages_global TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages_fuzzy TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated;
GRANT SELECT ON message_search_suggestions TO authenticated;

-- Create scheduled job to refresh search suggestions (requires pg_cron extension)
-- Note: This needs to be run as superuser or database owner
-- SELECT cron.schedule('refresh-search-suggestions', '0 */6 * * *', 'SELECT refresh_search_suggestions();');

-- Add comments for documentation
COMMENT ON COLUMN chat_messages_firebase.search_vector IS 'Full-text search vector for optimized message search';
COMMENT ON FUNCTION search_messages_in_room IS 'Search messages within a specific chat room';
COMMENT ON FUNCTION search_messages_global IS 'Search messages across all accessible chat rooms';
COMMENT ON FUNCTION search_messages_fuzzy IS 'Fuzzy search for messages (handles typos)';
COMMENT ON MATERIALIZED VIEW message_search_suggestions IS 'Pre-computed search suggestions based on message content';