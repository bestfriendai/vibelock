-- Supabase Search Enhancement Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Enable pg_trgm extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create similarity search function
CREATE OR REPLACE FUNCTION similarity_search(
  search_query TEXT,
  search_table TEXT,
  search_column TEXT,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  id UUID,
  similarity_score FLOAT,
  content JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE search_table
    WHEN 'reviews_firebase' THEN
      RETURN QUERY
      EXECUTE format('
        SELECT r.id, similarity($1, r.%I) as similarity_score,
               to_jsonb(r.*) as content
        FROM %I r
        WHERE r.%I %% $1
        ORDER BY similarity_score DESC
        LIMIT 50
      ', search_column, search_table, search_column)
      USING search_query;
    WHEN 'chat_messages' THEN
      RETURN QUERY
      EXECUTE format('
        SELECT m.id, similarity($1, m.%I) as similarity_score,
               to_jsonb(m.*) as content
        FROM %I m
        WHERE m.%I %% $1
        ORDER BY similarity_score DESC
        LIMIT 50
      ', search_column, search_table, search_column)
      USING search_query;
    ELSE
      RAISE EXCEPTION 'Unsupported table: %', search_table;
  END CASE;
END;
$$;

-- 3. Create GIN indexes for better text search performance

-- Index for reviews_firebase table
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_review_text_gin
ON reviews_firebase USING gin(review_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_reviews_firebase_person_name_gin
ON reviews_firebase USING gin(reviewed_person_name gin_trgm_ops);

-- Combined FTS index for reviews_firebase
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_fts
ON reviews_firebase USING gin(
  to_tsvector('english',
    COALESCE(review_text, '') || ' ' ||
    COALESCE(reviewed_person_name, '')
  )
);

-- Index for chat_messages table (if it exists)
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_gin
ON chat_messages USING gin(content gin_trgm_ops);

-- 4. Create enhanced full-text search function
CREATE OR REPLACE FUNCTION enhanced_text_search(
  search_query TEXT,
  search_table TEXT,
  limit_count INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  rank_score FLOAT,
  content JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE search_table
    WHEN 'reviews_firebase' THEN
      RETURN QUERY
      EXECUTE format('
        SELECT r.id,
               ts_rank(to_tsvector(''english'',
                 COALESCE(r.review_text, '''') || '' '' ||
                 COALESCE(r.reviewed_person_name, '''')
               ), plainto_tsquery(''english'', $1)) as rank_score,
               to_jsonb(r.*) as content
        FROM %I r
        WHERE to_tsvector(''english'',
                COALESCE(r.review_text, '''') || '' '' ||
                COALESCE(r.reviewed_person_name, '''')
              ) @@ plainto_tsquery(''english'', $1)
        ORDER BY rank_score DESC
        LIMIT $2
      ', search_table)
      USING search_query, limit_count;
    ELSE
      RAISE EXCEPTION 'Unsupported table for FTS: %', search_table;
  END CASE;
END;
$$;

-- 5. Create hybrid search function (combines similarity and FTS)
CREATE OR REPLACE FUNCTION hybrid_search(
  search_query TEXT,
  search_table TEXT,
  similarity_weight FLOAT DEFAULT 0.4,
  fts_weight FLOAT DEFAULT 0.6,
  limit_count INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  combined_score FLOAT,
  similarity_score FLOAT,
  fts_score FLOAT,
  content JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE search_table
    WHEN 'reviews_firebase' THEN
      RETURN QUERY
      EXECUTE format('
        WITH similarity_results AS (
          SELECT r.id,
                 similarity($1, r.review_text) as sim_score,
                 to_jsonb(r.*) as content
          FROM %I r
          WHERE r.review_text %% $1
        ),
        fts_results AS (
          SELECT r.id,
                 ts_rank(to_tsvector(''english'',
                   COALESCE(r.review_text, '''') || '' '' ||
                   COALESCE(r.reviewed_person_name, '''')
                 ), plainto_tsquery(''english'', $1)) as fts_score,
                 to_jsonb(r.*) as content
          FROM %I r
          WHERE to_tsvector(''english'',
                  COALESCE(r.review_text, '''') || '' '' ||
                  COALESCE(r.reviewed_person_name, '''')
                ) @@ plainto_tsquery(''english'', $1)
        )
        SELECT
          COALESCE(s.id, f.id) as id,
          (COALESCE(s.sim_score, 0) * $2 + COALESCE(f.fts_score, 0) * $3) as combined_score,
          COALESCE(s.sim_score, 0) as similarity_score,
          COALESCE(f.fts_score, 0) as fts_score,
          COALESCE(s.content, f.content) as content
        FROM similarity_results s
        FULL OUTER JOIN fts_results f ON s.id = f.id
        ORDER BY combined_score DESC
        LIMIT $4
      ', search_table, search_table)
      USING search_query, similarity_weight, fts_weight, limit_count;
    ELSE
      RAISE EXCEPTION 'Unsupported table for hybrid search: %', search_table;
  END CASE;
END;
$$;

-- 6. Create search analytics table (optional)
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'basic', 'similarity', 'fts', 'hybrid'
  user_id UUID REFERENCES auth.users(id),
  results_count INT NOT NULL,
  execution_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at
ON search_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id
ON search_analytics(user_id);

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;
GRANT EXECUTE ON FUNCTION enhanced_text_search TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search TO authenticated;

-- 8. Create RLS policies for search analytics (if needed)
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search analytics" ON search_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search analytics" ON search_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Create search suggestions function
CREATE OR REPLACE FUNCTION get_search_suggestions(
  partial_query TEXT,
  limit_count INT DEFAULT 10
)
RETURNS TABLE(suggestion TEXT, frequency INT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    search_query as suggestion,
    COUNT(*)::INT as frequency
  FROM search_analytics
  WHERE search_query ILIKE partial_query || '%'
    AND char_length(search_query) >= 3
  GROUP BY search_query
  ORDER BY frequency DESC, search_query
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated;

-- Instructions for use:
-- 1. Run this entire script in your Supabase SQL Editor
-- 2. The functions will be available for use in your application
-- 3. Use similarity_search for trigram-based similarity matching
-- 4. Use enhanced_text_search for full-text search with ranking
-- 5. Use hybrid_search for combined similarity + FTS results
-- 6. Search analytics will help you understand user search patterns

COMMENT ON FUNCTION similarity_search IS 'Performs trigram similarity search using pg_trgm extension';
COMMENT ON FUNCTION enhanced_text_search IS 'Performs full-text search with PostgreSQL tsvector and ranking';
COMMENT ON FUNCTION hybrid_search IS 'Combines similarity and full-text search with weighted scoring';
COMMENT ON FUNCTION get_search_suggestions IS 'Returns search suggestions based on historical search data';