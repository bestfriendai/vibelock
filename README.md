# LockerRoom - Social Review Platform

A modern React Native application built with Expo SDK 54, featuring sophisticated monetization through RevenueCat subscriptions and AdMob advertising, powered by Supabase backend infrastructure.

## 🏗️ Tech Stack

### Core Technologies

- **Expo SDK 54** with New Architecture disabled for compatibility
- **React Native 0.81.4** with React 18.2.0
- **TypeScript** with strict configuration
- **Supabase** for backend services and real-time features
- **Zustand** for state management

### Monetization & Analytics

- **RevenueCat** - Subscription management and analytics
- **AdMob** - Display advertising with advanced targeting
- **Expo Insights** - Performance and crash analytics

### UI & Design

- **NativeWind** - Tailwind CSS for React Native
- **React Native Reanimated v3.6** - Smooth animations
- **Expo Symbols** - Native system icons
- **Lottie** - Vector animations

### Navigation & Layout

- **React Navigation v7** - Stack, Tab, and Drawer navigation
- **Bottom Sheet** - Modal presentations
- **FlatList** - Optimized list rendering with masonry layout

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (macOS) or Android Emulator
- EAS CLI for production builds (`npm install -g eas-cli`)

### Development Setup

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd locker-room-talk
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Fill in your Supabase, RevenueCat, and other service keys
   ```

3. **Verify Environment**

   ```bash
   npm run verify:env
   ```

4. **Start Development**

   ```bash
   # For Expo Go (limited features)
   npm start

   # For full native development
   npm run ios
   npm run android
   ```

### Environment Variables

Essential environment variables (see `.env.example` for complete list):

```bash
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# RevenueCat (For subscriptions)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key

# Firebase/Expo (For push notifications)
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

## 💰 Monetization Features

### RevenueCat Integration

- **Subscription Management**: Premium tiers with sophisticated paywall
- **Cross-Platform**: Unified subscription state across iOS and Android
- **Analytics**: Revenue tracking and subscriber insights
- **Restore Purchases**: Seamless account recovery

### AdMob Integration

- **Banner Ads**: Smart ad placement with frequency controls
- **Interstitial Ads**: Strategic full-screen ad presentation
- **App Tracking Transparency**: GDPR/CCPA compliant consent management
- **Test Ads**: Safe development environment with test ad units

### Environment-Aware Implementation

The app intelligently detects the runtime environment:

- **Expo Go**: Mock implementations for development
- **Development Build**: Full native module access
- **Production**: Optimized monetization performance

## 🧪 Testing

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run format
```

### Jest Testing

```bash
npm run test
```

### Complete Quality Check

```bash
npm run check
```

## 🏗️ Build & Deployment

### Development Builds

```bash
npm run build:development
```

### Preview Builds

```bash
npm run build:preview
```

### Production Builds

```bash
npm run build:production
```

### App Store Submission

```bash
npm run submit:production
```

### Pre-build Cleanup

```bash
npm run prebuild:clean
```

## 📱 Platform Support

- **iOS 13+** with full native module support
- **Android API 21+** with edge-to-edge UI
- **Web** with progressive enhancement (monetization disabled)

## 🔧 Development Workflow

### Code Quality

- ESLint with TypeScript support
- Prettier formatting
- Git hooks for pre-commit validation

### Environment Detection

The app automatically detects and adapts to different environments:

- Expo Go compatibility mode
- Development build with native modules
- Production optimizations

### Debugging

- Flipper integration for network inspection
- React DevTools compatibility
- Console logging with environment awareness

## 📖 Documentation

- [Monetization Guide](./docs/MONETIZATION.md) - RevenueCat and AdMob integration
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment workflow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run quality checks (`npm run check`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 Scripts Reference

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `start`             | Start Expo development server      |
| `ios`               | Run on iOS simulator               |
| `android`           | Run on Android emulator            |
| `web`               | Run on web browser                 |
| `typecheck`         | TypeScript type checking           |
| `lint`              | ESLint code analysis               |
| `format`            | Prettier code formatting           |
| `check`             | Run all quality checks             |
| `test`              | Run Jest test suite                |
| `verify:env`        | Validate environment configuration |
| `prebuild:clean`    | Clean and rebuild native projects  |
| `build:development` | EAS development build              |
| `build:preview`     | EAS preview build                  |
| `build:production`  | EAS production build               |
| `submit:production` | Submit to app stores               |

## 🔒 Security

- All API keys are environment-specific and not committed to version control
- RevenueCat handles sensitive subscription data
- AdMob implements privacy-compliant advertising
- Supabase manages user authentication and authorization

## 🚨 Troubleshooting

### AutoLayoutView Error ("View config not found for component AutoLayoutView")

This error occurs due to React Native new architecture compatibility issues with certain dependencies. If you encounter this error:

**Immediate Fix:**

1. The app has been configured to disable the new architecture (`newArchEnabled: false` in `app.json`)
2. FlashList has been replaced with FlatList for better compatibility
3. React has been downgraded from 19.1.0 to 18.2.0 for React Native 0.81.4 compatibility
4. React Compiler has been disabled in babel configuration

**Manual Recovery Steps:**

```bash
# Run the automated fix script
bash scripts/fix-architecture-issues.sh

# Or run individual commands:
npx expo prebuild --clean
npm install
cd ios && pod install  # iOS only
npm start -- --clear
```

**Common Causes:**

- React Native new architecture enabled with incompatible dependencies
- Version mismatches between React, React Native, and related packages
- FlashList compatibility issues with Fabric renderer
- React Compiler incompatibility with older React Native versions

**When to Re-enable New Architecture:**

- All dependencies support the new architecture
- React Native is updated to 0.74+ with proper Fabric support
- FlashList or alternative has full new architecture compatibility

### Component Registration Errors

If you see errors about missing native modules or component registration:

1. **Clear caches:**

   ```bash
   npx expo prebuild --clean
   npm run clean:install
   ```

2. **Verify environment:**

   ```bash
   npm run verify:env
   npm run verify:setup
   ```

3. **Check native dependencies:**
   - Ensure all Expo modules are compatible with SDK 54
   - Verify React Native version compatibility
   - Check for any manually linked native modules

### Performance Issues with Lists

The app now uses FlatList instead of FlashList for better stability:

- **FlatList Optimizations:** Enhanced with performance props and responsive calculations
- **Memory Management:** Improved with `removeClippedSubviews` and windowing
- **Responsive Design:** Better column calculations for different screen sizes

## 📞 Support

For questions about the codebase or deployment issues, please create an issue in the repository with detailed information about your environment and the problem you're experiencing.

---

Built with ❤️ using Expo and React Native
