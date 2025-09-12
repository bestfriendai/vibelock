# Deployment Guide

Complete production deployment guide for LockerRoom, covering EAS builds, app store submissions, and post-deployment monitoring.

## 🚀 Deployment Overview

The app uses **Expo Application Services (EAS)** for building and deploying to both iOS App Store and Google Play Store with automated CI/CD workflows.

### Deployment Architecture
- **GitHub Actions** for continuous integration and automated builds
- **EAS Build** for native iOS and Android compilation
- **EAS Submit** for automated app store submissions
- **Environment-specific configurations** for different deployment stages

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] All environment variables configured in EAS Secrets
- [ ] RevenueCat products created and configured
- [ ] AdMob app and ad units set up
- [ ] Supabase backend configured and deployed
- [ ] App Store Connect and Google Play Console configured

### 2. Configuration Verification
- [ ] `app.json` bundle identifiers match app store listings
- [ ] `eas.json` build profiles configured correctly
- [ ] Environment variables documented in `.env.example`
- [ ] All API keys and secrets stored securely

### 3. Quality Assurance
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Linting passes without errors (`npm run lint`)
- [ ] Manual testing on physical devices completed

## 🔧 EAS Configuration

### Build Profiles (`eas.json`)

#### Development Profile
```json
{
  "development": {
    "developmentClient": true,
    "distribution": "internal",
    "ios": { "resourceClass": "m-medium" },
    "android": { "resourceClass": "m-medium" }
  }
}
```
- **Purpose**: Internal testing with development client
- **Distribution**: Internal only
- **Features**: Full debugging, hot reload, development tools

#### Preview Profile
```json
{
  "preview": {
    "distribution": "internal",
    "ios": { "resourceClass": "m-medium", "simulator": true },
    "android": { "resourceClass": "m-medium" }
  }
}
```
- **Purpose**: Beta testing and stakeholder previews
- **Distribution**: TestFlight (iOS) and internal distribution (Android)
- **Features**: Production-like but with internal distribution

#### Production Profile
```json
{
  "production": {
    "autoIncrement": true,
    "ios": { "resourceClass": "m-medium" },
    "android": { "resourceClass": "m-medium" }
  }
}
```
- **Purpose**: App Store and Google Play releases
- **Auto-increment**: Build numbers automatically managed
- **Features**: Full production optimization

## 🏗️ Build Process

### Local Development Builds

#### Prerequisites Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Verify project configuration
eas whoami
eas build:list --platform all --status finished
```

#### Development Build (Internal Testing)
```bash
# Clean rebuild (recommended for major changes)
npm run prebuild:clean

# Build for all platforms
npm run build:development

# Platform-specific builds
eas build --profile development --platform ios
eas build --profile development --platform android
```

#### Preview Build (Beta Testing)
```bash
# For TestFlight and beta distribution
npm run build:preview

# Monitor build progress
eas build:list --status in-progress
```

#### Production Build (App Store Ready)
```bash
# Final production build
npm run build:production

# Check build status
eas build:view [build-id]
```

### Automated Builds (GitHub Actions)

#### CI/CD Pipeline Triggers
- **Push to main**: Automatic preview builds
- **Tagged releases** (`v*`): Production builds with app store submission
- **Manual dispatch**: Custom builds with selected profiles

#### Build Workflow (`build.yml`)
```yaml
on:
  workflow_dispatch:
    inputs:
      profile: ['development', 'preview', 'production']
      platform: ['all', 'ios', 'android']
      submit: [true, false]
  push:
    tags: ['v*']
```

## 📱 App Store Configuration

### iOS App Store Connect Setup

#### 1. App Information
- **Bundle ID**: `com.lockerroom.app`
- **App Name**: LockerRoom
- **Category**: Social Networking
- **Content Rating**: 17+ (Social Features)

#### 2. Pricing and Availability
- **Price**: Free with In-App Purchases
- **Availability**: Worldwide
- **Release**: Manual release after approval

#### 3. In-App Purchases
```
Premium Monthly Subscription
- Product ID: premium_monthly
- Price: $9.99/month
- Auto-renewable: Yes

Premium Annual Subscription  
- Product ID: premium_annual
- Price: $99.99/year
- Auto-renewable: Yes
```

#### 4. App Privacy
- **Data Collection**: User profile, usage analytics, purchase history
- **Data Usage**: Personalization, analytics, advertising
- **Third-party SDKs**: RevenueCat, AdMob, Supabase

### Android Google Play Console Setup

#### 1. Store Listing
- **Package Name**: `com.lockerroom.app`
- **App Category**: Social
- **Content Rating**: Teen (Social Features)
- **Target Audience**: 16+

#### 2. Monetization Setup
- **Pricing**: Free
- **In-app Products**: Subscriptions configured to match iOS
- **Google Play Billing**: Enabled with proper subscription setup

#### 3. Release Management
- **Release Tracks**: Internal Testing → Closed Testing → Open Testing → Production
- **Rollout Strategy**: Gradual rollout starting at 5%

## 🔐 Environment Variables Management

### Development Environment
```bash
# Local .env file (never committed)
EXPO_PUBLIC_SUPABASE_URL=your_dev_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_test_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_test_android_key
```

### Production Environment (EAS Secrets)
```bash
# Set production secrets securely
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-prod-project.supabase.co"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_production_anon_key"
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "your_production_ios_key"
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "your_production_android_key"

# List all secrets
eas secret:list
```

### CI/CD Secrets (GitHub)
```bash
# Required GitHub Actions secrets
EXPO_TOKEN                           # EAS authentication token
APP_STORE_CONNECT_API_KEY           # iOS submission credentials
APP_STORE_CONNECT_KEY_ID            # Apple API key ID  
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY     # Android submission credentials
EXPO_APPLE_APP_SPECIFIC_PASSWORD    # iOS app-specific password
```

## 🚢 Submission Process

### iOS App Store Submission

#### Automated Submission (Recommended)
```bash
# Via GitHub Actions
git tag v1.0.0
git push origin v1.0.0

# Via EAS CLI
npm run submit:production
```

#### Manual Submission Steps
1. **Build Upload**: EAS automatically uploads build to App Store Connect
2. **Build Processing**: Wait for Apple's processing (15-60 minutes)
3. **TestFlight Review**: Internal testing (optional)
4. **App Store Review**: Submit for review (1-7 days)
5. **Release**: Manual or automatic release post-approval

#### Submission Configuration (`eas.json`)
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "trappat@gmail.com"
      }
    }
  }
}
```

### Android Google Play Submission

#### Automated Submission
```bash
# Configure service account key
eas secret:create --name GOOGLE_PLAY_SERVICE_ACCOUNT_KEY --value "$(cat service-account-key.json)"

# Submit to Google Play
eas submit --platform android --profile production
```

#### Release Track Strategy
1. **Internal Testing**: Team validation (immediate)
2. **Closed Testing**: Beta user group (immediate)
3. **Open Testing**: Public beta (immediate)
4. **Production**: Gradual rollout (2-3 hours review)

## 📊 Post-Deployment Monitoring

### Application Performance Monitoring

#### Expo Insights
- **Crash reporting** with stack traces
- **Performance metrics** (app launch time, bundle size)
- **User engagement** tracking

#### Third-Party Analytics
- **RevenueCat**: Subscription performance and revenue metrics
- **AdMob**: Ad performance and revenue optimization
- **Supabase**: Backend performance and database metrics

### Key Metrics to Monitor

#### Technical Metrics
- **Crash Rate**: < 0.1% for good user experience
- **App Launch Time**: < 3 seconds for optimal UX
- **Bundle Size**: Monitor growth, optimize when necessary
- **API Response Times**: < 500ms for good performance

#### Business Metrics
- **Daily/Monthly Active Users** (DAU/MAU)
- **Subscription Conversion Rate** (target: 2-5%)
- **Ad Revenue per User** (ARPU)
- **User Retention** (Day 1, 7, 30)

### Monitoring Tools Setup

#### Expo Insights Configuration
```typescript
// App.tsx - Automatically enabled in production builds
import { enableExpoInsights } from 'expo-insights';

if (!__DEV__) {
  enableExpoInsights();
}
```

#### Error Boundaries
```typescript
// Comprehensive error tracking
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}) {
  // Report error to monitoring service
  reportError(error);
  return <ErrorScreen onRetry={resetErrorBoundary} />;
}
```

## 🔄 Release Management

### Version Management Strategy

#### Semantic Versioning (SemVer)
- **Major (1.0.0)**: Breaking changes, major feature releases
- **Minor (1.1.0)**: New features, significant updates
- **Patch (1.1.1)**: Bug fixes, small improvements

#### Build Number Strategy
- **iOS**: Auto-incremented by EAS Build
- **Android**: `versionCode` auto-incremented by EAS Build
- **Marketing Version**: Manually managed in `app.json`

### Release Cadence
- **Major Releases**: Quarterly (seasonal updates)
- **Minor Releases**: Monthly (feature additions)
- **Patch Releases**: As needed (critical bug fixes)
- **Hotfixes**: Emergency releases (critical issues)

### Release Checklist

#### Pre-Release
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Beta testing feedback addressed
- [ ] App store metadata updated

#### Release Execution
- [ ] Tag release in Git
- [ ] Trigger automated build and submission
- [ ] Monitor build progress
- [ ] Verify successful app store upload
- [ ] Update release notes

#### Post-Release
- [ ] Monitor crash reports
- [ ] Track performance metrics
- [ ] Check user reviews
- [ ] Monitor revenue impact
- [ ] Plan next release cycle

## 🚨 Troubleshooting

### Common Build Issues

#### iOS Build Failures
```bash
# Certificate issues
eas credentials:list
eas build --clear-cache

# Xcode version issues  
# Check EAS documentation for supported versions

# Bundle identifier mismatch
# Verify app.json matches App Store Connect
```

#### Android Build Failures
```bash
# Gradle issues
eas build --clear-cache --platform android

# Google Services configuration
# Verify google-services.json is properly configured

# Signing key issues
eas credentials:list --platform android
```

### Submission Issues

#### iOS Rejection Reasons
- **App Privacy**: Ensure privacy manifest is complete
- **In-App Purchases**: Verify subscription setup matches RevenueCat
- **Content Guidelines**: Ensure compliance with App Store Review Guidelines

#### Android Rejection Reasons
- **Target SDK**: Ensure targeting latest required SDK version
- **Permissions**: Justify all requested permissions
- **Content Rating**: Ensure proper content rating disclosure

### Performance Issues

#### Bundle Size Optimization
```bash
# Analyze bundle composition
npx expo export --dump-assetmap

# Remove unused dependencies
npm run check:unused-deps

# Enable Hermes engine (Android)
# Configure in app.json android.jsEngine: "hermes"
```

#### Runtime Performance
```bash
# Profile app performance
# Use React DevTools Profiler
# Monitor with Expo Insights

# Optimize images
# Use expo-image with caching
# Implement lazy loading for lists
```

## 📞 Support & Resources

### Official Documentation
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://developer.apple.com/app-store-connect/)
- [Google Play Console](https://support.google.com/googleplay/android-developer/)

### Support Channels
- **Expo Forums**: Community support and troubleshooting
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time community assistance
- **Documentation**: Comprehensive guides and API references

### Emergency Procedures
1. **Critical Bug**: Prepare hotfix release immediately
2. **App Store Issues**: Contact Apple/Google developer support
3. **Service Outages**: Implement graceful degradation
4. **Security Issues**: Follow incident response protocol

---

This deployment guide ensures reliable, scalable production deployments with comprehensive monitoring and support procedures. Regular review and updates of deployment processes help maintain deployment reliability and team efficiency.