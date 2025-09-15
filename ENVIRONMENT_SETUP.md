# Environment Setup Guide

This comprehensive guide will help you set up all the necessary environment variables for the Locker Room Talk app. Follow the sections below to configure each service.

## Quick Start

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Run the environment validation script:

   ```bash
   npm run verify:env
   ```

3. Follow the guidance provided by the script to set up missing variables.

## 🔴 Critical Configuration (Required)

These services are essential for the app to function properly.

### Supabase (Database & Authentication)

Supabase provides our backend database, authentication, and real-time features.

**Required Variables:**

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Setup Steps:**

1. Go to [https://supabase.com](https://supabase.com) and create an account
2. Create a new project or select an existing one
3. Navigate to **Settings > API** in the sidebar
4. Copy the **Project URL** and add to your `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   ```
5. Copy the **anon/public** key (NOT the service_role key) and add to your `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Troubleshooting:**

- ✅ URL should match format: `https://xxx.supabase.co`
- ✅ Anon key should start with `eyJ` or `sb_publishable_`
- ❌ Never use the `service_role` key in client-side code
- ❌ Don't use keys starting with `sb_secret_` in the client

### Expo Project (Push Notifications)

Required for push notifications to work properly.

**Required Variables:**

- `EXPO_PUBLIC_PROJECT_ID`

**Setup Steps:**

1. Go to [https://expo.dev](https://expo.dev) and sign in
2. Navigate to your project or create a new one
3. Go to project settings and copy the **Project ID**
4. Add to your `.env`:
   ```
   EXPO_PUBLIC_PROJECT_ID=12345678-1234-1234-1234-123456789012
   ```

**Troubleshooting:**

- ✅ Should be UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- ❌ Don't use the project slug/name, use the UUID

## 🟡 Important Configuration (Recommended)

These services enhance the app with monetization and error reporting.

### RevenueCat (Monetization)

Handles in-app purchases and subscriptions across iOS and Android.

**Required Variables:**

- `EXPO_PUBLIC_REVENUECAT_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

**Setup Steps:**

1. Go to [https://app.revenuecat.com](https://app.revenuecat.com) and create an account
2. Create a new project and configure your iOS/Android apps
3. Go to **API Keys** in the sidebar
4. Copy the **Public API Key** and add to your `.env`:
   ```
   EXPO_PUBLIC_REVENUECAT_API_KEY=pub_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
   ```
5. For iOS: Copy the **Apple App Store** key:
   ```
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
   ```
6. For Android: Copy the **Google Play Store** key:
   ```
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
   ```

**Additional Configuration:**

```bash
# Server-side API key (keep secure)
REVENUECAT_API_KEY=sk_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

# Webhook secret for server validation
REVENUECAT_WEBHOOK_SECRET=revenuecat_webhook_secret_here

# Premium entitlements (default is fine)
EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS=premium,pro
```

### Sentry (Error Reporting)

Provides error reporting and performance monitoring.

**Required Variables:**

- `EXPO_PUBLIC_SENTRY_DSN`

**Setup Steps:**

1. Go to [https://sentry.io](https://sentry.io) and create an account
2. Create a new React Native project
3. Copy the **DSN** from the project settings
4. Add to your `.env`:
   ```
   EXPO_PUBLIC_SENTRY_DSN=https://abc123@def456.ingest.sentry.io/123456
   ```

**For Source Maps (Optional):**

```bash
# Organization and project slugs
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug

# Auth token for uploading source maps
SENTRY_AUTH_TOKEN=your_auth_token_here
```

**Performance Monitoring:**

```bash
# Enable performance monitoring
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Sample rates (0.0 to 1.0)
EXPO_PUBLIC_ERROR_SAMPLE_RATE=0.1
EXPO_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.05
```

## 🔵 Optional Configuration

These services provide additional features but aren't required for core functionality.

### AdMob (Advertising)

Google AdMob provides advertising monetization.

**Required Variables:**

- `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`
- `EXPO_PUBLIC_ADMOB_BANNER_IOS`
- `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID`
- `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS`

**Setup Steps:**

1. Go to [https://apps.admob.com](https://apps.admob.com) and sign in
2. Create or select your app
3. Create ad units for each type (banner, interstitial, etc.)
4. Copy the ad unit IDs and add to your `.env`:
   ```
   EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-1234567890123456/1234567890
   EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-1234567890123456/0987654321
   EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-1234567890123456/1111111111
   EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-1234567890123456/2222222222
   ```

**Additional Ad Types:**

```bash
# App Open Ads
EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID=ca-app-pub-1234567890123456/3333333333
EXPO_PUBLIC_ADMOB_APP_OPEN_IOS=ca-app-pub-1234567890123456/4444444444

# Test mode for development
EXPO_PUBLIC_ADMOB_TEST_MODE=true
```

### Firebase (Legacy Support)

Legacy Firebase configuration (mostly replaced by Supabase).

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

### VIBECode Integration (Optional)

```bash
EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY=
EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY=
EXPO_PUBLIC_VIBECODE_PROJECT_ID=
```

## Development vs Production

### Development Environment

For development, you can use test/sandbox versions of services:

```bash
# Use test mode for ads
EXPO_PUBLIC_ADMOB_TEST_MODE=true

# Use development Sentry project
EXPO_PUBLIC_SENTRY_DSN=https://dev-dsn@sentry.io/dev-project

# Lower sample rates for development
EXPO_PUBLIC_ERROR_SAMPLE_RATE=1.0
EXPO_PUBLIC_PERFORMANCE_SAMPLE_RATE=1.0
```

### Production Environment

For production, ensure all services use production keys and proper sample rates:

```bash
# Disable test mode
EXPO_PUBLIC_ADMOB_TEST_MODE=false

# Use production Sentry project
EXPO_PUBLIC_SENTRY_DSN=https://prod-dsn@sentry.io/prod-project

# Optimized sample rates for production
EXPO_PUBLIC_ERROR_SAMPLE_RATE=0.1
EXPO_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.05
```

## Security Best Practices

### ✅ Do's

- ✅ Use `EXPO_PUBLIC_` prefix only for client-safe values
- ✅ Store sensitive server keys as EAS secrets
- ✅ Use different API keys for development and production
- ✅ Regularly rotate API keys and tokens
- ✅ Use anon keys (not secret keys) for Supabase client
- ✅ Enable proper Row Level Security (RLS) in Supabase

### ❌ Don'ts

- ❌ Never commit `.env` files to version control
- ❌ Never use `service_role` keys in client code
- ❌ Never expose secret keys with `EXPO_PUBLIC_` prefix
- ❌ Don't use production keys in development
- ❌ Don't share API keys in screenshots or logs

## Validation & Testing

### Run Environment Validation

```bash
# Validate your environment setup
npm run verify:env

# Check specific service configuration
npm run verify:env -- --service=supabase
```

### Test Service Connections

The app includes built-in health checks. In development mode, check the console for:

```
✅ Supabase connection validated successfully
✅ RevenueCat SDK initialized
✅ Sentry error reporting active
⚠️  AdMob test mode enabled
```

### Completeness Score

The validation script provides a completeness score:

- **90-100%**: Excellent! All critical and most optional services configured
- **70-89%**: Good! Critical services working, some optional features missing
- **Below 70%**: Needs attention! Missing critical configuration

## Troubleshooting

### Common Issues

**"Supabase URL format may be incorrect"**

- ✅ Correct: `https://abcdefgh.supabase.co`
- ❌ Wrong: `https://supabase.com/dashboard/project/abcdefgh`

**"Invalid API key format"**

- ✅ Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- ✅ New format: `sb_publishable_aBcDe...`
- ❌ Secret key: `sb_secret_aBcDe...` (don't use in client!)

**"RevenueCat partially configured"**

- You have some RevenueCat keys but not all platforms
- Add keys for both iOS and Android for full functionality

**"Push notifications not working"**

- Verify `EXPO_PUBLIC_PROJECT_ID` is set correctly
- Check that it's a valid UUID format
- Ensure push notification credentials are configured in Expo dashboard

### Getting Help

1. **Check the validation script output** - It provides specific guidance
2. **Review this setup guide** - All steps are documented here
3. **Check service documentation**:
   - [Supabase Docs](https://supabase.com/docs)
   - [RevenueCat Docs](https://docs.revenuecat.com)
   - [Expo Docs](https://docs.expo.dev)
   - [Sentry Docs](https://docs.sentry.io)
4. **Run health checks** - Check console output for connection status

### Quick Commands Reference

```bash
# Validate environment
npm run verify:env

# Copy template
cp .env.example .env

# Check health (in app console)
environmentValidation.generateStatusReport()

# Clear validation cache
environmentValidation.clearCache()
```

## Checklist

Use this checklist to verify your setup is complete:

### Critical Setup ✅

- [ ] Supabase URL configured and valid format
- [ ] Supabase anon key configured (not secret key)
- [ ] Expo Project ID configured and valid UUID
- [ ] App builds and runs without configuration errors

### Important Setup ✅

- [ ] RevenueCat configured for target platforms
- [ ] Sentry DSN configured for error reporting
- [ ] Error reporting working in development
- [ ] In-app purchases working in test mode

### Optional Setup ✅

- [ ] AdMob configured for advertising
- [ ] Test ads showing correctly
- [ ] Performance monitoring enabled
- [ ] All health checks passing

### Security Review ✅

- [ ] No secret keys exposed in client code
- [ ] `.env` file added to `.gitignore`
- [ ] Different keys for development/production
- [ ] Sensitive keys stored as EAS secrets for production builds

---

**Need help?** Run `npm run verify:env` and follow the guidance provided!
