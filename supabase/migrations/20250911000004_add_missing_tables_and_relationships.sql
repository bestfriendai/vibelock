-- Add Missing Tables and Relationships for LockerRoom App
-- This migration specifically adds the tables that were missing from the original schema
-- and ensures all relationships and constraints are properly established

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_members_firebase table for chat room membership management
CREATE TABLE IF NOT EXISTS chat_members_firebase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{
    "can_send_messages": true,
    "can_send_media": true,
    "can_invite_users": false,
    "can_kick_users": false,
    "can_ban_users": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_chat_members_room FOREIGN KEY (chat_room_id)
    REFERENCES chat_rooms_firebase(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_members_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_room_user UNIQUE (chat_room_id, user_id)
);

-- Create message_reads table for tracking read status
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_message_reads_room FOREIGN KEY (room_id)
    REFERENCES chat_rooms_firebase(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_reads_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_reads_message FOREIGN KEY (last_message_id)
    REFERENCES chat_messages_firebase(id) ON DELETE SET NULL,
  CONSTRAINT unique_room_user_reads UNIQUE (room_id, user_id)
);

-- Create follows table for user following relationships
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_follows_following FOREIGN KEY (following_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create blocks table for user blocking
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_blocker_blocked UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Create review_likes table for review likes
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_review_likes_review FOREIGN KEY (review_id)
    REFERENCES reviews_firebase(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_likes_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_review_user_like UNIQUE (review_id, user_id)
);

-- Create colleges table for educational institutions
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  coordinates JSONB, -- Format: {"lat": number, "lng": number}
  institution_type TEXT CHECK (institution_type IN ('public', 'private', 'community', 'technical', 'other')),
  alias TEXT[], -- Array of alternative names and abbreviations
  scorecard_id TEXT, -- Department of Education College Scorecard ID
  website_url TEXT,
  student_count INTEGER CHECK (student_count >= 0),
  founded_year INTEGER CHECK (founded_year > 1600 AND founded_year <= EXTRACT(YEAR FROM NOW())),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT colleges_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Add missing columns to users table (if they don't exist)
DO $$
BEGIN
  -- Add college_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'college_id'
  ) THEN
    ALTER TABLE users ADD COLUMN college_id UUID;
    ALTER TABLE users ADD CONSTRAINT fk_users_college
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
  END IF;

  -- Add follower_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'follower_count'
  ) THEN
    ALTER TABLE users ADD COLUMN follower_count INTEGER DEFAULT 0 CHECK (follower_count >= 0);
  END IF;

  -- Add following_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0 CHECK (following_count >= 0);
  END IF;

  -- Add privacy_settings column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'privacy_settings'
  ) THEN
    ALTER TABLE users ADD COLUMN privacy_settings JSONB DEFAULT '{
      "profile_visible": true,
      "location_visible": true,
      "reviews_visible": true,
      "followers_visible": true,
      "following_visible": true
    }'::jsonb;
  END IF;
END
$$;

-- Create indexes for performance optimization

-- Chat members indexes
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_room_id ON chat_members_firebase(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members_firebase(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_role ON chat_members_firebase(role);
CREATE INDEX IF NOT EXISTS idx_chat_members_is_active ON chat_members_firebase(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_members_joined_at ON chat_members_firebase(joined_at DESC);

-- Message reads indexes
CREATE INDEX IF NOT EXISTS idx_message_reads_room_id ON message_reads(room_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_last_read_at ON message_reads(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reads_last_message_id ON message_reads(last_message_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- Blocks indexes
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC);

-- Review likes indexes
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_created_at ON review_likes(created_at DESC);

-- Colleges indexes
CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(name);
CREATE INDEX IF NOT EXISTS idx_colleges_city_state ON colleges(city, state);
CREATE INDEX IF NOT EXISTS idx_colleges_institution_type ON colleges(institution_type);
CREATE INDEX IF NOT EXISTS idx_colleges_is_active ON colleges(is_active);
CREATE INDEX IF NOT EXISTS idx_colleges_scorecard_id ON colleges(scorecard_id) WHERE scorecard_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_colleges_student_count ON colleges(student_count DESC) WHERE student_count IS NOT NULL;

-- Additional user indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id) WHERE college_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_follower_count ON users(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_users_following_count ON users(following_count DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_chat_members_room_active ON chat_members_firebase(chat_room_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_follows_mutual ON follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_blocks_relationship ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_review ON review_likes(user_id, review_id);

-- Add updated_at triggers for new tables with updated_at columns

-- Create or replace the trigger function (should already exist from main migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
CREATE TRIGGER update_chat_members_firebase_updated_at
  BEFORE UPDATE ON chat_members_firebase
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_reads_updated_at
  BEFORE UPDATE ON message_reads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colleges_updated_at
  BEFORE UPDATE ON colleges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all new tables
ALTER TABLE chat_members_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- Add helpful comments for documentation
COMMENT ON TABLE chat_members_firebase IS 'Manages membership in chat rooms with roles and permissions';
COMMENT ON TABLE message_reads IS 'Tracks the last read message for each user in each chat room';
COMMENT ON TABLE follows IS 'User following relationships for social networking features';
COMMENT ON TABLE blocks IS 'User blocking relationships for safety and moderation';
COMMENT ON TABLE review_likes IS 'Tracks which users have liked which reviews';
COMMENT ON TABLE colleges IS 'Master list of colleges and universities for user affiliation';

-- Column comments
COMMENT ON COLUMN chat_members_firebase.role IS 'User role in chat room: admin, moderator, or member';
COMMENT ON COLUMN chat_members_firebase.permissions IS 'JSON object defining user permissions in the room';
COMMENT ON COLUMN message_reads.last_read_at IS 'Timestamp when user last read messages in this room';
COMMENT ON COLUMN message_reads.last_message_id IS 'ID of the last message the user has read';
COMMENT ON COLUMN colleges.coordinates IS 'Geographic coordinates in format: {"lat": number, "lng": number}';
COMMENT ON COLUMN colleges.alias IS 'Array of alternative names, abbreviations, and common nicknames';
COMMENT ON COLUMN colleges.scorecard_id IS 'Department of Education College Scorecard identifier';
COMMENT ON COLUMN users.college_id IS 'Reference to the college/university the user is affiliated with';
COMMENT ON COLUMN users.follower_count IS 'Cached count of users following this user (updated by triggers)';
COMMENT ON COLUMN users.following_count IS 'Cached count of users this user follows (updated by triggers)';
COMMENT ON COLUMN users.privacy_settings IS 'JSON object with user privacy preferences';

-- Insert some initial college data for common institutions
INSERT INTO colleges (name, city, state, institution_type, alias, is_active) VALUES
  ('University of California, Los Angeles', 'Los Angeles', 'CA', 'public', ARRAY['UCLA', 'UC Los Angeles'], true),
  ('University of Southern California', 'Los Angeles', 'CA', 'private', ARRAY['USC', 'Southern Cal'], true),
  ('Stanford University', 'Stanford', 'CA', 'private', ARRAY['Stanford'], true),
  ('University of California, Berkeley', 'Berkeley', 'CA', 'public', ARRAY['UC Berkeley', 'Cal', 'Berkeley'], true),
  ('Harvard University', 'Cambridge', 'MA', 'private', ARRAY['Harvard'], true),
  ('Massachusetts Institute of Technology', 'Cambridge', 'MA', 'private', ARRAY['MIT'], true),
  ('Yale University', 'New Haven', 'CT', 'private', ARRAY['Yale'], true),
  ('Princeton University', 'Princeton', 'NJ', 'private', ARRAY['Princeton'], true),
  ('Columbia University', 'New York', 'NY', 'private', ARRAY['Columbia'], true),
  ('University of Pennsylvania', 'Philadelphia', 'PA', 'private', ARRAY['UPenn', 'Penn'], true),
  ('Cornell University', 'Ithaca', 'NY', 'private', ARRAY['Cornell'], true),
  ('Brown University', 'Providence', 'RI', 'private', ARRAY['Brown'], true),
  ('Dartmouth College', 'Hanover', 'NH', 'private', ARRAY['Dartmouth'], true),
  ('University of Chicago', 'Chicago', 'IL', 'private', ARRAY['UChicago', 'Chicago'], true),
  ('Northwestern University', 'Evanston', 'IL', 'private', ARRAY['Northwestern'], true),
  ('Duke University', 'Durham', 'NC', 'private', ARRAY['Duke'], true),
  ('Vanderbilt University', 'Nashville', 'TN', 'private', ARRAY['Vanderbilt', 'Vandy'], true),
  ('Rice University', 'Houston', 'TX', 'private', ARRAY['Rice'], true),
  ('University of Notre Dame', 'Notre Dame', 'IN', 'private', ARRAY['Notre Dame', 'ND'], true),
  ('Georgetown University', 'Washington', 'DC', 'private', ARRAY['Georgetown'], true),
  ('Carnegie Mellon University', 'Pittsburgh', 'PA', 'private', ARRAY['CMU', 'Carnegie Mellon'], true),
  ('Emory University', 'Atlanta', 'GA', 'private', ARRAY['Emory'], true),
  ('University of California, San Diego', 'San Diego', 'CA', 'public', ARRAY['UCSD', 'UC San Diego'], true),
  ('University of Michigan', 'Ann Arbor', 'MI', 'public', ARRAY['UMich', 'Michigan'], true),
  ('University of Virginia', 'Charlottesville', 'VA', 'public', ARRAY['UVA', 'Virginia'], true),
  ('University of North Carolina at Chapel Hill', 'Chapel Hill', 'NC', 'public', ARRAY['UNC', 'Chapel Hill'], true),
  ('University of Florida', 'Gainesville', 'FL', 'public', ARRAY['UF', 'Florida'], true),
  ('University of Texas at Austin', 'Austin', 'TX', 'public', ARRAY['UT Austin', 'Texas'], true),
  ('University of Washington', 'Seattle', 'WA', 'public', ARRAY['UW', 'Washington'], true),
  ('Georgia Institute of Technology', 'Atlanta', 'GA', 'public', ARRAY['Georgia Tech', 'GT'], true)
ON CONFLICT (name) DO NOTHING;

-- Verify all foreign key relationships are properly established
DO $$
DECLARE
  fk_record RECORD;
  fk_count INTEGER := 0;
BEGIN
  -- Count foreign key constraints for the new tables
  FOR fk_record IN
    SELECT
      tc.table_name,
      tc.constraint_name,
      ccu.column_name AS referenced_column,
      ccu.table_name AS referenced_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('chat_members_firebase', 'message_reads', 'follows', 'blocks', 'review_likes', 'colleges')
  LOOP
    fk_count := fk_count + 1;
    RAISE NOTICE 'Foreign key: %.% -> %.%',
      fk_record.table_name, fk_record.constraint_name,
      fk_record.referenced_table, fk_record.referenced_column;
  END LOOP;

  RAISE NOTICE 'Total foreign key constraints created: %', fk_count;
END
$$;

-- Final validation: Check that all expected tables exist
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
  expected_tables TEXT[] := ARRAY[
    'users', 'reviews_firebase', 'comments_firebase', 'chat_rooms_firebase',
    'chat_messages_firebase', 'chat_members_firebase', 'message_reads',
    'follows', 'blocks', 'review_likes', 'colleges', 'notifications',
    'push_tokens', 'reports'
  ];
BEGIN
  FOREACH table_name IN ARRAY expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := missing_tables || table_name;
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All required tables are present and accounted for!';
  END IF;
END
$$;