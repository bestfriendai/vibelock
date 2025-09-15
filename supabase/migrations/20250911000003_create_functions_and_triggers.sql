-- Database Functions and Triggers for LockerRoom App
-- This migration creates useful functions and triggers for app functionality

-- Function to update user's total_reviews_submitted count
CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment review count when a new review is created
    UPDATE users
    SET total_reviews_submitted = COALESCE(total_reviews_submitted, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement review count when a review is deleted
    UPDATE users
    SET total_reviews_submitted = GREATEST(COALESCE(total_reviews_submitted, 0) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user review count
CREATE TRIGGER trigger_update_user_review_count
  AFTER INSERT OR DELETE ON reviews_firebase
  FOR EACH ROW EXECUTE FUNCTION update_user_review_count();

-- Function to update chat room's last_activity and member_count
CREATE OR REPLACE FUNCTION update_chat_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update last activity when a new message is sent
    UPDATE chat_rooms_firebase
    SET last_activity = NOW(),
        last_message = jsonb_build_object(
          'content', NEW.content,
          'sender_name', NEW.sender_name,
          'timestamp', NEW.timestamp,
          'message_type', NEW.message_type
        ),
        updated_at = NOW()
    WHERE id = NEW.chat_room_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat room activity on new messages
CREATE TRIGGER trigger_update_chat_room_activity
  AFTER INSERT ON chat_messages_firebase
  FOR EACH ROW EXECUTE FUNCTION update_chat_room_activity();

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, body, type, data)
  VALUES (p_user_id, p_title, p_body, p_type, p_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby reviews based on location
CREATE OR REPLACE FUNCTION get_nearby_reviews(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  review_text TEXT,
  reviewed_person_name TEXT,
  category TEXT,
  like_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_miles DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.review_text,
    r.reviewed_person_name,
    r.category,
    r.like_count,
    r.created_at,
    -- Calculate distance using Haversine formula (approximate)
    (3959 * acos(
      cos(radians(user_lat)) *
      cos(radians((r.reviewed_person_location->>'latitude')::DOUBLE PRECISION)) *
      cos(radians((r.reviewed_person_location->>'longitude')::DOUBLE PRECISION) - radians(user_lng)) +
      sin(radians(user_lat)) *
      sin(radians((r.reviewed_person_location->>'latitude')::DOUBLE PRECISION))
    )) AS distance_miles
  FROM reviews_firebase r
  WHERE
    r.status = 'active'
    AND r.reviewed_person_location ? 'latitude'
    AND r.reviewed_person_location ? 'longitude'
    AND (3959 * acos(
      cos(radians(user_lat)) *
      cos(radians((r.reviewed_person_location->>'latitude')::DOUBLE PRECISION)) *
      cos(radians((r.reviewed_person_location->>'longitude')::DOUBLE PRECISION) - radians(user_lng)) +
      sin(radians(user_lat)) *
      sin(radians((r.reviewed_person_location->>'latitude')::DOUBLE PRECISION))
    )) <= radius_miles
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to search reviews by text
CREATE OR REPLACE FUNCTION search_reviews(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  review_text TEXT,
  reviewed_person_name TEXT,
  category TEXT,
  like_count INTEGER,
  created_at TIMESTAMPTZ,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.review_text,
    r.reviewed_person_name,
    r.category,
    r.like_count,
    r.created_at,
    -- Simple text relevance scoring
    (
      CASE WHEN r.reviewed_person_name ILIKE '%' || search_term || '%' THEN 3.0 ELSE 0.0 END +
      CASE WHEN r.review_text ILIKE '%' || search_term || '%' THEN 2.0 ELSE 0.0 END +
      CASE WHEN r.category ILIKE '%' || search_term || '%' THEN 1.0 ELSE 0.0 END
    ) AS relevance
  FROM reviews_firebase r
  WHERE
    r.status = 'active'
    AND (
      r.reviewed_person_name ILIKE '%' || search_term || '%' OR
      r.review_text ILIKE '%' || search_term || '%' OR
      r.category ILIKE '%' || search_term || '%'
    )
  ORDER BY relevance DESC, r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_reviews INTEGER,
  total_comments INTEGER,
  total_likes_received INTEGER,
  reputation_score INTEGER,
  join_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(u.total_reviews_submitted, 0) as total_reviews,
    (SELECT COUNT(*)::INTEGER FROM comments_firebase WHERE author_id = p_user_id) as total_comments,
    (SELECT COALESCE(SUM(like_count), 0)::INTEGER FROM reviews_firebase WHERE author_id = p_user_id) as total_likes_received,
    COALESCE(u.reputation_score, 0) as reputation_score,
    u.created_at as join_date
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get active chat rooms with recent activity
CREATE OR REPLACE FUNCTION get_active_chat_rooms(
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  member_count INTEGER,
  last_activity TIMESTAMPTZ,
  last_message JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.name,
    cr.description,
    cr.category,
    cr.member_count,
    cr.last_activity,
    cr.last_message,
    cr.created_at
  FROM chat_rooms_firebase cr
  WHERE
    cr.is_active = true
    AND (cr.is_deleted = false OR cr.is_deleted IS NULL)
  ORDER BY cr.last_activity DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
  days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old
  AND is_read = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Chat room membership management functions

-- Function to add user to chat room
CREATE OR REPLACE FUNCTION add_user_to_chat_room(
  p_room_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  room_exists BOOLEAN;
  already_member BOOLEAN;
BEGIN
  -- Check if room exists and is active
  SELECT EXISTS(
    SELECT 1 FROM chat_rooms_firebase
    WHERE id = p_room_id AND is_active = true
  ) INTO room_exists;

  IF NOT room_exists THEN
    RETURN FALSE;
  END IF;

  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1 FROM chat_members_firebase
    WHERE chat_room_id = p_room_id AND user_id = p_user_id
  ) INTO already_member;

  IF already_member THEN
    -- Reactivate if inactive
    UPDATE chat_members_firebase
    SET is_active = true, updated_at = NOW()
    WHERE chat_room_id = p_room_id AND user_id = p_user_id;
    RETURN TRUE;
  END IF;

  -- Add new member
  INSERT INTO chat_members_firebase (chat_room_id, user_id, role)
  VALUES (p_room_id, p_user_id, p_role);

  -- Update room member count
  UPDATE chat_rooms_firebase
  SET member_count = (
    SELECT COUNT(*) FROM chat_members_firebase
    WHERE chat_room_id = p_room_id AND is_active = true
  ),
  updated_at = NOW()
  WHERE id = p_room_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to remove user from chat room
CREATE OR REPLACE FUNCTION remove_user_from_chat_room(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Mark member as inactive
  UPDATE chat_members_firebase
  SET is_active = false, updated_at = NOW()
  WHERE chat_room_id = p_room_id AND user_id = p_user_id;

  -- Update room member count
  UPDATE chat_rooms_firebase
  SET member_count = (
    SELECT COUNT(*) FROM chat_members_firebase
    WHERE chat_room_id = p_room_id AND is_active = true
  ),
  updated_at = NOW()
  WHERE id = p_room_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is member of room
CREATE OR REPLACE FUNCTION is_user_room_member(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM chat_members_firebase
    WHERE chat_room_id = p_room_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user role in room
CREATE OR REPLACE FUNCTION get_user_room_role(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM chat_members_firebase
  WHERE chat_room_id = p_room_id
  AND user_id = p_user_id
  AND is_active = true;

  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql;

-- Follow/unfollow functions

-- Function to follow user
CREATE OR REPLACE FUNCTION follow_user(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_blocked BOOLEAN;
BEGIN
  -- Prevent self-following
  IF p_follower_id = p_following_id THEN
    RETURN FALSE;
  END IF;

  -- Check if either user has blocked the other
  SELECT EXISTS(
    SELECT 1 FROM blocks
    WHERE (blocker_id = p_follower_id AND blocked_id = p_following_id)
    OR (blocker_id = p_following_id AND blocked_id = p_follower_id)
  ) INTO is_blocked;

  IF is_blocked THEN
    RETURN FALSE;
  END IF;

  -- Insert follow relationship (ignore if already exists)
  INSERT INTO follows (follower_id, following_id)
  VALUES (p_follower_id, p_following_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- Update follower counts
  UPDATE users
  SET following_count = (
    SELECT COUNT(*) FROM follows WHERE follower_id = p_follower_id
  ),
  updated_at = NOW()
  WHERE id = p_follower_id;

  UPDATE users
  SET follower_count = (
    SELECT COUNT(*) FROM follows WHERE following_id = p_following_id
  ),
  updated_at = NOW()
  WHERE id = p_following_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to unfollow user
CREATE OR REPLACE FUNCTION unfollow_user(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove follow relationship
  DELETE FROM follows
  WHERE follower_id = p_follower_id AND following_id = p_following_id;

  -- Update follower counts
  UPDATE users
  SET following_count = (
    SELECT COUNT(*) FROM follows WHERE follower_id = p_follower_id
  ),
  updated_at = NOW()
  WHERE id = p_follower_id;

  UPDATE users
  SET follower_count = (
    SELECT COUNT(*) FROM follows WHERE following_id = p_following_id
  ),
  updated_at = NOW()
  WHERE id = p_following_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get follower/following counts
CREATE OR REPLACE FUNCTION get_follow_counts(
  p_user_id UUID
)
RETURNS TABLE (
  follower_count INTEGER,
  following_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM follows WHERE following_id = p_user_id) as follower_count,
    (SELECT COUNT(*)::INTEGER FROM follows WHERE follower_id = p_user_id) as following_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = p_follower_id AND following_id = p_following_id
  );
END;
$$ LANGUAGE plpgsql;

-- Review interaction functions

-- Function to like/unlike review
CREATE OR REPLACE FUNCTION toggle_review_like(
  p_review_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  already_liked BOOLEAN;
  review_author_id UUID;
BEGIN
  -- Get review author and check if already liked
  SELECT EXISTS(
    SELECT 1 FROM review_likes
    WHERE review_id = p_review_id AND user_id = p_user_id
  ) INTO already_liked;

  -- Get review author ID
  SELECT author_id INTO review_author_id
  FROM reviews_firebase
  WHERE id = p_review_id;

  -- Check if user is blocked by review author or vice versa
  IF EXISTS(
    SELECT 1 FROM blocks
    WHERE (blocker_id = review_author_id AND blocked_id = p_user_id)
    OR (blocker_id = p_user_id AND blocked_id = review_author_id)
  ) THEN
    RETURN FALSE;
  END IF;

  IF already_liked THEN
    -- Unlike: remove like
    DELETE FROM review_likes
    WHERE review_id = p_review_id AND user_id = p_user_id;
  ELSE
    -- Like: add like
    INSERT INTO review_likes (review_id, user_id)
    VALUES (p_review_id, p_user_id);
  END IF;

  -- Update review like count
  UPDATE reviews_firebase
  SET like_count = (
    SELECT COUNT(*) FROM review_likes WHERE review_id = p_review_id
  ),
  updated_at = NOW()
  WHERE id = p_review_id;

  RETURN NOT already_liked; -- Return true if liked, false if unliked
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has liked a review
CREATE OR REPLACE FUNCTION has_user_liked_review(
  p_review_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM review_likes
    WHERE review_id = p_review_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's liked reviews
CREATE OR REPLACE FUNCTION get_user_liked_reviews(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  review_text TEXT,
  reviewed_person_name TEXT,
  category TEXT,
  like_count INTEGER,
  created_at TIMESTAMPTZ,
  liked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.review_text,
    r.reviewed_person_name,
    r.category,
    r.like_count,
    r.created_at,
    rl.created_at as liked_at
  FROM review_likes rl
  JOIN reviews_firebase r ON r.id = rl.review_id
  WHERE rl.user_id = p_user_id
  AND r.status = 'active'
  ORDER BY rl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- User blocking functions

-- Function to block user
CREATE OR REPLACE FUNCTION block_user(
  p_blocker_id UUID,
  p_blocked_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Prevent self-blocking
  IF p_blocker_id = p_blocked_id THEN
    RETURN FALSE;
  END IF;

  -- Insert block relationship (ignore if already exists)
  INSERT INTO blocks (blocker_id, blocked_id, reason)
  VALUES (p_blocker_id, p_blocked_id, p_reason)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Remove any follow relationships
  DELETE FROM follows
  WHERE (follower_id = p_blocker_id AND following_id = p_blocked_id)
  OR (follower_id = p_blocked_id AND following_id = p_blocker_id);

  -- Update follow counts
  UPDATE users
  SET following_count = (
    SELECT COUNT(*) FROM follows WHERE follower_id = p_blocker_id
  ),
  follower_count = (
    SELECT COUNT(*) FROM follows WHERE following_id = p_blocker_id
  ),
  updated_at = NOW()
  WHERE id = p_blocker_id;

  UPDATE users
  SET following_count = (
    SELECT COUNT(*) FROM follows WHERE follower_id = p_blocked_id
  ),
  follower_count = (
    SELECT COUNT(*) FROM follows WHERE following_id = p_blocked_id
  ),
  updated_at = NOW()
  WHERE id = p_blocked_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to unblock user
CREATE OR REPLACE FUNCTION unblock_user(
  p_blocker_id UUID,
  p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove block relationship
  DELETE FROM blocks
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
  p_blocker_id UUID,
  p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql;

-- Message read tracking functions

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_room_id UUID,
  p_user_id UUID,
  p_last_message_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update read status
  INSERT INTO message_reads (room_id, user_id, last_read_at, last_message_id)
  VALUES (p_room_id, p_user_id, NOW(), p_last_message_id)
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET
    last_read_at = NOW(),
    last_message_id = COALESCE(EXCLUDED.last_message_id, message_reads.last_message_id),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  last_read_at TIMESTAMPTZ;
  unread_count INTEGER;
BEGIN
  -- Get last read timestamp
  SELECT mr.last_read_at INTO last_read_at
  FROM message_reads mr
  WHERE mr.room_id = p_room_id AND mr.user_id = p_user_id;

  -- If no read record, count all messages
  IF last_read_at IS NULL THEN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM chat_messages_firebase
    WHERE chat_room_id = p_room_id
    AND is_deleted = false;
  ELSE
    -- Count messages after last read timestamp
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM chat_messages_firebase
    WHERE chat_room_id = p_room_id
    AND timestamp > last_read_at
    AND is_deleted = false;
  END IF;

  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get all unread counts for user
CREATE OR REPLACE FUNCTION get_user_unread_counts(
  p_user_id UUID
)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id as room_id,
    cr.name as room_name,
    get_unread_message_count(cr.id, p_user_id) as unread_count
  FROM chat_rooms_firebase cr
  JOIN chat_members_firebase cm ON cm.chat_room_id = cr.id
  WHERE cm.user_id = p_user_id
  AND cm.is_active = true
  AND cr.is_active = true
  ORDER BY cr.last_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- College search functions

-- Function to search colleges
CREATE OR REPLACE FUNCTION search_colleges(
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  city TEXT,
  state TEXT,
  institution_type TEXT,
  student_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.city,
    c.state,
    c.institution_type,
    c.student_count
  FROM colleges c
  WHERE c.is_active = true
  AND (
    c.name ILIKE '%' || p_search_term || '%' OR
    c.city ILIKE '%' || p_search_term || '%' OR
    c.state ILIKE '%' || p_search_term || '%' OR
    EXISTS (
      SELECT 1 FROM unnest(c.alias) as alias_name
      WHERE alias_name ILIKE '%' || p_search_term || '%'
    )
  )
  ORDER BY
    CASE WHEN c.name ILIKE p_search_term || '%' THEN 1 ELSE 2 END,
    c.student_count DESC NULLS LAST,
    c.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic count updates

-- Trigger to update follow counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update follower count
    UPDATE users
    SET follower_count = (
      SELECT COUNT(*) FROM follows WHERE following_id = NEW.following_id
    ),
    updated_at = NOW()
    WHERE id = NEW.following_id;

    -- Update following count
    UPDATE users
    SET following_count = (
      SELECT COUNT(*) FROM follows WHERE follower_id = NEW.follower_id
    ),
    updated_at = NOW()
    WHERE id = NEW.follower_id;

    -- Create notification
    PERFORM create_notification(
      NEW.following_id,
      'New Follower',
      (SELECT username FROM users WHERE id = NEW.follower_id) || ' started following you',
      'follow',
      jsonb_build_object('follower_id', NEW.follower_id)
    );

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update follower count
    UPDATE users
    SET follower_count = (
      SELECT COUNT(*) FROM follows WHERE following_id = OLD.following_id
    ),
    updated_at = NOW()
    WHERE id = OLD.following_id;

    -- Update following count
    UPDATE users
    SET following_count = (
      SELECT COUNT(*) FROM follows WHERE follower_id = OLD.follower_id
    ),
    updated_at = NOW()
    WHERE id = OLD.follower_id;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Trigger to update review like counts
CREATE OR REPLACE FUNCTION update_review_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update review like count
    UPDATE reviews_firebase
    SET like_count = (
      SELECT COUNT(*) FROM review_likes WHERE review_id = NEW.review_id
    ),
    updated_at = NOW()
    WHERE id = NEW.review_id;

    -- Create notification for review author
    PERFORM create_notification(
      (SELECT author_id FROM reviews_firebase WHERE id = NEW.review_id),
      'Review Liked',
      (SELECT username FROM users WHERE id = NEW.user_id) || ' liked your review',
      'review_like',
      jsonb_build_object('review_id', NEW.review_id, 'liker_id', NEW.user_id)
    );

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update review like count
    UPDATE reviews_firebase
    SET like_count = (
      SELECT COUNT(*) FROM review_likes WHERE review_id = OLD.review_id
    ),
    updated_at = NOW()
    WHERE id = OLD.review_id;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_like_counts
  AFTER INSERT OR DELETE ON review_likes
  FOR EACH ROW EXECUTE FUNCTION update_review_like_counts();

-- Trigger to update chat room member counts
CREATE OR REPLACE FUNCTION update_chat_member_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE chat_rooms_firebase
    SET member_count = (
      SELECT COUNT(*) FROM chat_members_firebase
      WHERE chat_room_id = NEW.chat_room_id AND is_active = true
    ),
    updated_at = NOW()
    WHERE id = NEW.chat_room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_rooms_firebase
    SET member_count = (
      SELECT COUNT(*) FROM chat_members_firebase
      WHERE chat_room_id = OLD.chat_room_id AND is_active = true
    ),
    updated_at = NOW()
    WHERE id = OLD.chat_room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_member_counts
  AFTER INSERT OR UPDATE OR DELETE ON chat_members_firebase
  FOR EACH ROW EXECUTE FUNCTION update_chat_member_counts();

-- Analytics and utility functions

-- Function to get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
  p_user_id UUID
)
RETURNS TABLE (
  reviews_count INTEGER,
  comments_count INTEGER,
  likes_given INTEGER,
  likes_received INTEGER,
  follower_count INTEGER,
  following_count INTEGER,
  chat_messages_count INTEGER,
  engagement_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM reviews_firebase WHERE author_id = p_user_id) as reviews_count,
    (SELECT COUNT(*)::INTEGER FROM comments_firebase WHERE author_id = p_user_id) as comments_count,
    (SELECT COUNT(*)::INTEGER FROM review_likes WHERE user_id = p_user_id) as likes_given,
    (SELECT COALESCE(SUM(like_count), 0)::INTEGER FROM reviews_firebase WHERE author_id = p_user_id) as likes_received,
    (SELECT COUNT(*)::INTEGER FROM follows WHERE following_id = p_user_id) as follower_count,
    (SELECT COUNT(*)::INTEGER FROM follows WHERE follower_id = p_user_id) as following_count,
    (SELECT COUNT(*)::INTEGER FROM chat_messages_firebase WHERE sender_id = p_user_id) as chat_messages_count,
    -- Simple engagement score calculation
    (
      (SELECT COUNT(*) FROM reviews_firebase WHERE author_id = p_user_id) * 5 +
      (SELECT COUNT(*) FROM comments_firebase WHERE author_id = p_user_id) * 2 +
      (SELECT COALESCE(SUM(like_count), 0) FROM reviews_firebase WHERE author_id = p_user_id) * 1 +
      (SELECT COUNT(*) FROM follows WHERE following_id = p_user_id) * 1
    )::NUMERIC as engagement_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get content moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS TABLE (
  total_reports INTEGER,
  pending_reports INTEGER,
  flagged_reviews INTEGER,
  blocked_users INTEGER,
  active_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM reports) as total_reports,
    (SELECT COUNT(*)::INTEGER FROM reports WHERE status = 'pending') as pending_reports,
    (SELECT COUNT(*)::INTEGER FROM reviews_firebase WHERE status = 'flagged') as flagged_reviews,
    (SELECT COUNT(*)::INTEGER FROM users WHERE is_blocked = true) as blocked_users,
    (SELECT COUNT(*)::INTEGER FROM users WHERE last_active > NOW() - INTERVAL '30 days') as active_users;
END;
$$ LANGUAGE plpgsql;