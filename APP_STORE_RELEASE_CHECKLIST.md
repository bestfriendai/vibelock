# App Store Release Checklist for Loccc

## 🔑 Required API Keys & Service Setup

### 1. Supabase (Backend - REQUIRED)

```bash
# Create account at https://supabase.com
# Create new project and get credentials

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJS... # Your anon key

# For Edge Functions (AI services)
# In Supabase Dashboard > Settings > Secrets
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROK_API_KEY=xai-...
```

### 2. Firebase (Push Notifications & Analytics - REQUIRED)

```bash
# Create project at https://console.firebase.google.com
# Download google-services.json (Android) and GoogleService-Info.plist (iOS)

# Android Setup:
1. Place google-services.json in project root
2. Upload to EAS Secrets for production:
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json

# iOS Setup:
1. Add GoogleService-Info.plist to ios/ folder
2. Add to Xcode project

# Environment Variables (optional if using Supabase for everything):
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. RevenueCat (In-App Purchases - REQUIRED for monetization)

```bash
# Create account at https://www.revenuecat.com
# Create iOS and Android apps

EXPO_PUBLIC_REVENUECAT_API_KEY=public_key_here
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...

# For webhook validation (server-side):
REVENUECAT_API_KEY=secret_key_here
REVENUECAT_WEBHOOK_SECRET=webhook_secret_here

# Configure products in App Store Connect and Google Play Console
# Link them in RevenueCat dashboard
```

### 4. AdMob (Ads - REQUIRED for ad revenue)

```bash
# Create account at https://admob.google.com
# Create ad units for each platform

# App IDs (already in app.config.js):
iOS: ca-app-pub-9512493666273460~7181904608
Android: ca-app-pub-9512493666273460~4548589138

# Ad Unit IDs:
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-9512493666273460/4655851607
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-9512493666273460/3837555963
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-9512493666273460/4188909755
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-9512493666273460/2783494598
EXPO_PUBLIC_ADMOB_APP_OPEN_IOS=ca-app-pub-9512493666273460/6722739608
EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID=ca-app-pub-9512493666273460/9249664748

# For testing (set to false for production):
EXPO_PUBLIC_ADMOB_TEST_MODE=false
```

### 5. Sentry (Error Monitoring - HIGHLY RECOMMENDED)

```bash
# Create account at https://sentry.io
# Create new project

EXPO_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=sntrys_... # For source map uploads

# Upload auth token to EAS:
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value your_token_here
```

### 6. Expo Push Notifications (REQUIRED)

```bash
# Get project ID from Expo dashboard
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# For push notifications to work:
1. iOS: Configure push certificates in Apple Developer Portal
2. Android: FCM server key from Firebase Console
3. Upload credentials to Expo:
   eas credentials
```

### 7. Google Play Store Setup (Android - REQUIRED)

```bash
# Create service account for automated deployment
1. Go to Google Play Console > Settings > API Access
2. Create service account
3. Download JSON key file
4. Upload to EAS:
   eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY --type file --value ./service-account-key.json
```

### 8. Apple App Store Setup (iOS - REQUIRED)

```bash
# App Store Connect API Key for automation
1. Go to App Store Connect > Users and Access > Keys
2. Create API Key with App Manager role
3. Download .p8 file
4. Configure in eas.json:
   "submit": {
     "ios": {
       "appleId": "your@email.com",
       "ascAppId": "123456789",
       "appleTeamId": "YOUR_TEAM_ID"
     }
   }
```

### 9. AI Services (Optional - via Supabase Edge Functions)

```bash
# These should ONLY be set in Supabase Dashboard > Settings > Secrets
# NEVER expose these in client code

# OpenAI (GPT models)
supabase secrets set OPENAI_API_KEY=sk-...

# Anthropic (Claude)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# Grok (X.AI)
supabase secrets set GROK_API_KEY=xai-...

# The client app calls your Supabase Edge Function which securely uses these keys
```

### 10. Environment Files Setup

```bash
# Create three environment files:

# .env.development (for local development)
cp .env.example .env.development
# Fill with development/test keys

# .env.staging (for TestFlight/Internal Testing)
cp .env.example .env.staging
# Fill with staging keys

# .env.production (for App Store release)
cp .env.example .env.production
# Fill with production keys
# NEVER commit this file!

# Add to .gitignore:
.env*
!.env.example
```

### 11. EAS Build Configuration

```bash
# Upload all secrets to EAS for production builds:

# Required secrets:
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "appl_..."
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "goog_..."
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sntrys_..."
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json

# Verify secrets:
eas secret:list
```

### 12. Service Configuration Checklist

#### Supabase Setup:

- [ ] Create project
- [ ] Enable Authentication
- [ ] Configure RLS policies
- [ ] Set up Storage buckets
- [ ] Deploy Edge Functions for AI
- [ ] Configure Rate Limiting
- [ ] Enable Realtime

#### Firebase Setup:

- [ ] Create project
- [ ] Enable Cloud Messaging (FCM)
- [ ] Download config files
- [ ] Configure Analytics
- [ ] Set up Crashlytics

#### RevenueCat Setup: ✅ COMPLETED

- [x] Create account - LockerRoom project created
- [x] Add iOS app - appbbff2f8dd5 (com.lockerroomtalk.app)
- [x] Add Android app - app360535eb49 (com.lockerroomtalk.app)
- [x] Configure API keys:
  - iOS: `appl_CyjOqIadlWZmncacXcBdlnsJlvU`
  - Android: `goog_lPWImthqDCqkfMZpVFPUPjJGeci`
- [x] Create entitlement - `premium_features`
- [x] Create default offering - `ofrng42cff5f13e`
- [x] RevenueCat MCP integrated in Claude Desktop
- [ ] Create products in App Store Connect:
  - `com.lockerroomtalk.premium.monthly` ($9.99)
  - `com.lockerroomtalk.premium.annual` ($95.99)
  - `com.lockerroomtalk.premium.lifetime` ($199.99)
- [ ] Create products in Google Play Console:
  - `monthly_premium` ($9.99)
  - `annual_premium` ($95.99)
  - `lifetime_premium` ($199.99)
- [ ] Import products to RevenueCat
- [ ] Create packages ($rc_monthly, $rc_annual, $rc_lifetime)
- [ ] Configure webhook endpoint
- [ ] Test sandbox purchases

#### AdMob Setup:

- [ ] Verify account (takes 24-48h)
- [ ] Create ad units
- [ ] Link to app stores
- [ ] Configure mediation
- [ ] Set up test devices
- [ ] Review ad policies

#### App Store Connect:

- [ ] Create app (Bundle ID: com.lockerroomtalk.app)
- [ ] Configure In-App Purchases:
  - [ ] Monthly: com.lockerroomtalk.premium.monthly ($9.99)
  - [ ] Annual: com.lockerroomtalk.premium.annual ($95.99)
  - [ ] Lifetime: com.lockerroomtalk.premium.lifetime ($199.99)
- [ ] Set up TestFlight
- [ ] Add app information
- [ ] Configure pricing (Free with In-App Purchases)

#### Google Play Console:

- [ ] Create app (Package: com.lockerroomtalk.app)
- [ ] Configure In-App Products:
  - [ ] Monthly: monthly_premium ($9.99)
  - [ ] Annual: annual_premium ($95.99)
  - [ ] Lifetime: lifetime_premium ($199.99)
- [ ] Set up Internal Testing
- [ ] Add store listing
- [ ] Configure pricing (Free with In-App Purchases)

## 🚨 CRITICAL BLOCKERS - Must Fix Before Submission

### 1. Security Issues (Immediate Rejection Risk)

These will cause automatic rejection:

#### Remove Hardcoded Credentials

```bash
# Critical files to fix:
- google-services.json (contains exposed API keys)
- Remove ALL console.log statements with sensitive data
- Remove any EXPO_PUBLIC_ variables with keys
```

**Fix:**

```typescript
// Move all credentials to environment variables
// .env.production
FIREBASE_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here

// Never commit .env files
echo ".env*" >> .gitignore
```

#### Implement Secure Storage

```typescript
// Replace AsyncStorage with SecureStore for sensitive data
import * as SecureStore from "expo-secure-store";

// Before (INSECURE)
await AsyncStorage.setItem("userToken", token);

// After (SECURE)
await SecureStore.setItemAsync("userToken", token);
```

### 2. Privacy & Permissions

#### Create Privacy Policy (REQUIRED)

```markdown
# Required sections:

1. Data Collection - What data you collect
2. Data Usage - How you use the data
3. Data Sharing - Third parties (RevenueCat, AdMob, Supabase)
4. Data Retention - How long you keep data
5. User Rights - Deletion requests, access rights
6. Children's Privacy - COPPA compliance
7. Contact Information - Support email

# Host on your website or use services like:

- TermsFeed
- Termly
- iubenda
```

#### Update App.json with Privacy URLs

```json
{
  "expo": {
    "ios": {
      "privacyManifests": {
        "NSPrivacyAccessedAPITypes": [
          {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
            "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
          }
        ]
      },
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to allow you to take photos for reviews and profile pictures.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photo library to let you select images for reviews and profile pictures.",
        "NSLocationWhenInUseUsageDescription": "This app uses your location to show nearby reviews and connect you with local chat rooms.",
        "NSMicrophoneUsageDescription": "This app uses the microphone to record audio messages in chat.",
        "NSUserTrackingUsageDescription": "This app uses tracking to provide personalized ads and improve your experience."
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "RECORD_AUDIO"
      ]
    }
  }
}
```

### 3. App Store Metadata Requirements

#### Required Assets

```markdown
# Screenshots (REQUIRED for each device type)

- iPhone 6.7" (1290 x 2796) - iPhone 15 Pro Max
- iPhone 6.5" (1284 x 2778) - iPhone 14 Plus
- iPhone 5.5" (1242 x 2208) - iPhone 8 Plus
- iPad 12.9" (2048 x 2732) - iPad Pro

# Minimum 3, maximum 10 screenshots per device type

# App Icon

- 1024x1024px PNG without alpha channel
- No transparency, no rounded corners
```

#### App Store Connect Information

```markdown
# Required Fields:

1. App Name: "Loccc" (30 characters max)
2. Subtitle: "Local Reviews & Chat Rooms" (30 characters max)
3. Primary Category: Social Networking
4. Secondary Category: Lifestyle
5. Age Rating: 17+ (due to user-generated content)
6. Keywords: "local,reviews,chat,social,community,location,nearby" (100 chars max)

# Description (4000 characters max):

"Discover and share authentic local experiences with Loccc..."

# What's New (4000 characters max):

"Version 1.0.0

- Initial release
- Local review sharing
- Location-based chat rooms
- Media sharing capabilities"

# Support URL: https://yourwebsite.com/support

# Marketing URL: https://yourwebsite.com

# Privacy Policy URL: https://yourwebsite.com/privacy (REQUIRED)
```

### 4. Content & Safety Requirements

#### Implement Content Moderation

```typescript
// Add reporting functionality (REQUIRED for UGC apps)
const reportContent = async (contentId: string, reason: string) => {
  await supabase.from("reports").insert({
    content_id: contentId,
    reason,
    reporter_id: currentUser.id,
    status: "pending",
  });
};

// Add blocking functionality
const blockUser = async (userId: string) => {
  await supabase.from("blocks").insert({
    blocker_id: currentUser.id,
    blocked_id: userId,
  });
};
```

#### Age Gate Implementation

```typescript
// Required for 17+ apps
const AgeVerificationScreen = () => {
  return (
    <View>
      <Text>You must be 17 or older to use this app</Text>
      <Button title="I am 17 or older" onPress={confirmAge} />
      <Button title="I am under 17" onPress={denyAccess} />
    </View>
  );
};
```

### 5. Technical Requirements

#### iOS Specific Fixes

```bash
# Update iOS deployment target
cd ios
# Edit Podfile
platform :ios, '13.4' # Minimum for App Store

# Update Info.plist
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

# Enable App Transport Security
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
</dict>
```

#### Android Specific Fixes

```gradle
// android/app/build.gradle
android {
    compileSdkVersion 34 // Latest stable
    defaultConfig {
        applicationId "com.yourcompany.loccc"
        minSdkVersion 23 // Android 6.0 minimum
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    // Enable ProGuard for release
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 6. Performance Requirements

#### Crash-Free Rate

```typescript
// Implement crash reporting
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
  beforeSend(event) {
    // Remove sensitive data
    delete event.user?.email;
    return event;
  }
});

// Wrap app with error boundary
<Sentry.ErrorBoundary fallback={ErrorFallback}>
  <App />
</Sentry.ErrorBoundary>
```

#### App Size Optimization

```bash
# iOS: Enable bitcode
# In Xcode: Build Settings > Enable Bitcode = Yes

# Android: Enable App Bundle
cd android
./gradlew bundleRelease # Creates .aab file instead of .apk

# Remove unused assets
npx react-native-asset-cleaner

# Optimize images
npm install -g imageoptim-cli
imageoptim 'assets/**/*.png'
```

### 7. Testing Requirements

#### Required Testing Before Submission

```bash
# 1. Test on real devices (not just simulators)
# Minimum devices to test:
- iPhone 15 Pro (latest)
- iPhone 12 (common)
- iPhone SE (smallest screen)
- iPad (if supporting tablets)

# 2. Test all user flows
- Sign up flow
- Sign in flow
- Password reset
- All main features
- In-app purchases
- Push notifications
- Deep linking

# 3. Network conditions
- Test on 3G/4G/5G
- Test offline mode
- Test with poor connection

# 4. TestFlight Beta Testing
eas build --platform ios --profile preview
eas submit --platform ios
```

### 8. Legal & Compliance

#### Terms of Service

```markdown
# Required sections:

1. User Accounts & Registration
2. User Content & Conduct Rules
3. Intellectual Property
4. Disclaimers & Limitations
5. Termination
6. Governing Law
```

#### COPPA Compliance (if allowing users under 13)

```typescript
// If not allowing children, add check:
const MIN_AGE = 17; // or 13 depending on your policy

// In registration
if (calculateAge(birthDate) < MIN_AGE) {
  throw new Error("You must be 17 or older to use this app");
}
```

## 📋 Pre-Submission Checklist

### Build Configuration

- [ ] Remove all console.log statements
- [ ] Set DEBUG flags to false
- [ ] Update version numbers in app.json
- [ ] Generate production builds with EAS
- [ ] Test production build on real devices

### App Store Connect Setup

- [ ] Create app in App Store Connect
- [ ] Upload screenshots for all required sizes
- [ ] Write compelling app description
- [ ] Set appropriate age rating (questionnaire)
- [ ] Configure pricing (free/paid)
- [ ] Set availability (countries)
- [ ] Add privacy policy URL
- [ ] Add support URL
- [ ] Configure in-app purchases (if any)

### Submission Commands

```bash
# iOS Build & Submit
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android Build & Submit
eas build --platform android --profile production
eas submit --platform android --latest
```

## 🔧 Quick Fixes Script

Create `scripts/prepare-for-store.js`:

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 1. Remove console.logs
const removeConsoleLogs = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory() && !filePath.includes("node_modules")) {
      removeConsoleLogs(filePath);
    } else if (file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".tsx")) {
      let content = fs.readFileSync(filePath, "utf8");
      content = content.replace(/console\.(log|debug|info|warn)\([^)]*\);?/g, "");
      fs.writeFileSync(filePath, content);
    }
  });
};

// 2. Update version
const updateVersion = () => {
  const appJson = JSON.parse(fs.readFileSync("app.json", "utf8"));
  appJson.expo.version = "1.0.0";
  appJson.expo.ios.buildNumber = "1";
  appJson.expo.android.versionCode = 1;
  fs.writeFileSync("app.json", JSON.stringify(appJson, null, 2));
};

// 3. Check required files
const checkRequiredFiles = () => {
  const required = ["privacy-policy.md", "terms-of-service.md", "assets/icon-1024.png", ".env.production"];

  required.forEach((file) => {
    if (!fs.existsSync(file)) {
      console.error(`❌ Missing required file: ${file}`);
    } else {
      console.log(`✅ Found: ${file}`);
    }
  });
};

// Run preparations
console.log("🚀 Preparing app for store submission...\n");
removeConsoleLogs("./src");
updateVersion();
checkRequiredFiles();
console.log("\n✅ Preparation complete!");
```

## 🚀 Submission Timeline

### Day 1-2: Critical Fixes

1. Remove hardcoded credentials
2. Implement secure storage
3. Add content reporting
4. Fix permission descriptions
5. ✅ RevenueCat integration (COMPLETED)
   - API keys configured
   - Service implementation ready
   - Webhook handler created
   - Database schema deployed

### Day 3-4: Assets & Metadata

1. Create screenshots
2. Write descriptions
3. Create privacy policy
4. Setup App Store Connect

### Day 5: Testing

1. TestFlight internal testing
2. Fix any crashes
3. Performance testing
4. Final review

### Day 6: Submission

1. Upload build to App Store Connect
2. Submit for review
3. Monitor for feedback

## ⚠️ Common Rejection Reasons to Avoid

1. **Crashes on launch** - Test thoroughly
2. **Broken features** - Ensure all features work
3. **Placeholder content** - Remove all Lorem Ipsum
4. **Missing privacy policy** - Required for all apps
5. **Inappropriate content** - Implement moderation
6. **Misleading metadata** - Be accurate in descriptions
7. **Incomplete features** - Don't mention "coming soon"
8. **Third-party login only** - Offer email/password option
9. **Requesting unnecessary permissions** - Only ask for what you use
10. **Copyright violations** - Ensure all content is original or licensed

## 📱 Post-Submission

### Expected Review Time

- **Initial Review**: 24-48 hours typically
- **If Rejected**: Fix issues and resubmit (24-48 hours again)
- **Updates**: Usually faster (12-24 hours)

### After Approval

1. Monitor crash reports in App Store Connect
2. Respond to user reviews
3. Plan your first update
4. Setup analytics to track user behavior
5. Monitor performance metrics

## Emergency Contacts & Resources

- **Apple Developer Support**: https://developer.apple.com/support/
- **Google Play Console Help**: https://support.google.com/googleplay/android-developer
- **Expo Support**: https://expo.dev/contact
- **App Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/

## Final Pre-Flight Check ✈️

```bash
# Run this before submission
npm run test
npm run lint
npm run type-check
eas build --platform all --profile production --local
# Test the production build on real devices!
```

## API Keys Quick Reference Table

| Service               | Required              | Purpose                 | Setup Time                 |
| --------------------- | --------------------- | ----------------------- | -------------------------- |
| Supabase              | ✅ YES                | Backend, Database, Auth | 30 mins                    |
| Firebase              | ✅ YES                | Push Notifications      | 1 hour                     |
| RevenueCat            | ✅ DONE               | In-App Purchases        | ✅ Configured              |
| AdMob                 | ✅ YES                | Ad Revenue              | 24-48 hours (verification) |
| Sentry                | ⚠️ HIGHLY RECOMMENDED | Error Tracking          | 30 mins                    |
| Expo                  | ✅ YES                | Build & Push            | 1 hour                     |
| App Store Connect     | ✅ YES (iOS)          | iOS Distribution        | 2-3 hours                  |
| Google Play Console   | ✅ YES (Android)      | Android Distribution    | 2-3 hours                  |
| OpenAI/Anthropic/Grok | ❌ Optional           | AI Features             | 30 mins each               |

## Pre-Submission API Verification Script

Create `scripts/verify-api-keys.js`:

```javascript
#!/usr/bin/env node

const fs = require("fs");
require("dotenv").config();

const REQUIRED_KEYS = {
  // Critical - App won't work without these
  CRITICAL: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_PROJECT_ID"],

  // Required for monetization
  MONETIZATION: [
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    "EXPO_PUBLIC_ADMOB_BANNER_IOS",
    "EXPO_PUBLIC_ADMOB_BANNER_ANDROID",
  ],

  // Required for production
  PRODUCTION: ["EXPO_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN"],

  // Required files
  FILES: ["google-services.json", "privacy-policy.md", "terms-of-service.md"],
};

console.log("🔍 Verifying API Keys and Configuration...\n");

let hasErrors = false;

// Check environment variables
Object.entries(REQUIRED_KEYS).forEach(([category, keys]) => {
  if (category === "FILES") return;

  console.log(`\n${category} Keys:`);
  keys.forEach((key) => {
    const value = process.env[key];
    if (!value) {
      console.log(`  ❌ ${key} - MISSING`);
      hasErrors = true;
    } else {
      const masked = value.substring(0, 10) + "...";
      console.log(`  ✅ ${key} - Set (${masked})`);
    }
  });
});

// Check required files
console.log("\nRequired Files:");
REQUIRED_KEYS.FILES.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file} - Found`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Service-specific validations
console.log("\n\nService Validations:");

// Validate Supabase URL format
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (supabaseUrl && !supabaseUrl.includes(".supabase.co")) {
  console.log("  ⚠️  Supabase URL might be invalid");
}

// Validate AdMob format
const admobBanner = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;
if (admobBanner && !admobBanner.startsWith("ca-app-pub-")) {
  console.log("  ⚠️  AdMob ID format might be invalid");
}

// Check build configuration
if (!process.env.EAS_BUILD) {
  console.log("\n⚠️  Not running in EAS Build context - some checks skipped");
}

if (hasErrors) {
  console.log("\n\n❌ Missing required configuration. Please fix before submission!");
  process.exit(1);
} else {
  console.log("\n\n✅ All required API keys and files are configured!");
  console.log("Ready for app store submission! 🚀");
}
```

Run before submission:

```bash
node scripts/verify-api-keys.js
```

Remember: It's better to delay submission by a day to fix issues than to get rejected and wait another week for re-review!
