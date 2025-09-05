-- Migration script to align Supabase schema with Firebase structure
-- This script will modify existing tables to match our TypeScript types

-- First, let's modify the users table to match our User interface
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Update the users table to use auth.users.id as primary key instead of clerk_user_id
-- We'll keep the existing structure but add our required fields

-- Create a new reviews table structure that matches our Review interface
-- First backup existing reviews if needed, then recreate
CREATE TABLE IF NOT EXISTS public.reviews_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_anonymous_id TEXT NOT NULL,
  reviewed_person_name TEXT NOT NULL,
  reviewed_person_location JSONB NOT NULL, -- {city: string, state: string}
  category TEXT DEFAULT 'all',
  profile_photo TEXT NOT NULL,
  green_flags TEXT[] DEFAULT '{}',
  red_flags TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('green', 'red')),
  review_text TEXT NOT NULL,
  media JSONB DEFAULT '[]', -- Array of MediaItem objects
  social_media JSONB, -- SocialMediaHandles object
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_author_id ON public.reviews_new(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews_new(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews_new(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON public.reviews_new(sentiment);

-- Create chat_rooms table to match our ChatRoom interface
CREATE TABLE IF NOT EXISTS public.chat_rooms_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('local', 'global', 'topic')),
  category TEXT DEFAULT 'all' CHECK (category IN ('all', 'men', 'women', 'lgbtq+')),
  member_count INTEGER DEFAULT 0,
  online_count INTEGER DEFAULT 0,
  last_message JSONB, -- ChatMessage object
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  location JSONB, -- {city: string, state: string}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table to match our ChatMessage interface
CREATE TABLE IF NOT EXISTS public.chat_messages_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES public.chat_rooms_new(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'join', 'leave')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  reply_to UUID REFERENCES public.chat_messages_new(id)
);

-- Create indexes for chat performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages_new(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages_new(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages_new(sender_id);

-- Create comments table to match our Comment interface
CREATE TABLE IF NOT EXISTS public.comments_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.reviews_new(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL, -- Anonymous display name
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  parent_comment_id UUID REFERENCES public.comments_new(id),
  media_id TEXT, -- For image-specific comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  is_reported BOOLEAN DEFAULT false
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_review_id ON public.comments_new(review_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments_new(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments_new(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments_new(parent_comment_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments_new ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews_new
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create reviews" ON public.reviews_new
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own reviews" ON public.reviews_new
  FOR UPDATE USING (auth.uid() = author_id);

-- Create RLS policies for chat rooms
CREATE POLICY "Anyone can view active chat rooms" ON public.chat_rooms_new
  FOR SELECT USING (is_active = true);

-- Create RLS policies for chat messages
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages_new
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages_new
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create RLS policies for comments
CREATE POLICY "Anyone can view comments" ON public.comments_new
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments" ON public.comments_new
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments" ON public.comments_new
  FOR UPDATE USING (auth.uid() = author_id);

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for chat functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments_new;
