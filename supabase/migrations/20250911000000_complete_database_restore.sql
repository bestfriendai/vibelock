-- Complete Database Restore for LockerRoom App
-- This migration recreates all essential tables for the LockerRoom application
-- Run this after accidentally deleting all database tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom data types for enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier_enum') THEN
        CREATE TYPE subscription_tier_enum AS ENUM ('free', 'premium', 'enterprise');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_level_enum') THEN
        CREATE TYPE verification_level_enum AS ENUM ('unverified', 'email_verified', 'phone_verified', 'full_verified');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
        CREATE TYPE gender_enum AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type_enum') THEN
        CREATE TYPE institution_type_enum AS ENUM ('public', 'private', 'community', 'technical', 'other');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status_enum') THEN
        CREATE TYPE review_status_enum AS ENUM ('active', 'pending', 'flagged', 'deleted');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type_enum') THEN
        CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'voice', 'video', 'file', 'system');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_room_type_enum') THEN
        CREATE TYPE chat_room_type_enum AS ENUM ('public', 'private', 'direct', 'group');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role_enum') THEN
        CREATE TYPE member_role_enum AS ENUM ('admin', 'moderator', 'member');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_enum') THEN
        CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');
    END IF;
END
$$;

-- Create users table (core authentication and profile data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id TEXT,
  ban_reason TEXT,
  city TEXT,
  clerk_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  gender TEXT,
  gender_preference TEXT DEFAULT 'all',
  institution_type TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  location_address TEXT,
  location_full_name TEXT,
  location_name TEXT,
  location_type TEXT,
  location_updated_at TIMESTAMPTZ,
  longitude DOUBLE PRECISION,
  reputation_score INTEGER DEFAULT 0,
  state TEXT,
  subscription_expires_at TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'free',
  total_reviews_submitted INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  username TEXT,
  verification_level TEXT DEFAULT 'unverified',
  college_id UUID, -- Reference to colleges table
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  privacy_settings JSONB DEFAULT '{"profile_visible": true, "location_visible": true}'::jsonb
);

-- Create reviews_firebase table (main review content)
CREATE TABLE IF NOT EXISTS reviews_firebase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dislike_count INTEGER DEFAULT 0,
  green_flags TEXT[],
  is_anonymous BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  location TEXT,
  media JSONB,
  profile_photo TEXT NOT NULL,
  red_flags TEXT[],
  review_text TEXT NOT NULL,
  reviewed_person_location JSONB NOT NULL,
  reviewed_person_name TEXT NOT NULL,
  reviewer_anonymous_id TEXT NOT NULL,
  sentiment TEXT,
  social_media JSONB,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments_firebase table (comments on reviews)
CREATE TABLE IF NOT EXISTS comments_firebase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dislike_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  media_id TEXT,
  parent_comment_id UUID REFERENCES comments_firebase(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews_firebase(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_rooms_firebase table (chat room definitions)
CREATE TABLE IF NOT EXISTS chat_rooms_firebase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  last_message JSONB,
  location JSONB,
  member_count INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  online_count INTEGER DEFAULT 0,
  type TEXT NOT NULL,
  typing_users JSONB DEFAULT '[]'::jsonb,
  unread_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages_firebase table (chat messages)
CREATE TABLE IF NOT EXISTS chat_messages_firebase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID REFERENCES chat_rooms_firebase(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  message_type TEXT DEFAULT 'text',
  reactions JSONB DEFAULT '{}'::jsonb,
  reply_to UUID REFERENCES chat_messages_firebase(id) ON DELETE SET NULL,
  sender_avatar TEXT,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table (push notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB,
  expo_push_token TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create push_tokens table (device push notification tokens)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, device_id)
);

-- Create reports table (content reporting system)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  reason TEXT NOT NULL,
  reported_item_id TEXT NOT NULL,
  reported_item_type TEXT NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_members_firebase table (chat room membership management)
CREATE TABLE IF NOT EXISTS chat_members_firebase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms_firebase(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{"can_send_messages": true, "can_send_media": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_room_id, user_id)
);

-- Create message_reads table (message read status tracking)
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms_firebase(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_id UUID REFERENCES chat_messages_firebase(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create follows table (user following relationships)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Prevent self-following
);

-- Create blocks table (user blocking)
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id) -- Prevent self-blocking
);

-- Create review_likes table (review likes)
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews_firebase(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Create colleges table (college/university data)
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  coordinates JSONB, -- {"lat": number, "lng": number}
  institution_type TEXT CHECK (institution_type IN ('public', 'private', 'community', 'technical', 'other')),
  alias TEXT[], -- Alternative names and abbreviations
  scorecard_id TEXT, -- Reference to Department of Education College Scorecard ID
  website_url TEXT,
  student_count INTEGER,
  founded_year INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for college_id in users table
ALTER TABLE users ADD CONSTRAINT fk_users_college_id FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_author_id ON reviews_firebase(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_created_at ON reviews_firebase(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_category ON reviews_firebase(category);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_status ON reviews_firebase(status);
CREATE INDEX IF NOT EXISTS idx_comments_firebase_review_id ON comments_firebase(review_id);
CREATE INDEX IF NOT EXISTS idx_comments_firebase_author_id ON comments_firebase(author_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_type ON chat_rooms_firebase(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_category ON chat_rooms_firebase(category);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_firebase_is_active ON chat_rooms_firebase(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_messages_firebase_chat_room_id ON chat_messages_firebase(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_firebase_timestamp ON chat_messages_firebase(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_firebase_sender_id ON chat_messages_firebase(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_chat_members_firebase_chat_room_id ON chat_members_firebase(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_firebase_user_id ON chat_members_firebase(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_firebase_role ON chat_members_firebase(role);
CREATE INDEX IF NOT EXISTS idx_chat_members_firebase_is_active ON chat_members_firebase(is_active);

CREATE INDEX IF NOT EXISTS idx_message_reads_room_id ON message_reads(room_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_last_read_at ON message_reads(last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_created_at ON review_likes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(name);
CREATE INDEX IF NOT EXISTS idx_colleges_city_state ON colleges(city, state);
CREATE INDEX IF NOT EXISTS idx_colleges_institution_type ON colleges(institution_type);
CREATE INDEX IF NOT EXISTS idx_colleges_is_active ON colleges(is_active);
CREATE INDEX IF NOT EXISTS idx_colleges_scorecard_id ON colleges(scorecard_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_users_follower_count ON users(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_users_reputation_score ON users(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_like_count ON reviews_firebase(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_firebase_like_count ON comments_firebase(like_count DESC);

-- Create updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_firebase_updated_at BEFORE UPDATE ON reviews_firebase FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_firebase_updated_at BEFORE UPDATE ON comments_firebase FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_rooms_firebase_updated_at BEFORE UPDATE ON chat_rooms_firebase FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_members_firebase_updated_at BEFORE UPDATE ON chat_members_firebase FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_reads_updated_at BEFORE UPDATE ON message_reads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- Add data integrity constraints
ALTER TABLE reviews_firebase ADD CONSTRAINT chk_reviews_like_count CHECK (like_count >= 0);
ALTER TABLE reviews_firebase ADD CONSTRAINT chk_reviews_dislike_count CHECK (dislike_count >= 0);
ALTER TABLE comments_firebase ADD CONSTRAINT chk_comments_like_count CHECK (like_count >= 0);
ALTER TABLE comments_firebase ADD CONSTRAINT chk_comments_dislike_count CHECK (dislike_count >= 0);
ALTER TABLE chat_rooms_firebase ADD CONSTRAINT chk_chat_rooms_member_count CHECK (member_count >= 0);
ALTER TABLE chat_rooms_firebase ADD CONSTRAINT chk_chat_rooms_online_count CHECK (online_count >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_follower_count CHECK (follower_count >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_following_count CHECK (following_count >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_reputation_score CHECK (reputation_score >= 0);

-- Add comments to tables for documentation
COMMENT ON TABLE chat_members_firebase IS 'Manages membership in chat rooms with roles and permissions';
COMMENT ON TABLE message_reads IS 'Tracks read status of messages by users in chat rooms';
COMMENT ON TABLE follows IS 'User following relationships for social features';
COMMENT ON TABLE blocks IS 'User blocking relationships for safety and privacy';
COMMENT ON TABLE review_likes IS 'Tracks which users have liked which reviews';
COMMENT ON TABLE colleges IS 'Master list of colleges and universities for user affiliation';

COMMENT ON COLUMN users.college_id IS 'Reference to the college/university the user is affiliated with';
COMMENT ON COLUMN users.follower_count IS 'Cached count of users following this user (updated by triggers)';
COMMENT ON COLUMN users.following_count IS 'Cached count of users this user is following (updated by triggers)';
COMMENT ON COLUMN chat_members_firebase.role IS 'User role in the chat room: admin, moderator, or member';
COMMENT ON COLUMN chat_members_firebase.permissions IS 'JSON object defining what the user can do in the room';
COMMENT ON COLUMN message_reads.last_read_at IS 'Timestamp of when the user last read messages in this room';
COMMENT ON COLUMN colleges.scorecard_id IS 'Department of Education College Scorecard identifier';
COMMENT ON COLUMN colleges.coordinates IS 'Geographic coordinates as JSON: {"lat": number, "lng": number}';