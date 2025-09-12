-- Complete Database Restore for LockerRoom App
-- This migration recreates all essential tables for the LockerRoom application
-- Run this after accidentally deleting all database tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

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
  verification_level TEXT DEFAULT 'unverified'
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

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages_firebase ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;