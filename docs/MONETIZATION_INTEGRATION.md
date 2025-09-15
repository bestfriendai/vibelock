# Monetization Integration with Supabase Backend

This document explains how the LockerRoom app's monetization system (RevenueCat subscriptions and AdMob advertising) is integrated with the Supabase database backend for perfect synchronization and data consistency.

## 🏗️ Architecture Overview

The monetization system consists of three main components:

1. **RevenueCat Integration**: Handles subscription purchases and management
2. **Supabase Database**: Stores subscription status and analytics
3. **AdMob Integration**: Shows ads only to non-premium users

## 📊 Database Schema

### Users Table (Enhanced)

```sql
-- Subscription-related fields in users table
subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro'))
subscription_expires_at TIMESTAMPTZ
```

### Subscription Events Table (New)

```sql
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_started', 'subscription_renewed', 'subscription_canceled',
    'subscription_expired', 'trial_started', 'trial_converted', 'purchase_failed'
  )),
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  revenuecat_event_id TEXT UNIQUE,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Data Flow

### 1. User Registration

```typescript
// When user signs up
await authService.signUp(email, password, username);
// ↓ Automatically triggers
await initializeUserSubscription(userId);
// ↓ Sets subscription_tier = 'free' and logs initial event
```

### 2. Subscription Purchase

```typescript
// User purchases subscription in app
const result = await subscriptionStore.purchasePackage(package);
// ↓ RevenueCat processes payment
// ↓ App receives customerInfo
await subscriptionService.syncSubscriptionStatus(userId, customerInfo);
// ↓ Updates users table and logs event
// ↓ Updates local state
await subscriptionStore.syncWithSupabase(userId);
```

### 3. Webhook Processing

```typescript
// RevenueCat sends webhook
POST / api / webhooks / revenuecat;
// ↓ Validates and processes event
await subscriptionService.handleWebhookEvent(eventType, eventData);
// ↓ Updates database and logs analytics
```

### 4. Ad Display Decision

```typescript
// Before showing ads
const shouldShow = await subscriptionService.shouldShowAds(userId);
// ↓ Checks database subscription status
// ↓ Returns false for premium users
if (shouldShow) {
  await adMobService.showInterstitialAd();
}
```

## 🛠️ Key Components

### SubscriptionService

**Location**: `src/services/subscriptionService.ts`

**Key Methods**:

- `syncSubscriptionStatus()`: Syncs RevenueCat data with Supabase
- `getUserSubscription()`: Gets current subscription from database
- `shouldShowAds()`: Determines if user should see ads
- `handleWebhookEvent()`: Processes RevenueCat webhooks
- `logSubscriptionEvent()`: Records subscription events for analytics

### SubscriptionStore (Enhanced)

**Location**: `src/state/subscriptionStore.ts`

**New Features**:

- `shouldShowAds`: Boolean flag from database
- `subscriptionTier`: Current tier from database
- `subscriptionExpiresAt`: Expiration date from database
- `syncWithSupabase()`: Syncs local state with database
- `checkAdStatus()`: Updates ad display status

### AdMobService (Enhanced)

**Location**: `src/services/adMobService.ts`

**New Features**:

- Checks subscription status before showing ads
- Automatically skips ads for premium users
- Logs ad-related events for analytics

## 🎯 Usage Examples

### Check Feature Access

```typescript
import { useFeatureAccess } from '../hooks/useSubscription';

const MyComponent = () => {
  const hasPremiumAccess = useFeatureAccess('premium');

  return (
    <FeatureGate feature="premium">
      <PremiumFeature />
    </FeatureGate>
  );
};
```

### Show Ads Conditionally

```typescript
import { AdBanner } from '../components/ads/AdBanner';

const MyScreen = () => {
  return (
    <View>
      <Content />
      <AdBanner placement="bottom" />
    </View>
  );
};
```

### Get Subscription Status

```typescript
import { useSubscription } from '../hooks/useSubscription';

const ProfileScreen = () => {
  const { tier, isActive, expiresAt, daysRemaining } = useSubscription();

  return (
    <View>
      <Text>Plan: {formatSubscriptionTier(tier)}</Text>
      {daysRemaining && (
        <Text>Expires in {daysRemaining} days</Text>
      )}
    </View>
  );
};
```

## 🔧 Configuration

### Environment Variables

```env
# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY=your_api_key
EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS=premium,pro

# Webhook Secret (for validation)
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret

# AdMob
EXPO_PUBLIC_ADMOB_APP_ID=your_app_id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=your_android_unit_id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=your_ios_unit_id
```

### RevenueCat Webhook Setup

1. Go to RevenueCat Dashboard → Project Settings → Webhooks
2. Add webhook URL: `https://your-app.com/api/webhooks/revenuecat`
3. Select events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`
4. Set webhook secret for validation

## 📈 Analytics & Monitoring

### Subscription Metrics

```sql
-- Get subscription analytics
SELECT * FROM subscription_metrics;

-- Get daily subscription events
SELECT * FROM subscription_analytics
WHERE date >= NOW() - INTERVAL '30 days';
```

### Database Functions

```sql
-- Check user subscription status
SELECT * FROM get_user_subscription_status('user-id');

-- Check if user should see ads
SELECT should_show_ads('user-id');

-- Log subscription event
SELECT log_subscription_event(
  'user-id',
  'subscription_started',
  'premium',
  '{"source": "mobile_app"}'::jsonb
);
```

## 🚨 Error Handling

### Subscription Sync Failures

- App continues to work with cached subscription status
- Background sync retries automatically
- Graceful fallback to showing ads if status unclear

### Webhook Processing Failures

- Events are logged for manual review
- Duplicate events are automatically deduplicated
- Failed webhooks can be replayed

### Ad Display Failures

- Falls back to mock ads in development
- Logs errors for monitoring
- Never blocks app functionality

## 🔒 Security Considerations

### Webhook Validation

```typescript
// Validate webhook signature
const isValid = validateRevenueCatWebhook(payload, signature, secret);
if (!isValid) {
  return res.status(401).json({ error: "Invalid signature" });
}
```

### Row Level Security

```sql
-- Users can only see their own subscription events
CREATE POLICY "Users can view own subscription events"
ON subscription_events FOR SELECT
USING (auth.uid() = user_id);
```

### API Security

- Subscription status checks use authenticated user ID
- No sensitive RevenueCat data exposed to client
- Database functions use SECURITY DEFINER

## 🧪 Testing

### Mock Implementations

- Expo Go: Uses mock RevenueCat and AdMob
- Development: Can toggle between real and mock services
- Testing: Comprehensive test webhook events provided

### Test Scenarios

1. New user registration → Free tier initialization
2. Subscription purchase → Premium upgrade
3. Subscription expiration → Downgrade to free
4. Webhook processing → Database updates
5. Ad display logic → Premium users see no ads

## 📱 Platform Compatibility

### Expo Go

- Mock subscription management
- Mock ad display
- Full database integration
- Perfect for UI/UX testing

### Development Build

- Full RevenueCat integration
- Real AdMob ads
- Complete webhook processing
- Production-ready testing

### Production

- All features enabled
- Real payments and ads
- Full analytics tracking
- Webhook validation

## 🚀 Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] RevenueCat webhook URL set
- [ ] AdMob app configured
- [ ] Row Level Security policies enabled
- [ ] Subscription analytics views created
- [ ] Error monitoring configured
- [ ] Test purchases verified

## 📞 Support & Troubleshooting

### Common Issues

1. **Subscription not syncing**: Check webhook configuration and network connectivity
2. **Ads showing to premium users**: Verify subscription status sync and database queries
3. **Purchase failures**: Check RevenueCat configuration and error logs
4. **Analytics missing**: Verify subscription events are being logged correctly

### Debug Tools

- Subscription status checker: `useSubscription()` hook
- Database queries: Supabase dashboard
- RevenueCat events: RevenueCat dashboard
- Error logs: Application monitoring

This integration ensures perfect synchronization between RevenueCat subscriptions, Supabase database, and AdMob advertising, providing a seamless monetization experience for users while maintaining data consistency and analytics tracking.
