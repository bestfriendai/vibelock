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