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

-- Chat members policies
-- Users can view members of rooms they belong to or public rooms
CREATE POLICY "Users can view chat members" ON chat_members_firebase
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM chat_members_firebase cm2
      WHERE cm2.chat_room_id = chat_members_firebase.chat_room_id
      AND cm2.user_id = auth.uid()
      AND cm2.is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM chat_rooms_firebase cr
      WHERE cr.id = chat_members_firebase.chat_room_id
      AND cr.is_private = false
    )
  );

-- Users can join public rooms
CREATE POLICY "Users can join chat rooms" ON chat_members_firebase
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      EXISTS (
        SELECT 1 FROM chat_rooms_firebase cr
        WHERE cr.id = chat_room_id
        AND cr.is_private = false
      ) OR
      EXISTS (
        SELECT 1 FROM chat_members_firebase cm
        WHERE cm.chat_room_id = chat_members_firebase.chat_room_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
      )
    )
  );

-- Room admins and moderators can manage membership, users can leave
CREATE POLICY "Manage chat membership" ON chat_members_firebase
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM chat_members_firebase cm
      WHERE cm.chat_room_id = chat_members_firebase.chat_room_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- Room admins and moderators can remove members, users can leave
CREATE POLICY "Remove chat members" ON chat_members_firebase
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM chat_members_firebase cm
      WHERE cm.chat_room_id = chat_members_firebase.chat_room_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- Message reads policies
-- Users can only view and manage their own read status
CREATE POLICY "Users can view own message reads" ON message_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own message reads" ON message_reads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chat_members_firebase cm
      WHERE cm.chat_room_id = room_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Users can update own message reads" ON message_reads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own message reads" ON message_reads
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
-- Users can view all follow relationships (public social graph)
CREATE POLICY "Anyone can view follows" ON follows
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = follows.follower_id AND b.blocked_id = auth.uid())
      OR (b.blocker_id = follows.following_id AND b.blocked_id = auth.uid())
    )
  );

-- Users can follow others (but not blocked users)
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id AND
    follower_id != following_id AND
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = following_id AND b.blocked_id = follower_id)
      OR (b.blocker_id = follower_id AND b.blocked_id = following_id)
    )
  );

-- Users can only delete their own follow relationships
CREATE POLICY "Users can unfollow others" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Blocks policies
-- Users can only view their own blocks (privacy)
CREATE POLICY "Users can view own blocks" ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others" ON blocks
  FOR INSERT WITH CHECK (
    auth.uid() = blocker_id AND
    blocker_id != blocked_id
  );

-- Users can only delete their own blocks (unblock)
CREATE POLICY "Users can unblock others" ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Review likes policies
-- Users can view all likes (public engagement data)
CREATE POLICY "Anyone can view review likes" ON review_likes
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = review_likes.user_id AND b.blocked_id = auth.uid())
      OR (b.blocker_id = auth.uid() AND b.blocked_id = review_likes.user_id)
    )
  );

-- Users can like reviews (but not from blocked users)
CREATE POLICY "Users can like reviews" ON review_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM blocks b
      JOIN reviews_firebase r ON r.id = review_id
      WHERE (b.blocker_id = r.author_id AND b.blocked_id = user_id)
      OR (b.blocker_id = user_id AND b.blocked_id = r.author_id)
    )
  );

-- Users can only delete their own likes
CREATE POLICY "Users can unlike reviews" ON review_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Colleges policies
-- Anyone can view college data (public information)
CREATE POLICY "Anyone can view colleges" ON colleges
  FOR SELECT USING (is_active = true);

-- Authenticated users can suggest college updates (moderated)
CREATE POLICY "Authenticated users can suggest colleges" ON colleges
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only system/admin can update colleges (requires admin role if implemented)
CREATE POLICY "System can update colleges" ON colleges
  FOR UPDATE USING (false); -- Disabled for now, enable when admin system is ready

-- Enhanced policies with blocking awareness
-- Update existing policies to respect blocking relationships

-- Update users view policy to hide blocked users
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view non-blocked profiles" ON users
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = users.id AND b.blocked_id = auth.uid())
      OR (b.blocker_id = auth.uid() AND b.blocked_id = users.id)
    )
  );

-- Update reviews view policy to hide content from blocked users
DROP POLICY IF EXISTS "Anyone can view active reviews" ON reviews_firebase;
CREATE POLICY "Users can view non-blocked reviews" ON reviews_firebase
  FOR SELECT USING (
    (status = 'active' OR status IS NULL) AND
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = author_id AND b.blocked_id = auth.uid())
      OR (b.blocker_id = auth.uid() AND b.blocked_id = author_id)
    )
  );

-- Update comments view policy to hide content from blocked users
DROP POLICY IF EXISTS "Anyone can view active comments" ON comments_firebase;
CREATE POLICY "Users can view non-blocked comments" ON comments_firebase
  FOR SELECT USING (
    (is_deleted = false OR is_deleted IS NULL) AND
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = author_id AND b.blocked_id = auth.uid())
      OR (b.blocker_id = auth.uid() AND b.blocked_id = author_id)
    )
  );

-- Update chat messages policy to hide messages from blocked users
DROP POLICY IF EXISTS "Users can view messages in active rooms" ON chat_messages_firebase;
CREATE POLICY "Users can view non-blocked messages" ON chat_messages_firebase
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms_firebase
      WHERE id = chat_room_id
      AND is_active = true
      AND (is_deleted = false OR is_deleted IS NULL)
    ) AND
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = sender_id AND b.blocked_id = auth.uid())
      OR (b.blocker_id = auth.uid() AND b.blocked_id = sender_id)
    ) AND
    EXISTS (
      SELECT 1 FROM chat_members_firebase cm
      WHERE cm.chat_room_id = chat_messages_firebase.chat_room_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

-- Enhanced chat room policies with member restrictions
DROP POLICY IF EXISTS "Anyone can view active chat rooms" ON chat_rooms_firebase;
CREATE POLICY "Members can view chat rooms" ON chat_rooms_firebase
  FOR SELECT USING (
    is_active = true AND
    (is_deleted = false OR is_deleted IS NULL) AND
    (
      is_private = false OR
      EXISTS (
        SELECT 1 FROM chat_members_firebase cm
        WHERE cm.chat_room_id = id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
      )
    ) AND
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = created_by AND b.blocked_id = auth.uid())
      OR (b.blocker_id = auth.uid() AND b.blocked_id = created_by)
    )
  );

-- Admin and moderation policies (for future implementation)
-- These policies can be enabled when admin roles are implemented

-- CREATE POLICY "Admins can manage all content" ON reviews_firebase
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM users u
--       WHERE u.id = auth.uid()
--       AND u.role = 'admin'
--     )
--   );

-- CREATE POLICY "Moderators can manage reported content" ON comments_firebase
--   FOR UPDATE USING (
--     auth.uid() = author_id OR
--     EXISTS (
--       SELECT 1 FROM users u
--       WHERE u.id = auth.uid()
--       AND u.role IN ('admin', 'moderator')
--     )
--   );
