-- Row Level Security Policies for LockerRoom App
-- This migration creates comprehensive RLS policies for all tables

-- Users table policies
-- Users can read their own profile and public profiles of others
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Reviews policies
-- Anyone can read active reviews
CREATE POLICY "Anyone can view active reviews" ON reviews_firebase
  FOR SELECT USING (status = 'active' OR status IS NULL);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" ON reviews_firebase
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews_firebase
  FOR UPDATE USING (auth.uid() = author_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON reviews_firebase
  FOR DELETE USING (auth.uid() = author_id);

-- Comments policies
-- Anyone can read non-deleted comments
CREATE POLICY "Anyone can view active comments" ON comments_firebase
  FOR SELECT USING (is_deleted = false OR is_deleted IS NULL);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON comments_firebase
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments_firebase
  FOR UPDATE USING (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments_firebase
  FOR DELETE USING (auth.uid() = author_id);

-- Chat rooms policies
-- Anyone can view active chat rooms
CREATE POLICY "Anyone can view active chat rooms" ON chat_rooms_firebase
  FOR SELECT USING (is_active = true AND (is_deleted = false OR is_deleted IS NULL));

-- Authenticated users can create chat rooms
CREATE POLICY "Authenticated users can create chat rooms" ON chat_rooms_firebase
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Room creators can update their rooms
CREATE POLICY "Room creators can update own rooms" ON chat_rooms_firebase
  FOR UPDATE USING (auth.uid() = created_by);

-- Room creators can delete their rooms
CREATE POLICY "Room creators can delete own rooms" ON chat_rooms_firebase
  FOR DELETE USING (auth.uid() = created_by);

-- Chat messages policies
-- Users can view messages in active rooms
CREATE POLICY "Users can view messages in active rooms" ON chat_messages_firebase
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms_firebase
      WHERE id = chat_room_id
      AND is_active = true
      AND (is_deleted = false OR is_deleted IS NULL)
    )
  );

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages" ON chat_messages_firebase
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON chat_messages_firebase
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON chat_messages_firebase
  FOR DELETE USING (auth.uid() = sender_id);

-- Notifications policies
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- System can create notifications for users
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Push tokens policies
-- Users can only see their own push tokens
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own push tokens
CREATE POLICY "Users can create own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own push tokens
CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Reports policies
-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = reporter_id);
