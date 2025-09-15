# LockerRoom Supabase Database Technical Documentation

## Overview

This document provides a comprehensive analysis of the LockerRoom React Native application's Supabase database configuration, schema structure, security policies, and integration patterns. It identifies current implementation gaps and provides actionable recommendations for resolving database connectivity and query issues.

## 1. Database Schema Analysis

### Core Tables Structure

#### 1.1 Users Table

```sql
CREATE TABLE users (
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
```

**Key Features:**

- UUID primary key with auto-generation
- Location data stored in multiple formats (coordinates, address, name)
- User reputation and subscription management
- Automatic timestamp management via triggers

#### 1.2 Reviews Firebase Table

```sql
CREATE TABLE reviews_firebase (
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
```

**Key Features:**

- Foreign key relationship to users table
- JSONB fields for flexible data storage (media, location, social_media)
- Array fields for flags (green_flags, red_flags)
- Status field for content moderation

#### 1.3 Chat Rooms Firebase Table

```sql
CREATE TABLE chat_rooms_firebase (
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
```

#### 1.4 Chat Messages Firebase Table

```sql
CREATE TABLE chat_messages_firebase (
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
```

#### 1.5 Additional Tables

- **comments_firebase**: Comments on reviews with threading support
- **notifications**: Push notification management
- **push_tokens**: Device token storage for notifications
- **reports**: Content reporting and moderation system

### Database Indexes

#### Performance Optimization Indexes

```sql
-- Location-based queries
CREATE INDEX idx_reviews_location_composite ON reviews_firebase (status, category, created_at DESC) WHERE status = 'approved';
CREATE INDEX idx_reviews_city_category ON reviews_firebase ((reviewed_person_location->>'city'), category, created_at DESC) WHERE status = 'approved';

-- Full-text search
CREATE INDEX idx_reviews_text_search ON reviews_firebase USING GIN ((review_text || ' ' || reviewed_person_name) gin_trgm_ops) WHERE status = 'approved';

-- Chat performance
CREATE INDEX idx_chat_messages_room_timestamp ON chat_messages_firebase (chat_room_id, timestamp DESC) WHERE is_deleted = false;
```

## 2. Authentication & Security Setup

### Row Level Security (RLS) Policies

#### Users Table Policies

```sql
-- Public profile viewing (⚠️ SECURITY CONCERN)
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);

-- Self-management policies
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

#### Reviews Table Policies

```sql
-- Public content access
CREATE POLICY "Anyone can view active reviews" ON reviews_firebase FOR SELECT USING (status = 'active' OR status IS NULL);

-- Content management
CREATE POLICY "Authenticated users can create reviews" ON reviews_firebase FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own reviews" ON reviews_firebase FOR UPDATE USING (auth.uid() = author_id);
```

#### Chat Security

```sql
-- Room access control
CREATE POLICY "Anyone can view active chat rooms" ON chat_rooms_firebase FOR SELECT USING (is_active = true AND (is_deleted = false OR is_deleted IS NULL));

-- Message access with room validation
CREATE POLICY "Users can view messages in active rooms" ON chat_messages_firebase FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_rooms_firebase
    WHERE id = chat_room_id AND is_active = true AND (is_deleted = false OR is_deleted IS NULL)
  )
);
```

### Storage Security

#### Storage Buckets Configuration

```sql
-- Bucket definitions with size limits and MIME type restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('avatars', 'avatars', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('review-images', 'review-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('chat-media', 'chat-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'text/plain']);
```

#### Folder-Based Security

```sql
-- User-specific avatar storage
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Authentication Configuration

#### Supabase Auth Settings (config.toml)

```toml
[auth]
enable_signup = true
enable_anonymous_sign_ins = false
minimum_password_length = 6
jwt_expiry = 3600
enable_refresh_token_rotation = true

[auth.email]
enable_signup = true
enable_confirmations = false  # Matches user preference for auto-confirmation
secure_password_change = false
```

## 3. Configuration Files Analysis

### Supabase Configuration (supabase/config.toml)

#### Key Settings

- **Project ID**: `loccc`
- **Database Version**: PostgreSQL 17
- **API Port**: 54321 (local development)
- **Real-time**: Enabled with IPv4 binding
- **Storage**: 50MiB file size limit
- **Email Confirmations**: Disabled (matches user requirements)

#### Production Optimizations

```typescript
const productionConfig = {
  maxConnections: isProduction ? 50 : 10,
  connectionTimeout: isProduction ? 30000 : 10000,
  retryAttempts: isProduction ? 5 : 3,
  rateLimitPerSecond: isProduction ? 200 : 100,
  enableMetrics: isProduction,
  enableHealthChecks: isProduction,
};
```

### Environment Variables Required

```bash
# Required Supabase configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional integrations
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key
```

## 4. Code Integration Analysis

### Field Mapping System

The application uses a sophisticated field mapping system to convert between database snake_case and TypeScript camelCase:

```typescript
// Automatic conversion utilities
export function mapFieldsToCamelCase<T>(obj: T): CamelCaseKeys<T>;
export function mapFieldsToSnakeCase<T>(obj: T): SnakeCaseKeys<T>;

// Usage in services
const { data, error } = await supabase.from("reviews_firebase").select("*");
return mapFieldsToCamelCase(data); // Converts to TypeScript interface
```

### Service Layer Architecture

#### Modular Service Design

```typescript
// Service exports
export { authService } from "./auth";
export { usersService } from "./users";
export { reviewsService } from "./reviews";
export { chatService } from "./chat";
export { storageService } from "./storage";
```

#### Error Handling Pattern

```typescript
export const handleSupabaseError = (error: any): string => {
  // Network/timeout errors
  if (error?.name === "AbortError" || error?.message?.includes("timeout")) {
    return "Connection timeout. Please check your internet connection.";
  }

  // HTTP status code handling
  switch (error.status) {
    case 401:
      return "Invalid email or password.";
    case 403:
      return "Access denied. Please check your credentials.";
    case 429:
      return "Too many requests. Please wait a moment.";
    // ... more cases
  }
};
```

## 5. Implementation Gaps & Issues Identified

### 5.1 Schema vs Code Mismatches

#### Critical Field Mapping Issues

1. **Review Status Inconsistency**
   - Database default: `status = 'active'`
   - Index expectations: `status = 'approved'`
   - **Impact**: Performance indexes not utilized, queries may return unexpected results

2. **Chat Message Field Mapping**
   - Database: `chat_room_id`
   - TypeScript: `chatRoomId`
   - **Solution**: Field mapping handles this, but manual mapping in chat service creates inconsistency

3. **Location Data Structure**
   - Database: Multiple location fields (city, state, latitude, longitude) + JSONB location field
   - TypeScript: Nested location object structure
   - **Impact**: Complex queries and potential data duplication

#### Missing Database Elements

1. **Colleges Table**: Referenced in performance indexes but doesn't exist in schema
2. **Follows Table**: Referenced in users service but not defined in migrations
3. **Comment Count**: Reviews expect `commentsCount` but no efficient way to calculate

### 5.2 Security Concerns

#### Overly Permissive Policies

```sql
-- ⚠️ SECURITY RISK: Anyone can view all user profiles
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
```

**Recommendation**: Implement privacy controls based on user preferences

#### Storage Security Gaps

- Public buckets for review images and chat media may expose sensitive content
- No content scanning or moderation policies in place

### 5.3 Performance Issues

#### Inefficient Queries

1. **Review Comments Count**: Currently set to 0, requires separate query
2. **JSONB Queries**: Complex location filtering without proper indexing
3. **Real-time Subscriptions**: No connection pooling or rate limiting

#### Index Optimization Needed

```sql
-- Missing indexes for common queries
CREATE INDEX idx_users_location_updated ON users(location_updated_at DESC);
CREATE INDEX idx_reviews_author_created ON reviews_firebase(author_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender_timestamp ON chat_messages_firebase(sender_id, timestamp DESC);
```

## 6. Database Functions & Triggers

### Automated Functions

```sql
-- User review count maintenance
CREATE FUNCTION update_user_review_count() RETURNS TRIGGER;

-- Chat room activity tracking
CREATE FUNCTION update_chat_room_activity() RETURNS TRIGGER;

-- Notification creation helper
CREATE FUNCTION create_notification(p_user_id UUID, p_title TEXT, p_body TEXT, p_type TEXT, p_data JSONB) RETURNS UUID;

-- Location-based review search
CREATE FUNCTION get_nearby_reviews(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_miles DOUBLE PRECISION) RETURNS TABLE(...);
```

### Maintenance Functions

```sql
-- Cleanup old notifications (30+ days)
CREATE FUNCTION cleanup_old_notifications(days_old INTEGER) RETURNS INTEGER;

-- Update table statistics for performance
CREATE FUNCTION update_table_statistics() RETURNS void;
```

## 7. Real-time Configuration

### Realtime Subscriptions

```toml
[realtime]
enabled = true
max_header_length = 4096
```

### Connection Management

```typescript
// Production-optimized realtime configuration
realtime: {
  params: {
    eventsPerSecond: productionConfig.rateLimitPerSecond,
  },
  logger: __DEV__ ? console.log : undefined,
}
```

## 8. Implementation Recommendations

### 8.1 Immediate Fixes Required

#### 1. Fix Review Status Inconsistency

```sql
-- Update default status to match indexes
ALTER TABLE reviews_firebase ALTER COLUMN status SET DEFAULT 'approved';

-- Or update indexes to use 'active'
DROP INDEX idx_reviews_location_composite;
CREATE INDEX idx_reviews_location_composite ON reviews_firebase (status, category, created_at DESC) WHERE status = 'active';
```

#### 2. Implement Missing Tables

```sql
-- Create colleges table for location functionality
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  alias TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follows table for social features
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

#### 3. Optimize Comment Counting

```sql
-- Add comment_count column to reviews
ALTER TABLE reviews_firebase ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Create trigger to maintain count
CREATE FUNCTION update_review_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews_firebase SET comment_count = comment_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews_firebase SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_comment_count
  AFTER INSERT OR DELETE ON comments_firebase
  FOR EACH ROW EXECUTE FUNCTION update_review_comment_count();
```

### 8.2 Security Improvements

#### 1. Implement Privacy Controls

```sql
-- Replace overly permissive user policy
DROP POLICY "Users can view all profiles" ON users;

CREATE POLICY "Users can view public profiles" ON users
  FOR SELECT USING (
    auth.uid() = id OR  -- Own profile
    is_blocked = false  -- Not blocked users only
  );
```

#### 2. Add Content Moderation

```sql
-- Add moderation status to reviews
ALTER TABLE reviews_firebase ADD COLUMN moderation_status TEXT DEFAULT 'pending';
ALTER TABLE reviews_firebase ADD COLUMN moderated_at TIMESTAMPTZ;
ALTER TABLE reviews_firebase ADD COLUMN moderated_by UUID REFERENCES users(id);

-- Update RLS policy to only show approved content
CREATE POLICY "Users can view approved reviews" ON reviews_firebase
  FOR SELECT USING (moderation_status = 'approved' AND status = 'active');
```

### 8.3 Performance Optimizations

#### 1. Add Missing Indexes

```sql
-- User activity indexes
CREATE INDEX idx_users_last_active ON users(last_active DESC) WHERE last_active IS NOT NULL;
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);

-- Review performance indexes
CREATE INDEX idx_reviews_like_count ON reviews_firebase(like_count DESC) WHERE status = 'active';
CREATE INDEX idx_reviews_created_author ON reviews_firebase(created_at DESC, author_id);

-- Chat optimization indexes
CREATE INDEX idx_chat_rooms_last_activity ON chat_rooms_firebase(last_activity DESC) WHERE is_active = true;
CREATE INDEX idx_chat_messages_room_sender ON chat_messages_firebase(chat_room_id, sender_id, timestamp DESC);
```

#### 2. Implement Connection Pooling

```typescript
// Enhanced connection management
const connectionPool = {
  maxConnections: 20,
  idleTimeout: 30000,
  connectionTimeout: 10000,
  retryAttempts: 3,
};

// Add to supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "X-Connection-Pool-Size": connectionPool.maxConnections.toString(),
    },
  },
});
```

### 8.4 Code Integration Improvements

#### 1. Standardize Field Mapping

```typescript
// Create typed field mappers for each table
export const reviewFieldMapper = createFieldMapper<Review, ReviewRow>();
export const userFieldMapper = createFieldMapper<User, UserRow>();
export const chatFieldMapper = createFieldMapper<ChatRoom, ChatRoomRow>();

// Use in services consistently
const reviews = data.map(reviewFieldMapper.toCamel);
```

#### 2. Implement Proper Error Handling

```typescript
// Enhanced error handling with retry logic
export const withDatabaseRetry = async <T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication or permission errors
      if (error.code === "PGRST301" || error.code === "PGRST116") {
        throw error;
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
};
```

## 9. Monitoring & Maintenance

### Database Health Monitoring

```sql
-- Create monitoring views
CREATE VIEW database_health AS
SELECT
  'reviews_firebase' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_records,
  COUNT(*) FILTER (WHERE status = 'active') as active_records
FROM reviews_firebase
UNION ALL
SELECT
  'chat_messages_firebase',
  COUNT(*),
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours'),
  COUNT(*) FILTER (WHERE is_deleted = false)
FROM chat_messages_firebase;
```

### Regular Maintenance Tasks

1. **Weekly**: Run `cleanup_old_notifications(30)`
2. **Monthly**: Run `update_table_statistics()`
3. **Quarterly**: Review and optimize slow queries
4. **As needed**: Update performance indexes based on query patterns

## 10. Migration Checklist

### Before Implementing Changes

- [ ] Backup current database
- [ ] Test migrations in development environment
- [ ] Update TypeScript types to match schema changes
- [ ] Update service layer to handle new fields
- [ ] Test RLS policies with different user roles
- [ ] Verify real-time subscriptions still work
- [ ] Update API documentation

### Post-Migration Verification

- [ ] Run database health checks
- [ ] Verify all indexes are being used
- [ ] Test authentication flows
- [ ] Validate real-time functionality
- [ ] Check storage bucket permissions
- [ ] Monitor error rates and performance metrics

---

## Conclusion

The LockerRoom Supabase database is well-structured with comprehensive security policies and performance optimizations. However, several critical issues need immediate attention:

1. **Schema inconsistencies** between database defaults and application expectations
2. **Missing tables** referenced in code but not defined in migrations
3. **Security policies** that may be too permissive for production use
4. **Performance gaps** in comment counting and location-based queries

Implementing the recommended fixes will resolve current connectivity issues and provide a solid foundation for scaling the application.
