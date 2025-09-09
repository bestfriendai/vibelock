# iOS Deployment Checklist - LockerRoom App

## ✅ Pre-Deployment Setup Complete

### App Configuration
- [x] Bundle ID configured: com.lockerroomtalk.app
- [x] App icons and splash screen ready
- [x] Privacy permissions configured
- [x] RevenueCat integration complete
- [x] AdMob integration ready
- [x] EAS build configuration updated

### Required Next Steps

#### 1. Apple Developer Account Setup
- [ ] Ensure Apple Developer Program membership ($99/year)
- [ ] Add trappat@gmail.com to Apple Developer account
- [ ] Create App Store Connect app record
- [ ] Configure App Store Connect team settings

#### 2. Certificates and Provisioning
```bash
# EAS will handle certificates automatically, but you can also manage manually:
npx eas credentials -p ios
```

#### 3. Build for Production
```bash
# Build for App Store submission
npx eas build --platform ios --profile production

# Build for TestFlight (internal testing)
npx eas build --platform ios --profile preview
```

#### 4. App Store Connect Configuration
- [ ] Create app record in App Store Connect
- [ ] Configure app metadata (description, keywords, categories)
- [ ] Add app screenshots (required sizes)
- [ ] Set up In-App Purchases (RevenueCat products)
- [ ] Configure App Store Review information

#### 5. In-App Purchase Setup
Create these products in App Store Connect:
- [ ] com.lockerroomtalk.app.premium.monthly ($9.99/month)
- [ ] com.lockerroomtalk.app.premium.annual ($99.99/year)

#### 6. TestFlight Testing
```bash
# Submit to TestFlight for internal testing
npx eas submit --platform ios --profile production
```

#### 7. App Store Submission
- [ ] Complete App Store Connect metadata
- [ ] Submit for App Store review
- [ ] Respond to any review feedback
- [ ] Release to App Store

## 🚀 Quick Commands

### Development Build (for testing RevenueCat)
```bash
npx eas build --platform ios --profile development
```

### Production Build (for App Store)
```bash
npx eas build --platform ios --profile production
```

### Submit to App Store
```bash
npx eas submit --platform ios
```

### Check Build Status
```bash
npx eas build:list
```

## 📱 App Store Requirements Met

### Technical Requirements
- [x] iOS 13.0+ compatibility
- [x] 64-bit architecture support
- [x] Privacy manifest included
- [x] App Transport Security configured
- [x] Background modes properly declared

### Content Requirements
- [x] App follows App Store Review Guidelines
- [x] No prohibited content
- [x] Proper age rating considerations
- [x] Privacy policy compliance

### Monetization Requirements
- [x] In-App Purchases properly implemented
- [x] RevenueCat integration complete
- [x] Subscription terms clearly stated
- [x] Restore purchases functionality

## 🎯 Ready for Deployment!

Your iOS app is configured and ready for deployment. Follow the checklist above to complete the App Store submission process.
