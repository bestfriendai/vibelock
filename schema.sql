

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_typing_indicators"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM typing_indicators WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_typing_indicators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_typing_indicators"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE chat_rooms_firebase
  SET typing_users = '[]'::jsonb
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$;


ALTER FUNCTION "public"."cleanup_typing_indicators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_comment_count"("review_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  RETURN (SELECT COUNT(*) FROM comments WHERE review_id = $1 AND moderation_status = 'approved');
END;
$_$;


ALTER FUNCTION "public"."get_comment_count"("review_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_user_by_clerk_id"("p_clerk_user_id" "text") RETURNS TABLE("id" "uuid", "clerk_user_id" "text", "username" "text", "email" "text", "subscription_tier" "text", "verification_level" "text", "reputation_score" integer, "is_banned" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Try to find existing user
    SELECT * INTO user_record FROM users WHERE users.clerk_user_id = p_clerk_user_id;
    
    -- If user doesn't exist, create them
    IF user_record IS NULL THEN
        PERFORM sync_user_from_clerk(p_clerk_user_id);
        SELECT * INTO user_record FROM users WHERE users.clerk_user_id = p_clerk_user_id;
    END IF;
    
    -- Return user data
    RETURN QUERY
    SELECT 
        user_record.id,
        user_record.clerk_user_id,
        user_record.username,
        user_record.email,
        user_record.subscription_tier,
        user_record.verification_level,
        user_record.reputation_score,
        user_record.is_banned;
END;
$$;


ALTER FUNCTION "public"."get_or_create_user_by_clerk_id"("p_clerk_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trending_names"("result_limit" integer DEFAULT 10) RETURNS TABLE("name" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    reviewed_person_name as name,
    COUNT(*) as count
  FROM reviews_firebase
  WHERE status = 'approved' 
    AND reviewed_person_name IS NOT NULL 
    AND reviewed_person_name != ''
  GROUP BY reviewed_person_name
  ORDER BY count DESC, reviewed_person_name ASC
  LIMIT result_limit;
END;
$$;


ALTER FUNCTION "public"."get_trending_names"("result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription_status"("p_user_id" "uuid") RETURNS TABLE("tier" "text", "is_active" boolean, "expires_at" timestamp with time zone, "days_remaining" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.subscription_tier, 'free') as tier,
    CASE 
      WHEN u.subscription_tier = 'free' THEN false
      WHEN u.subscription_expires_at IS NULL THEN true
      WHEN u.subscription_expires_at > NOW() THEN true
      ELSE false
    END as is_active,
    u.subscription_expires_at as expires_at,
    CASE 
      WHEN u.subscription_expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(days FROM u.subscription_expires_at - NOW())::INTEGER)
    END as days_remaining
  FROM users u
  WHERE u.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_subscription_status"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_subscription_status"("p_user_id" "uuid") IS 'Get comprehensive subscription status for a user';



CREATE OR REPLACE FUNCTION "public"."increment_chat_message_likes"("message_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user from auth context
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Insert like if not exists, otherwise remove it (toggle behavior)
    INSERT INTO chat_message_likes (message_id, user_id)
    VALUES (message_id, current_user_id)
    ON CONFLICT (message_id, user_id) 
    DO NOTHING;
    
    -- Update the likes count on the message
    UPDATE chat_messages 
    SET likes = (
        SELECT COUNT(*) 
        FROM chat_message_likes 
        WHERE chat_message_likes.message_id = chat_messages.id
    )
    WHERE id = message_id;
END;
$$;


ALTER FUNCTION "public"."increment_chat_message_likes"("message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_report_count"("review_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE reviews 
    SET report_count = report_count + 1 
    WHERE id = review_id;
END;
$$;


ALTER FUNCTION "public"."increment_report_count"("review_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_vote"("review_id" "uuid", "vote_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF vote_type = 'upvote' THEN
        UPDATE reviews SET upvotes = upvotes + 1 WHERE id = review_id;
    ELSIF vote_type = 'downvote' THEN
        UPDATE reviews SET downvotes = downvotes + 1 WHERE id = review_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."increment_vote"("review_id" "uuid", "vote_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_subscription_tier" "text", "p_event_data" "jsonb" DEFAULT '{}'::"jsonb", "p_revenuecat_event_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    user_id,
    event_type,
    subscription_tier,
    event_data,
    revenuecat_event_id
  ) VALUES (
    p_user_id,
    p_event_type,
    p_subscription_tier,
    p_event_data,
    p_revenuecat_event_id
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;


ALTER FUNCTION "public"."log_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_subscription_tier" "text", "p_event_data" "jsonb", "p_revenuecat_event_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_subscription_tier" "text", "p_event_data" "jsonb", "p_revenuecat_event_id" "text") IS 'Log a subscription event with automatic deduplication';



CREATE OR REPLACE FUNCTION "public"."notify_chat_message_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only send notification if category is not null or empty
    IF NEW.category IS NOT NULL AND NEW.category != '' THEN
        PERFORM pg_notify(
            'chat_' || NEW.category,
            json_build_object(
                'type', TG_OP,
                'record', row_to_json(NEW),
                'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
            )::text
        );
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


ALTER FUNCTION "public"."notify_chat_message_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_typing_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM pg_notify(
        'typing_' || COALESCE(NEW.category, OLD.category),
        json_build_object(
            'type', TG_OP,
            'record', row_to_json(NEW),
            'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."notify_typing_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_typing_status"("p_category" "text", "p_is_typing" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF p_is_typing THEN
        INSERT INTO typing_indicators (user_id, category, is_typing, expires_at)
        VALUES (current_user_id, p_category, TRUE, NOW() + INTERVAL '10 seconds')
        ON CONFLICT (user_id, category) 
        DO UPDATE SET 
            is_typing = TRUE,
            expires_at = NOW() + INTERVAL '10 seconds',
            created_at = NOW();
    ELSE
        DELETE FROM typing_indicators 
        WHERE user_id = current_user_id AND category = p_category;
    END IF;
END;
$$;


ALTER FUNCTION "public"."set_typing_status"("p_category" "text", "p_is_typing" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."should_show_ads"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_status RECORD;
BEGIN
  SELECT * INTO user_status FROM get_user_subscription_status(p_user_id);
  
  -- Show ads if user is not premium/pro or subscription is expired
  RETURN NOT (user_status.is_active AND user_status.tier IN ('premium', 'pro'));
END;
$$;


ALTER FUNCTION "public"."should_show_ads"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."should_show_ads"("p_user_id" "uuid") IS 'Determine if ads should be shown to a user based on subscription status';



CREATE OR REPLACE FUNCTION "public"."sync_user_from_clerk"("p_clerk_user_id" "text", "p_email" "text" DEFAULT NULL::"text", "p_username" "text" DEFAULT NULL::"text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_id UUID;
    full_username TEXT;
BEGIN
    -- Generate username if not provided
    IF p_username IS NULL THEN
        full_username := COALESCE(p_first_name, '') || COALESCE(p_last_name, '');
        IF full_username = '' THEN
            full_username := 'User' || substring(p_clerk_user_id from 1 for 8);
        END IF;
    ELSE
        full_username := p_username;
    END IF;
    
    -- Insert or update user
    INSERT INTO users (
        clerk_user_id,
        email,
        username,
        subscription_tier,
        verification_level,
        reputation_score,
        total_reviews_submitted,
        is_banned,
        last_active
    )
    VALUES (
        p_clerk_user_id,
        p_email,
        full_username,
        'basic',
        'basic',
        100,
        0,
        FALSE,
        NOW()
    )
    ON CONFLICT (clerk_user_id) 
    DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        username = COALESCE(EXCLUDED.username, users.username),
        last_active = NOW(),
        updated_at = NOW()
    RETURNING id INTO user_id;
    
    RETURN user_id;
END;
$$;


ALTER FUNCTION "public"."sync_user_from_clerk"("p_clerk_user_id" "text", "p_email" "text", "p_username" "text", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_message_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_message_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_message_status_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set delivered_at when message is first created
  IF TG_OP = 'INSERT' THEN
    NEW.delivered_at = NOW();
    NEW.status = 'delivered';
  END IF;
  
  -- Set read_at when is_read changes from false to true
  IF TG_OP = 'UPDATE' AND OLD.is_read = false AND NEW.is_read = true THEN
    NEW.read_at = NOW();
    NEW.status = 'read';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_message_status_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_review_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews 
    SET comment_count = COALESCE(comment_count, 0) + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews 
    SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_review_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.subject_first_name, '') || ' ' ||
    COALESCE(NEW.subject_location, '') || ' ' ||
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.content, '')
  );
  
  -- Calculate content length for masonry layout
  NEW.content_length := CASE 
    WHEN LENGTH(NEW.content) < 100 THEN 'short'
    WHEN LENGTH(NEW.content) < 300 THEN 'medium'
    ELSE 'long'
  END;
  
  -- Calculate estimated card height for masonry
  NEW.card_height := 120 + -- base height
    (LENGTH(NEW.content) * 0.5)::INTEGER + -- content height
    CASE WHEN NEW.has_evidence THEN 80 ELSE 0 END; -- evidence height
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_activity_on_subscription_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE users 
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_activity_on_subscription_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_clerk_session_id" "text", "p_device_info" "jsonb" DEFAULT NULL::"jsonb", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO user_sessions (
        user_id, 
        clerk_session_id, 
        device_info, 
        ip_address, 
        user_agent
    )
    VALUES (
        p_user_id, 
        p_clerk_session_id, 
        p_device_info, 
        p_ip_address, 
        p_user_agent
    )
    ON CONFLICT (clerk_session_id) 
    DO UPDATE SET 
        last_activity = NOW(),
        is_active = TRUE,
        expires_at = NOW() + INTERVAL '30 days'
    RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$;


ALTER FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_clerk_session_id" "text", "p_device_info" "jsonb", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vote_on_comment"("comment_id" "uuid", "vote_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF vote_type = 'upvote' THEN
        UPDATE comments SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = comment_id;
    ELSIF vote_type = 'downvote' THEN
        UPDATE comments SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = comment_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."vote_on_comment"("comment_id" "uuid", "vote_type" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_members_firebase" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_room_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "permissions" "jsonb" DEFAULT '{"can_send_media": true, "can_send_messages": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_members_firebase_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'moderator'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."chat_members_firebase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_message_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_message_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid",
    "category" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" DEFAULT 'text'::"text",
    "review_id" "uuid",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "likes" integer DEFAULT 0,
    "reply_to_id" "uuid",
    "media_url" "text",
    "media_type" "text",
    "media_duration" integer,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "location_name" "text",
    "location_address" "text",
    CONSTRAINT "chat_messages_category_check" CHECK (("category" = ANY (ARRAY['Men'::"text", 'Women'::"text", 'LGBT'::"text"]))),
    CONSTRAINT "chat_messages_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'voice'::"text"]))),
    CONSTRAINT "chat_messages_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'review_share'::"text", 'alert'::"text", 'system'::"text"]))),
    CONSTRAINT "check_media_type" CHECK ((("media_type" IS NULL) OR ("media_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'audio'::"text", 'file'::"text"])))),
    CONSTRAINT "check_non_negative_likes" CHECK (("likes" >= 0)),
    CONSTRAINT "check_valid_latitude" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "check_valid_longitude" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric))))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages_firebase" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_room_id" "uuid",
    "sender_id" "uuid",
    "sender_name" "text" NOT NULL,
    "sender_avatar" "text",
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "is_read" boolean DEFAULT false,
    "reply_to" "uuid",
    "is_deleted" boolean DEFAULT false,
    "reactions" "jsonb" DEFAULT '[]'::"jsonb",
    "read_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "status" "text" DEFAULT 'sent'::"text",
    CONSTRAINT "chat_messages_firebase_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'system'::"text", 'join'::"text", 'leave'::"text"]))),
    CONSTRAINT "chat_messages_firebase_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."chat_messages_firebase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_room_subscriptions" (
    "user_id" "uuid" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "is_subscribed" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_room_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "member_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "location_name" "text",
    "is_location_based" boolean DEFAULT false,
    "radius_miles" integer DEFAULT 5,
    CONSTRAINT "chat_rooms_category_check" CHECK (("category" = ANY (ARRAY['Men'::"text", 'Women'::"text", 'LGBT'::"text"])))
);


ALTER TABLE "public"."chat_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_rooms_firebase" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" DEFAULT 'all'::"text",
    "member_count" integer DEFAULT 0,
    "online_count" integer DEFAULT 0,
    "last_message" "jsonb",
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "location" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_private" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "typing_users" "jsonb" DEFAULT '[]'::"jsonb",
    "unread_count" integer DEFAULT 0,
    CONSTRAINT "chat_rooms_firebase_category_check" CHECK (("category" = ANY (ARRAY['all'::"text", 'men'::"text", 'women'::"text", 'lgbtq+'::"text"]))),
    CONSTRAINT "chat_rooms_firebase_type_check" CHECK (("type" = ANY (ARRAY['local'::"text", 'global'::"text", 'topic'::"text"])))
);


ALTER TABLE "public"."chat_rooms_firebase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colleges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "coordinates" "jsonb",
    "institution_type" "text",
    "scorecard_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "alias" "text",
    CONSTRAINT "colleges_institution_type_check" CHECK (("institution_type" = ANY (ARRAY['university'::"text", 'college'::"text", 'community_college'::"text", 'trade_school'::"text"])))
);


ALTER TABLE "public"."colleges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid",
    "user_id" "uuid",
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "is_edited" boolean DEFAULT false,
    "moderation_status" "text" DEFAULT 'approved'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comments_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'flagged'::"text"])))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments_firebase" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid",
    "author_id" "uuid",
    "author_name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "like_count" integer DEFAULT 0,
    "dislike_count" integer DEFAULT 0,
    "parent_comment_id" "uuid",
    "media_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "is_reported" boolean DEFAULT false
);


ALTER TABLE "public"."comments_firebase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid",
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer,
    "thumbnail_path" "text",
    "description" "text",
    "is_verified" boolean DEFAULT false,
    "moderation_status" "text" DEFAULT 'pending'::"text",
    "sightengine_analysis" "jsonb",
    "metadata_stripped" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "evidence_file_type_check" CHECK (("file_type" = ANY (ARRAY['image'::"text", 'screenshot'::"text", 'document'::"text"]))),
    CONSTRAINT "evidence_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."evidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moderation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_type" "text" NOT NULL,
    "content_preview" "text",
    "moderation_result" "jsonb" NOT NULL,
    "context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "moderation_logs_content_type_check" CHECK (("content_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."moderation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb",
    "is_read" boolean DEFAULT false,
    "is_sent" boolean DEFAULT false,
    "expo_push_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['new_review'::"text", 'new_comment'::"text", 'new_message'::"text", 'review_approved'::"text", 'review_rejected'::"text", 'safety_alert'::"text", 'chat_message'::"text", 'review_like'::"text", 'review_comment'::"text", 'system_alert'::"text", 'moderation'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orphaned_reviews_backup" (
    "id" "uuid",
    "author_id" "uuid",
    "reviewer_anonymous_id" "text",
    "reviewed_person_name" "text",
    "reviewed_person_location" "jsonb",
    "category" "text",
    "profile_photo" "text",
    "green_flags" "text"[],
    "red_flags" "text"[],
    "sentiment" "text",
    "review_text" "text",
    "media" "jsonb",
    "social_media" "jsonb",
    "status" "text",
    "like_count" integer,
    "dislike_count" integer,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "is_anonymous" boolean,
    "location" "text",
    "backup_reason" "text"
);


ALTER TABLE "public"."orphaned_reviews_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orphaned_reviews_detailed_backup" (
    "id" "uuid",
    "author_id" "uuid",
    "reviewer_anonymous_id" "text",
    "reviewed_person_name" "text",
    "reviewed_person_location" "jsonb",
    "category" "text",
    "profile_photo" "text",
    "green_flags" "text"[],
    "red_flags" "text"[],
    "sentiment" "text",
    "review_text" "text",
    "media" "jsonb",
    "social_media" "jsonb",
    "status" "text",
    "like_count" integer,
    "dislike_count" integer,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "is_anonymous" boolean,
    "location" "text",
    "backup_id" "text",
    "backup_timestamp" timestamp with time zone,
    "orphan_type" "text"
);


ALTER TABLE "public"."orphaned_reviews_detailed_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "device_id" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_item_id" "text" NOT NULL,
    "reported_item_type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reports_reason_check" CHECK (("reason" = ANY (ARRAY['inappropriate_content'::"text", 'fake_profile'::"text", 'harassment'::"text", 'spam'::"text", 'other'::"text"]))),
    CONSTRAINT "reports_reported_item_type_check" CHECK (("reported_item_type" = ANY (ARRAY['review'::"text", 'profile'::"text", 'comment'::"text", 'message'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reviewer_id" "uuid",
    "subject_first_name" "text" NOT NULL,
    "subject_location" "text" NOT NULL,
    "subject_age_range" "text",
    "demographic_category" "text" NOT NULL,
    "review_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "rating" integer,
    "met_location" "text",
    "date_of_experience" "date",
    "has_evidence" boolean DEFAULT false,
    "evidence_count" integer DEFAULT 0,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "report_count" integer DEFAULT 0,
    "moderation_status" "text" DEFAULT 'pending'::"text",
    "moderation_notes" "text",
    "sightengine_analysis" "jsonb",
    "location_coordinates" "point",
    "search_vector" "tsvector",
    "card_height" integer,
    "content_length" "text" DEFAULT 'medium'::"text",
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "comment_count" integer DEFAULT 0,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "location_name" "text",
    "location_address" "text",
    CONSTRAINT "check_reviews_valid_latitude" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "check_reviews_valid_longitude" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric)))),
    CONSTRAINT "reviews_content_length_check" CHECK (("content_length" = ANY (ARRAY['short'::"text", 'medium'::"text", 'long'::"text"]))),
    CONSTRAINT "reviews_demographic_category_check" CHECK (("demographic_category" = ANY (ARRAY['Men'::"text", 'Women'::"text", 'LGBT'::"text"]))),
    CONSTRAINT "reviews_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'flagged'::"text"]))),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_review_type_check" CHECK (("review_type" = ANY (ARRAY['red_flag'::"text", 'green_flag'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews_firebase" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid",
    "reviewer_anonymous_id" "text" NOT NULL,
    "reviewed_person_name" "text" NOT NULL,
    "reviewed_person_location" "jsonb" NOT NULL,
    "category" "text" DEFAULT 'all'::"text",
    "profile_photo" "text" NOT NULL,
    "green_flags" "text"[] DEFAULT '{}'::"text"[],
    "red_flags" "text"[] DEFAULT '{}'::"text"[],
    "sentiment" "text",
    "review_text" "text" NOT NULL,
    "media" "jsonb" DEFAULT '[]'::"jsonb",
    "social_media" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "like_count" integer DEFAULT 0,
    "dislike_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_anonymous" boolean DEFAULT false,
    "location" "text",
    CONSTRAINT "reviews_firebase_sentiment_check" CHECK (("sentiment" = ANY (ARRAY['green'::"text", 'red'::"text"]))),
    CONSTRAINT "reviews_firebase_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."reviews_firebase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_media_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid",
    "platform" "text" NOT NULL,
    "handle" "text" NOT NULL,
    "profile_url" "text",
    "is_verified" boolean DEFAULT false,
    "verification_date" timestamp with time zone,
    "last_checked" timestamp with time zone,
    "profile_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "social_media_profiles_platform_check" CHECK (("platform" = ANY (ARRAY['instagram'::"text", 'tiktok'::"text", 'facebook'::"text", 'twitter'::"text", 'linkedin'::"text"])))
);


ALTER TABLE "public"."social_media_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "subscription_tier" "text" NOT NULL,
    "revenuecat_event_id" "text",
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    CONSTRAINT "subscription_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['subscription_started'::"text", 'subscription_renewed'::"text", 'subscription_canceled'::"text", 'subscription_expired'::"text", 'trial_started'::"text", 'trial_converted'::"text", 'purchase_failed'::"text", 'billing_issue'::"text", 'refund_issued'::"text"]))),
    CONSTRAINT "subscription_events_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'premium'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_events" IS 'Tracks all subscription-related events for analytics and billing';



COMMENT ON COLUMN "public"."subscription_events"."event_type" IS 'Type of subscription event (started, renewed, canceled, etc.)';



COMMENT ON COLUMN "public"."subscription_events"."subscription_tier" IS 'Subscription tier at the time of the event';



COMMENT ON COLUMN "public"."subscription_events"."revenuecat_event_id" IS 'Unique identifier from RevenueCat webhook to prevent duplicates';



COMMENT ON COLUMN "public"."subscription_events"."event_data" IS 'Additional event data from RevenueCat or other sources';



CREATE OR REPLACE VIEW "public"."subscription_analytics" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "date",
    "event_type",
    "subscription_tier",
    "count"(*) AS "event_count",
    "count"(DISTINCT "user_id") AS "unique_users"
   FROM "public"."subscription_events"
  WHERE ("created_at" >= ("now"() - '90 days'::interval))
  GROUP BY ("date_trunc"('day'::"text", "created_at")), "event_type", "subscription_tier"
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, "event_type", "subscription_tier";


ALTER VIEW "public"."subscription_analytics" OWNER TO "postgres";


COMMENT ON VIEW "public"."subscription_analytics" IS 'Daily aggregated subscription events for analytics dashboard';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clerk_user_id" "text",
    "username" "text",
    "email" "text",
    "subscription_tier" "text" DEFAULT 'basic'::"text",
    "subscription_expires_at" timestamp with time zone,
    "verification_level" "text" DEFAULT 'basic'::"text",
    "reputation_score" integer DEFAULT 0,
    "total_reviews_submitted" integer DEFAULT 0,
    "is_banned" boolean DEFAULT false,
    "ban_reason" "text",
    "last_active" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "latitude" double precision,
    "longitude" double precision,
    "location_name" "text",
    "location_address" "text",
    "location_updated_at" timestamp with time zone,
    "anonymous_id" "text",
    "city" "text",
    "state" "text",
    "gender_preference" "text" DEFAULT 'all'::"text",
    "gender" "text",
    "is_blocked" boolean DEFAULT false,
    "location_type" "text",
    "location_full_name" "text",
    "institution_type" "text",
    CONSTRAINT "users_location_type_check" CHECK (("location_type" = ANY (ARRAY['city'::"text", 'college'::"text"]))),
    CONSTRAINT "users_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['basic'::"text", 'plus'::"text", 'elite'::"text"]))),
    CONSTRAINT "users_verification_level_check" CHECK (("verification_level" = ANY (ARRAY['basic'::"text", 'phone'::"text", 'id'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."latitude" IS 'User latitude coordinate (WGS84 decimal degrees)';



COMMENT ON COLUMN "public"."users"."longitude" IS 'User longitude coordinate (WGS84 decimal degrees)';



CREATE OR REPLACE VIEW "public"."subscription_metrics" AS
 WITH "current_subscribers" AS (
         SELECT "count"(*) FILTER (WHERE (("users"."subscription_tier" = 'premium'::"text") AND (("users"."subscription_expires_at" IS NULL) OR ("users"."subscription_expires_at" > "now"())))) AS "premium_count",
            "count"(*) FILTER (WHERE (("users"."subscription_tier" = 'pro'::"text") AND (("users"."subscription_expires_at" IS NULL) OR ("users"."subscription_expires_at" > "now"())))) AS "pro_count",
            "count"(*) FILTER (WHERE (("users"."subscription_tier" = 'free'::"text") OR ("users"."subscription_expires_at" <= "now"()))) AS "free_count",
            "count"(*) AS "total_users"
           FROM "public"."users"
        ), "recent_events" AS (
         SELECT "count"(*) FILTER (WHERE (("subscription_events"."event_type" = 'subscription_started'::"text") AND ("subscription_events"."created_at" >= ("now"() - '30 days'::interval)))) AS "new_subscriptions_30d",
            "count"(*) FILTER (WHERE (("subscription_events"."event_type" = 'subscription_canceled'::"text") AND ("subscription_events"."created_at" >= ("now"() - '30 days'::interval)))) AS "cancellations_30d",
            "count"(*) FILTER (WHERE (("subscription_events"."event_type" = 'purchase_failed'::"text") AND ("subscription_events"."created_at" >= ("now"() - '30 days'::interval)))) AS "failed_purchases_30d"
           FROM "public"."subscription_events"
        )
 SELECT "cs"."premium_count",
    "cs"."pro_count",
    "cs"."free_count",
    "cs"."total_users",
    ("cs"."premium_count" + "cs"."pro_count") AS "total_paid_subscribers",
    "round"((((("cs"."premium_count" + "cs"."pro_count"))::numeric / (NULLIF("cs"."total_users", 0))::numeric) * (100)::numeric), 2) AS "subscription_rate_percent",
    "re"."new_subscriptions_30d",
    "re"."cancellations_30d",
    "re"."failed_purchases_30d",
        CASE
            WHEN ("re"."new_subscriptions_30d" > 0) THEN "round"(((("re"."cancellations_30d")::numeric / ("re"."new_subscriptions_30d")::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "churn_rate_percent"
   FROM "current_subscribers" "cs",
    "recent_events" "re";


ALTER VIEW "public"."subscription_metrics" OWNER TO "postgres";


COMMENT ON VIEW "public"."subscription_metrics" IS 'Real-time subscription metrics and KPIs';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "tier" "text" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_tier_check" CHECK (("tier" = ANY (ARRAY['plus'::"text", 'elite'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."typing_indicators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "is_typing" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:00:10'::interval),
    CONSTRAINT "typing_indicators_category_check" CHECK (("category" = ANY (ARRAY['Men'::"text", 'Women'::"text", 'LGBT'::"text"])))
);


ALTER TABLE "public"."typing_indicators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "review_id" "uuid",
    "interaction_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['upvote'::"text", 'downvote'::"text", 'report'::"text", 'bookmark'::"text"])))
);


ALTER TABLE "public"."user_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "clerk_session_id" "text",
    "device_info" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "is_active" boolean DEFAULT true,
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval)
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_warnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "moderator_id" "uuid",
    "warning_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "related_report_id" "uuid",
    "severity" "text" DEFAULT 'low'::"text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_warnings_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "user_warnings_warning_type_check" CHECK (("warning_type" = ANY (ARRAY['content_violation'::"text", 'harassment'::"text", 'spam'::"text", 'community_guidelines'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."user_warnings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chat_members_firebase"
    ADD CONSTRAINT "chat_members_firebase_chat_room_id_user_id_key" UNIQUE ("chat_room_id", "user_id");



ALTER TABLE ONLY "public"."chat_members_firebase"
    ADD CONSTRAINT "chat_members_firebase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_message_likes"
    ADD CONSTRAINT "chat_message_likes_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."chat_message_likes"
    ADD CONSTRAINT "chat_message_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages_firebase"
    ADD CONSTRAINT "chat_messages_firebase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_room_subscriptions"
    ADD CONSTRAINT "chat_room_subscriptions_pkey" PRIMARY KEY ("user_id", "room_id");



ALTER TABLE ONLY "public"."chat_rooms_firebase"
    ADD CONSTRAINT "chat_rooms_firebase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colleges"
    ADD CONSTRAINT "colleges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colleges"
    ADD CONSTRAINT "colleges_scorecard_id_key" UNIQUE ("scorecard_id");



ALTER TABLE ONLY "public"."comments_firebase"
    ADD CONSTRAINT "comments_firebase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moderation_logs"
    ADD CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_device_id_key" UNIQUE ("user_id", "device_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews_firebase"
    ADD CONSTRAINT "reviews_firebase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_media_profiles"
    ADD CONSTRAINT "social_media_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_user_id_category_key" UNIQUE ("user_id", "category");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "unique_revenuecat_event" UNIQUE ("revenuecat_event_id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_review_id_interaction_type_key" UNIQUE ("user_id", "review_id", "interaction_type");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_warnings"
    ADD CONSTRAINT "user_warnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_clerk_user_id_key" UNIQUE ("clerk_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_chat_message_likes_message_id" ON "public"."chat_message_likes" USING "btree" ("message_id");



CREATE INDEX "idx_chat_message_likes_user_id" ON "public"."chat_message_likes" USING "btree" ("user_id");



CREATE INDEX "idx_chat_messages_category_created" ON "public"."chat_messages" USING "btree" ("category", "created_at" DESC);



CREATE INDEX "idx_chat_messages_content_gin" ON "public"."chat_messages_firebase" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_chat_messages_content_trgm" ON "public"."chat_messages_firebase" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_chat_messages_delivered_at" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id", "delivered_at" DESC) WHERE ("delivered_at" IS NOT NULL);



CREATE INDEX "idx_chat_messages_firebase_room_id" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id");



CREATE INDEX "idx_chat_messages_firebase_sender_id" ON "public"."chat_messages_firebase" USING "btree" ("sender_id");



CREATE INDEX "idx_chat_messages_firebase_timestamp" ON "public"."chat_messages_firebase" USING "btree" ("timestamp");



CREATE INDEX "idx_chat_messages_fts" ON "public"."chat_messages_firebase" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("content", ''::"text")));



CREATE INDEX "idx_chat_messages_likes" ON "public"."chat_messages" USING "btree" ("likes" DESC) WHERE ("likes" > 0);



CREATE INDEX "idx_chat_messages_location" ON "public"."chat_messages" USING "btree" ("latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_chat_messages_media" ON "public"."chat_messages" USING "btree" ("media_url") WHERE ("media_url" IS NOT NULL);



CREATE INDEX "idx_chat_messages_read_at" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id", "read_at" DESC) WHERE ("read_at" IS NOT NULL);



CREATE INDEX "idx_chat_messages_room_active" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_chat_messages_room_timestamp" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id", "timestamp" DESC);



CREATE INDEX "idx_chat_messages_search_vector" ON "public"."chat_messages" USING "gin" ("search_vector");



CREATE INDEX "idx_chat_messages_sender" ON "public"."chat_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_chat_messages_status" ON "public"."chat_messages_firebase" USING "btree" ("status", "chat_room_id", "timestamp" DESC);



CREATE INDEX "idx_chat_rooms_activity" ON "public"."chat_rooms_firebase" USING "btree" ("last_activity" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_chat_rooms_activity_sorted" ON "public"."chat_rooms_firebase" USING "btree" ("last_activity" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_chat_rooms_category" ON "public"."chat_rooms" USING "btree" ("category") WHERE ("is_active" = true);



CREATE INDEX "idx_chat_rooms_firebase_active" ON "public"."chat_rooms_firebase" USING "btree" ("is_active");



CREATE INDEX "idx_chat_rooms_firebase_category" ON "public"."chat_rooms_firebase" USING "btree" ("category");



CREATE INDEX "idx_chat_rooms_firebase_location" ON "public"."chat_rooms_firebase" USING "gin" ("location");



CREATE INDEX "idx_chat_rooms_firebase_type" ON "public"."chat_rooms_firebase" USING "btree" ("type");



CREATE INDEX "idx_chat_rooms_location" ON "public"."chat_rooms" USING "btree" ("latitude", "longitude") WHERE ("is_location_based" = true);



CREATE INDEX "idx_chat_rooms_unread_count" ON "public"."chat_rooms_firebase" USING "btree" ("unread_count") WHERE ("unread_count" > 0);



CREATE INDEX "idx_colleges_alias" ON "public"."colleges" USING "gin" ("to_tsvector"('"english"'::"regconfig", "alias"));



CREATE INDEX "idx_colleges_location" ON "public"."colleges" USING "btree" ("city", "state");



CREATE INDEX "idx_colleges_name" ON "public"."colleges" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_colleges_state" ON "public"."colleges" USING "btree" ("state");



CREATE INDEX "idx_colleges_type" ON "public"."colleges" USING "btree" ("institution_type");



CREATE INDEX "idx_comments_author_id" ON "public"."comments_firebase" USING "btree" ("author_id");



CREATE INDEX "idx_comments_content_gin" ON "public"."comments_firebase" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_comments_content_trgm" ON "public"."comments_firebase" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_comments_created_at" ON "public"."comments" USING "btree" ("created_at");



CREATE INDEX "idx_comments_deleted_created" ON "public"."comments_firebase" USING "btree" ("is_deleted", "created_at" DESC);



CREATE INDEX "idx_comments_firebase_author_id" ON "public"."comments_firebase" USING "btree" ("author_id");



CREATE INDEX "idx_comments_firebase_created_at" ON "public"."comments_firebase" USING "btree" ("created_at");



CREATE INDEX "idx_comments_firebase_review_id" ON "public"."comments_firebase" USING "btree" ("review_id");



CREATE INDEX "idx_comments_fts" ON "public"."comments_firebase" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("content", ''::"text")));



CREATE INDEX "idx_comments_media_id" ON "public"."comments_firebase" USING "btree" ("media_id");



CREATE INDEX "idx_comments_parent_id" ON "public"."comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_comments_review_created" ON "public"."comments_firebase" USING "btree" ("review_id", "created_at" DESC);



CREATE INDEX "idx_comments_review_id" ON "public"."comments" USING "btree" ("review_id");



CREATE INDEX "idx_comments_user_id" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_evidence_review" ON "public"."evidence" USING "btree" ("review_id");



CREATE INDEX "idx_messages_room_id" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id");



CREATE INDEX "idx_messages_room_timestamp" ON "public"."chat_messages_firebase" USING "btree" ("chat_room_id", "timestamp" DESC);



CREATE INDEX "idx_moderation_logs_content_type" ON "public"."moderation_logs" USING "btree" ("content_type");



CREATE INDEX "idx_moderation_logs_created_at" ON "public"."moderation_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_moderation_logs_user_date" ON "public"."moderation_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_push_tokens_user_active" ON "public"."push_tokens" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_reported_item" ON "public"."reports" USING "btree" ("reported_item_id", "reported_item_type");



CREATE INDEX "idx_reports_reporter_id" ON "public"."reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_reviews_author_created" ON "public"."reviews_firebase" USING "btree" ("author_id", "created_at" DESC);



CREATE INDEX "idx_reviews_author_id" ON "public"."reviews_firebase" USING "btree" ("author_id");



CREATE INDEX "idx_reviews_category_created" ON "public"."reviews_firebase" USING "btree" ("category", "created_at" DESC);



CREATE INDEX "idx_reviews_city" ON "public"."reviews_firebase" USING "gin" ((("reviewed_person_location" ->> 'city'::"text")) "public"."gin_trgm_ops");



CREATE INDEX "idx_reviews_created_at" ON "public"."reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reviews_demographic_category" ON "public"."reviews" USING "btree" ("demographic_category");



CREATE INDEX "idx_reviews_firebase_author_id" ON "public"."reviews_firebase" USING "btree" ("author_id");



CREATE INDEX "idx_reviews_firebase_created_at" ON "public"."reviews_firebase" USING "btree" ("created_at");



CREATE INDEX "idx_reviews_firebase_location" ON "public"."reviews_firebase" USING "gin" ("reviewed_person_location");



CREATE INDEX "idx_reviews_firebase_status" ON "public"."reviews_firebase" USING "btree" ("status");



CREATE INDEX "idx_reviews_fts" ON "public"."reviews_firebase" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((((COALESCE("review_text", ''::"text") || ' '::"text") || COALESCE("reviewed_person_name", ''::"text")) || ' '::"text") || COALESCE(("reviewed_person_location" ->> 'city'::"text"), ''::"text")) || ' '::"text") || COALESCE(("reviewed_person_location" ->> 'state'::"text"), ''::"text"))));



CREATE INDEX "idx_reviews_location" ON "public"."reviews" USING "gist" ("location_coordinates");



CREATE INDEX "idx_reviews_location_created" ON "public"."reviews_firebase" USING "btree" ((("reviewed_person_location" ->> 'city'::"text")), (("reviewed_person_location" ->> 'state'::"text")), "created_at" DESC);



CREATE INDEX "idx_reviews_moderation_approved" ON "public"."reviews" USING "btree" ("moderation_status") WHERE ("moderation_status" = 'approved'::"text");



CREATE INDEX "idx_reviews_name_gin" ON "public"."reviews_firebase" USING "gin" ("reviewed_person_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_reviews_name_trgm" ON "public"."reviews_firebase" USING "gin" ("reviewed_person_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_reviews_reviewer_id" ON "public"."reviews" USING "btree" ("reviewer_id");



CREATE INDEX "idx_reviews_search_vector" ON "public"."reviews" USING "gin" ("search_vector");



CREATE INDEX "idx_reviews_state" ON "public"."reviews_firebase" USING "gin" ((("reviewed_person_location" ->> 'state'::"text")) "public"."gin_trgm_ops");



CREATE INDEX "idx_reviews_status" ON "public"."reviews_firebase" USING "btree" ("status") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_reviews_status_created" ON "public"."reviews_firebase" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_reviews_subject_name_location" ON "public"."reviews" USING "btree" ("subject_first_name", "subject_location");



CREATE INDEX "idx_reviews_text_gin" ON "public"."reviews_firebase" USING "gin" ("review_text" "public"."gin_trgm_ops");



CREATE INDEX "idx_reviews_text_trgm" ON "public"."reviews_firebase" USING "gin" ("review_text" "public"."gin_trgm_ops");



CREATE INDEX "idx_social_media_platform_handle" ON "public"."social_media_profiles" USING "btree" ("platform", "handle");



CREATE INDEX "idx_social_media_review" ON "public"."social_media_profiles" USING "btree" ("review_id");



CREATE INDEX "idx_subscription_events_created_at" ON "public"."subscription_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_subscription_events_event_type" ON "public"."subscription_events" USING "btree" ("event_type");



CREATE INDEX "idx_subscription_events_revenuecat_id" ON "public"."subscription_events" USING "btree" ("revenuecat_event_id") WHERE ("revenuecat_event_id" IS NOT NULL);



CREATE INDEX "idx_subscription_events_tier_date" ON "public"."subscription_events" USING "btree" ("subscription_tier", "created_at" DESC);



CREATE INDEX "idx_subscription_events_user_id" ON "public"."subscription_events" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_user_active" ON "public"."subscriptions" USING "btree" ("user_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_typing_indicators_category" ON "public"."typing_indicators" USING "btree" ("category");



CREATE INDEX "idx_typing_indicators_expires_at" ON "public"."typing_indicators" USING "btree" ("expires_at");



CREATE INDEX "idx_user_blocks_blocked" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_interactions_user_review" ON "public"."user_interactions" USING "btree" ("user_id", "review_id");



CREATE INDEX "idx_user_sessions_active" ON "public"."user_sessions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_sessions_clerk_session_id" ON "public"."user_sessions" USING "btree" ("clerk_session_id");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_user_warnings_created_at" ON "public"."user_warnings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_warnings_user" ON "public"."user_warnings" USING "btree" ("user_id");



CREATE INDEX "idx_users_anonymous_id" ON "public"."users" USING "btree" ("anonymous_id");



CREATE INDEX "idx_users_clerk_id" ON "public"."users" USING "btree" ("clerk_user_id");



CREATE INDEX "idx_users_coordinates" ON "public"."users" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_users_gender_preference" ON "public"."users" USING "btree" ("gender_preference");



CREATE INDEX "idx_users_location" ON "public"."users" USING "btree" ("city", "state");



CREATE INDEX "idx_users_subscription" ON "public"."users" USING "btree" ("subscription_tier", "subscription_expires_at");



CREATE INDEX "push_tokens_platform_idx" ON "public"."push_tokens" USING "btree" ("platform");



CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "chat_message_change_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_chat_message_change"();



CREATE OR REPLACE TRIGGER "trigger_message_status_insert" BEFORE INSERT ON "public"."chat_messages_firebase" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_status_timestamps"();



CREATE OR REPLACE TRIGGER "trigger_message_status_update" BEFORE UPDATE ON "public"."chat_messages_firebase" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_status_timestamps"();



CREATE OR REPLACE TRIGGER "trigger_update_comment_count" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_review_comment_count"();



CREATE OR REPLACE TRIGGER "trigger_update_user_activity_on_subscription_event" AFTER INSERT ON "public"."subscription_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_activity_on_subscription_event"();



CREATE OR REPLACE TRIGGER "typing_indicator_change_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."typing_indicators" FOR EACH ROW EXECUTE FUNCTION "public"."notify_typing_change"();



CREATE OR REPLACE TRIGGER "update_chat_message_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_message_search_vector"();



CREATE OR REPLACE TRIGGER "update_chat_messages_updated_at" BEFORE UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_chat_rooms_updated_at" BEFORE UPDATE ON "public"."chat_rooms_firebase" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_search_vector" BEFORE INSERT OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_search_vector"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."chat_members_firebase"
    ADD CONSTRAINT "chat_members_firebase_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_rooms_firebase"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_members_firebase"
    ADD CONSTRAINT "chat_members_firebase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message_likes"
    ADD CONSTRAINT "chat_message_likes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message_likes"
    ADD CONSTRAINT "chat_message_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages_firebase"
    ADD CONSTRAINT "chat_messages_firebase_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_rooms_firebase"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages_firebase"
    ADD CONSTRAINT "chat_messages_firebase_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."chat_messages_firebase"("id");



ALTER TABLE ONLY "public"."chat_messages_firebase"
    ADD CONSTRAINT "chat_messages_firebase_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."chat_messages"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room_subscriptions"
    ADD CONSTRAINT "chat_room_subscriptions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms_firebase"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room_subscriptions"
    ADD CONSTRAINT "chat_room_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_rooms_firebase"
    ADD CONSTRAINT "chat_rooms_firebase_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."comments_firebase"
    ADD CONSTRAINT "comments_firebase_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments_firebase"
    ADD CONSTRAINT "comments_firebase_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments_firebase"("id");



ALTER TABLE ONLY "public"."comments_firebase"
    ADD CONSTRAINT "comments_firebase_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews_firebase"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments_firebase"
    ADD CONSTRAINT "fk_comments_firebase_author_id" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews_firebase"
    ADD CONSTRAINT "fk_reviews_firebase_author_id" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."moderation_logs"
    ADD CONSTRAINT "moderation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews_firebase"
    ADD CONSTRAINT "reviews_firebase_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_media_profiles"
    ADD CONSTRAINT "social_media_profiles_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_warnings"
    ADD CONSTRAINT "user_warnings_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_warnings"
    ADD CONSTRAINT "user_warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anonymous access for chat testing" ON "public"."chat_messages" USING (("auth"."role"() = 'anon'::"text"));



CREATE POLICY "Allow anonymous access for comments testing" ON "public"."comments" USING (("auth"."role"() = 'anon'::"text"));



CREATE POLICY "Allow anonymous access for reviews testing" ON "public"."reviews" USING (("auth"."role"() = 'anon'::"text"));



CREATE POLICY "Allow anonymous access for testing" ON "public"."users" USING (("auth"."role"() = 'anon'::"text"));



CREATE POLICY "Anyone can create reviews" ON "public"."reviews_firebase" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read active chat rooms" ON "public"."chat_rooms_firebase" FOR SELECT USING ((("is_active" = true) AND ("is_deleted" = false)));



CREATE POLICY "Anyone can read non-deleted messages" ON "public"."chat_messages_firebase" FOR SELECT USING (("is_deleted" = false));



CREATE POLICY "Anyone can view active chat rooms" ON "public"."chat_rooms_firebase" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view approved reviews" ON "public"."reviews_firebase" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Anyone can view chat messages" ON "public"."chat_messages_firebase" FOR SELECT USING (true);



CREATE POLICY "Anyone can view comments" ON "public"."comments_firebase" FOR SELECT USING (("is_deleted" = false));



CREATE POLICY "Approved reviews are publicly readable" ON "public"."reviews" FOR SELECT USING (("moderation_status" = 'approved'::"text"));



CREATE POLICY "Authenticated users can create comments" ON "public"."comments_firebase" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Authenticated users can insert messages" ON "public"."chat_messages_firebase" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can send chat messages" ON "public"."chat_messages" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("sender_id" = "auth"."uid"())));



CREATE POLICY "Authenticated users can send messages" ON "public"."chat_messages_firebase" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Chat messages are publicly readable" ON "public"."chat_messages" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Chat rooms are publicly readable" ON "public"."chat_rooms" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Comments are viewable by everyone" ON "public"."comments" FOR SELECT USING (("moderation_status" = 'approved'::"text"));



CREATE POLICY "Evidence visible with approved reviews" ON "public"."evidence" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."reviews"
  WHERE (("reviews"."id" = "evidence"."review_id") AND ("reviews"."moderation_status" = 'approved'::"text")))));



CREATE POLICY "Service role can manage chat_messages" ON "public"."chat_messages" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage comments" ON "public"."comments" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage reviews" ON "public"."reviews" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage users" ON "public"."users" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can create subscription events" ON "public"."subscription_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create blocks" ON "public"."user_blocks" FOR INSERT WITH CHECK (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can create comments" ON "public"."comments_firebase" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can delete their own blocks" ON "public"."user_blocks" FOR DELETE USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can delete their own chat messages" ON "public"."chat_messages" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND ("sender_id" = "auth"."uid"())));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING ((("auth"."uid"())::"text" IN ( SELECT "users"."clerk_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "comments"."user_id"))));



CREATE POLICY "Users can delete their own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own typing status" ON "public"."typing_indicators" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert own messages" ON "public"."chat_messages" FOR INSERT WITH CHECK (("sender_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."clerk_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))));



CREATE POLICY "Users can insert own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") OR (("auth"."uid"())::"text" = "clerk_user_id")));



CREATE POLICY "Users can insert own reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("reviewer_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."clerk_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))));



CREATE POLICY "Users can insert their own comments" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" IN ( SELECT "users"."clerk_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "comments"."user_id"))));



CREATE POLICY "Users can insert their own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join chat rooms" ON "public"."chat_members_firebase" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ((EXISTS ( SELECT 1
   FROM "public"."chat_rooms_firebase" "cr"
  WHERE (("cr"."id" = "chat_members_firebase"."chat_room_id") AND ("cr"."is_private" = false)))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_members_firebase" "cm"
  WHERE (("cm"."chat_room_id" = "chat_members_firebase"."chat_room_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'moderator'::"text"]))))))));



CREATE POLICY "Users can like chat messages" ON "public"."chat_message_likes" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can manage own evidence" ON "public"."evidence" USING ((EXISTS ( SELECT 1
   FROM "public"."reviews"
  WHERE (("reviews"."id" = "evidence"."review_id") AND ("reviews"."reviewer_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."clerk_user_id" = ("auth"."jwt"() ->> 'sub'::"text"))))))));



CREATE POLICY "Users can manage own interactions" ON "public"."user_interactions" USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."clerk_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))));



CREATE POLICY "Users can manage social media profiles for their reviews" ON "public"."social_media_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."reviews_firebase"
  WHERE (("reviews_firebase"."id" = "social_media_profiles"."review_id") AND ("reviews_firebase"."author_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own notifications" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own push tokens" ON "public"."push_tokens" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can set their own typing status" ON "public"."typing_indicators" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can unlike their own likes" ON "public"."chat_message_likes" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update own comments" ON "public"."comments_firebase" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can update own membership" ON "public"."chat_members_firebase" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own messages" ON "public"."chat_messages_firebase" FOR UPDATE USING ((("auth"."uid"())::"text" = ("sender_id")::"text"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own pending reviews" ON "public"."reviews" FOR UPDATE USING ((("reviewer_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."clerk_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))) AND ("moderation_status" = 'pending'::"text")));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") OR (("auth"."uid"())::"text" = "clerk_user_id")));



CREATE POLICY "Users can update own reviews" ON "public"."reviews_firebase" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can update their own chat messages" ON "public"."chat_messages" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("sender_id" = "auth"."uid"())));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING ((("auth"."uid"())::"text" IN ( SELECT "users"."clerk_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "comments"."user_id"))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sessions" ON "public"."user_sessions" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update their own typing status" ON "public"."typing_indicators" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view all chat message likes" ON "public"."chat_message_likes" FOR SELECT USING (true);



CREATE POLICY "Users can view all profiles" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Users can view all social media profiles" ON "public"."social_media_profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view chat members" ON "public"."chat_members_firebase" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."chat_members_firebase" "cm2"
  WHERE (("cm2"."chat_room_id" = "chat_members_firebase"."chat_room_id") AND ("cm2"."user_id" = "auth"."uid"()) AND ("cm2"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_rooms_firebase" "cr"
  WHERE (("cr"."id" = "chat_members_firebase"."chat_room_id") AND ("cr"."is_private" = false))))));



CREATE POLICY "Users can view chat messages in their category" ON "public"."chat_messages" FOR SELECT USING (true);



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscription events" ON "public"."subscription_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."clerk_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))));



CREATE POLICY "Users can view their own blocks" ON "public"."user_blocks" FOR SELECT USING ((("auth"."uid"() = "blocker_id") OR ("auth"."uid"() = "blocked_id")));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view their own warnings" ON "public"."user_warnings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view typing indicators" ON "public"."typing_indicators" FOR SELECT USING (true);



CREATE POLICY "Users manage own room subs" ON "public"."chat_room_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own tokens" ON "public"."push_tokens" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."chat_members_firebase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_message_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages_firebase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_room_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_rooms_firebase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments_firebase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews_firebase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_media_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."typing_indicators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_warnings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_typing_indicators"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_typing_indicators"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_typing_indicators"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_typing_indicators"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_typing_indicators"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_typing_indicators"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_comment_count"("review_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_comment_count"("review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_comment_count"("review_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_user_by_clerk_id"("p_clerk_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_user_by_clerk_id"("p_clerk_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_user_by_clerk_id"("p_clerk_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trending_names"("result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_names"("result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_names"("result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription_status"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription_status"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription_status"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_chat_message_likes"("message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_chat_message_likes"("message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_chat_message_likes"("message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_report_count"("review_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_report_count"("review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_report_count"("review_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_vote"("review_id" "uuid", "vote_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_vote"("review_id" "uuid", "vote_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_vote"("review_id" "uuid", "vote_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_subscription_tier" "text", "p_event_data" "jsonb", "p_revenuecat_event_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_subscription_tier" "text", "p_event_data" "jsonb", "p_revenuecat_event_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_subscription_tier" "text", "p_event_data" "jsonb", "p_revenuecat_event_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_chat_message_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_chat_message_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_chat_message_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_typing_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_typing_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_typing_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_typing_status"("p_category" "text", "p_is_typing" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_typing_status"("p_category" "text", "p_is_typing" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_typing_status"("p_category" "text", "p_is_typing" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."should_show_ads"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."should_show_ads"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_show_ads"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_from_clerk"("p_clerk_user_id" "text", "p_email" "text", "p_username" "text", "p_first_name" "text", "p_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_from_clerk"("p_clerk_user_id" "text", "p_email" "text", "p_username" "text", "p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_from_clerk"("p_clerk_user_id" "text", "p_email" "text", "p_username" "text", "p_first_name" "text", "p_last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_message_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_message_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_message_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_message_status_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_message_status_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_message_status_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_review_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_review_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_review_comment_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_activity_on_subscription_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_activity_on_subscription_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_activity_on_subscription_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_clerk_session_id" "text", "p_device_info" "jsonb", "p_ip_address" "inet", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_clerk_session_id" "text", "p_device_info" "jsonb", "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_clerk_session_id" "text", "p_device_info" "jsonb", "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vote_on_comment"("comment_id" "uuid", "vote_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vote_on_comment"("comment_id" "uuid", "vote_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vote_on_comment"("comment_id" "uuid", "vote_type" "text") TO "service_role";



GRANT ALL ON TABLE "public"."chat_members_firebase" TO "anon";
GRANT ALL ON TABLE "public"."chat_members_firebase" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_members_firebase" TO "service_role";



GRANT ALL ON TABLE "public"."chat_message_likes" TO "anon";
GRANT ALL ON TABLE "public"."chat_message_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_message_likes" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages_firebase" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages_firebase" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages_firebase" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."chat_room_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."chat_rooms" TO "anon";
GRANT ALL ON TABLE "public"."chat_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."chat_rooms_firebase" TO "anon";
GRANT ALL ON TABLE "public"."chat_rooms_firebase" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_rooms_firebase" TO "service_role";



GRANT ALL ON TABLE "public"."colleges" TO "anon";
GRANT ALL ON TABLE "public"."colleges" TO "authenticated";
GRANT ALL ON TABLE "public"."colleges" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."comments_firebase" TO "anon";
GRANT ALL ON TABLE "public"."comments_firebase" TO "authenticated";
GRANT ALL ON TABLE "public"."comments_firebase" TO "service_role";



GRANT ALL ON TABLE "public"."evidence" TO "anon";
GRANT ALL ON TABLE "public"."evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence" TO "service_role";



GRANT ALL ON TABLE "public"."moderation_logs" TO "anon";
GRANT ALL ON TABLE "public"."moderation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."moderation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."orphaned_reviews_backup" TO "anon";
GRANT ALL ON TABLE "public"."orphaned_reviews_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."orphaned_reviews_backup" TO "service_role";



GRANT ALL ON TABLE "public"."orphaned_reviews_detailed_backup" TO "anon";
GRANT ALL ON TABLE "public"."orphaned_reviews_detailed_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."orphaned_reviews_detailed_backup" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."reviews_firebase" TO "anon";
GRANT ALL ON TABLE "public"."reviews_firebase" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews_firebase" TO "service_role";



GRANT ALL ON TABLE "public"."social_media_profiles" TO "anon";
GRANT ALL ON TABLE "public"."social_media_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."social_media_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_analytics" TO "anon";
GRANT ALL ON TABLE "public"."subscription_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_metrics" TO "anon";
GRANT ALL ON TABLE "public"."subscription_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."typing_indicators" TO "anon";
GRANT ALL ON TABLE "public"."typing_indicators" TO "authenticated";
GRANT ALL ON TABLE "public"."typing_indicators" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_interactions" TO "anon";
GRANT ALL ON TABLE "public"."user_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_warnings" TO "anon";
GRANT ALL ON TABLE "public"."user_warnings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_warnings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
