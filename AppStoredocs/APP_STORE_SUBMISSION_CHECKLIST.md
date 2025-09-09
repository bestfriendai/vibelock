# App Store Submission Checklist - LockerRoom Talk

## Pre-Submission Requirements

### App Store Connect Setup (iOS)
- [ ] Apple Developer Program membership active ($99/year)
- [ ] App Store Connect account configured with two-factor authentication
- [ ] Team roles and permissions set (Admin for submission, App Manager for builds)
- [ ] App record created in App Store Connect with correct bundle ID: com.lockerroomtalk.app

### Google Play Console Setup (Android)
- [ ] Google Play Console account active ($25 one-time fee)
- [ ] App listing created with package name: com.lockerroomtalk.app
- [ ] Developer profile updated with contact info and privacy policy
- [ ] Signed APK/AAB prepared for upload

### App Information
- [ ] App name: "LockerRoom Talk: Dating Reviews"
- [ ] Bundle ID/Package Name: com.lockerroomtalk.app
- [ ] SKU: lockerroom-talk-ios-app (iOS only)
- [ ] Primary language: English (U.S.)
- [ ] Categories: Lifestyle (Primary), Social Networking (Secondary)
- [ ] Content rights: Does Not Use Third-Party Content
- [ ] Age rating: 17+ (due to mature/suggestive themes, user-generated content, profanity, unrestricted web access)

### Version Information
- [ ] Version number: 1.0.0
- [ ] Build number: Auto-incremented by EAS (iOS) or versionCode 1 (Android)
- [ ] What's New/Release Notes: Updated with generalized description emphasizing anonymous reviews, real-time chat, global access, and premium features for broad audience
- [ ] Copyright: "2025 LockerRoom Talk Inc."

### App Description & Metadata
- [ ] Promotional Text/Short Description: Aligned with general audience (e.g., "Empower safer dating with anonymous reviews and real-time chat - instant access for all")
- [ ] Full Description: Expanded with details on features (reviews with media/flags, chat with reactions, advanced search filters, safety tools, premium enhancements); ensures inclusive language as a plus, not primary focus
- [ ] Keywords/Tags: Generalized (e.g., "dating safety, anonymous reviews, dating chat, global dating, privacy dating" - no specific demographics)
- [ ] Support URL: https://lockerroomtalk.app/support
- [ ] Marketing URL: https://lockerroomtalk.app
- [ ] Privacy Policy URL: https://lockerroomtalk.app/privacy (ensure it reflects broad user data handling, no targeted demographics)

### Screenshots & Media
- [ ] iPhone 6.7" screenshots (3-10): Highlight general features like review feed, chatroom, search filters, safety reporting - diverse, non-specific user interfaces
- [ ] iPhone 6.1" screenshots (3-10): Same as above, optimized for smaller screens
- [ ] iPad screenshots (optional): If applicable, show expanded views of chat and search
- [ ] Android phone screenshots (2-8): Phone (portrait/landscape), 7" tablet, TV (if relevant) - focus on core features for broad appeal
- [ ] App icon: 1024x1024 PNG (updated for general branding)
- [ ] App preview video (15-30 sec, optional): Demo instant onboarding, anonymous review creation, real-time chat join - emphasize accessibility and privacy

### Age Rating & Content
- [ ] Age rating questionnaire completed for both stores
- [ ] iOS Rating: 17+ with reasons: Mature/Suggestive Themes, User Generated Content, Infrequent/Mild Profanity, Unrestricted Web Access
- [ ] Android Content Rating: Mature 17+ (similar reasons)
- [ ] Content warnings: User-generated content moderation explained in notes

### In-App Purchases & Monetization
- [ ] Subscription group created: "Premium Subscriptions"
- [ ] Monthly subscription: premium_monthly ($9.99, P1M) - description: "Ad-free, advanced search, extended location"
- [ ] Annual subscription: premium_annual ($99.99, P1Y) - description: "Full year access with savings"
- [ ] Localizations: English (US), with plans for additional languages
- [ ] Review information: Demo account for testing purchases (username: demo@lockerroomtalk.app, password: DemoPass123!)
- [ ] RevenueCat integration verified: Products match store listings, restoration works, sandbox testing complete
- [ ] Android Billing: Products configured in Google Play Console, tested with test accounts

### App Review Information
- [ ] Contact: First Name: Patrick, Last Name: Support, Phone: +1-555-0123, Email: support@lockerroomtalk.app
- [ ] Demo Account: Username: demo@lockerroomtalk.app, Password: DemoPass123! - Notes: "Access sample reviews, chatrooms, premium features; highlights anonymous sharing, global search, safety tools"
- [ ] Review Notes: "LockerRoom Talk is a dating safety app for broad users. Key features: anonymous reviews with media/flags, real-time chat, advanced filters. No verification required. Test global location, premium unlock, moderation reporting. Inclusive for diverse experiences as a plus."
- [ ] Special Instructions: "Use demo account to test user-generated content flow, privacy settings, and cross-region search. App emphasizes general audience safety without specific targeting."

### Legal & Compliance
- [ ] Privacy Policy: Published, details data collection for broad users (location city/state, anonymous reviews), GDPR/CCPA compliant
- [ ] Terms of Service: Updated for general community guidelines, moderation policies
- [ ] Content Rights: Original content, no third-party media
- [ ] Export Compliance: No encryption items requiring declaration
- [ ] Advertising ID: Declared for personalized ads (opt-out available)
- [ ] Android Specific: Content rating questionnaire, data safety section completed

## Build Requirements

### Technical Requirements
- [ ] iOS Deployment Target: iOS 13.0+
- [ ] Android Min SDK: 21 (Android 5.0+)
- [ ] 64-bit architecture support for both platforms
- [ ] App Transport Security (ATS) configured for secure connections
- [ ] Privacy Manifest (iOS 17+): Declares required reasons for data access (e.g., location for filters)
- [ ] Background Modes: Declared for push notifications and location updates
- [ ] Accessibility: WCAG AA compliance, screen reader support for reviews/chat

### Testing Requirements
- [ ] Tested on physical devices: iPhone 12+, Android Pixel/Samsung recent models
- [ ] All core features verified: Anonymous review creation with media upload/flags, real-time chat joining/reactions, advanced search with filters/location, safety reporting/blocking
- [ ] In-App Purchases: Sandbox testing for subscriptions, restoration, premium feature unlock (ad-free, extended search)
- [ ] Push Notifications: Tested for messages, activity alerts across platforms
- [ ] Location Services: Verified global filtering, distance calculations, privacy (city/state only)
- [ ] Offline Support: Cached reviews/searches accessible without internet
- [ ] Edge Cases: No crashes on low battery, poor network; moderation simulation for user-generated content
- [ ] Cross-Platform: Deep linking, theme consistency between iOS/Android
- [ ] Analytics: Events for review creation, chat engagement, premium conversion tracked

### RevenueCat & AdMob Integration
- [ ] RevenueCat: Products synced with stores, backend validation, error handling for failed purchases
- [ ] AdMob: Banner/interstitial ads configured for free tier, test ads not in production builds
- [ ] Compliance: Ad consent flows, no ads in premium or sensitive areas (e.g., safety reports)

## Submission Process

### Build Upload
- [ ] iOS Production Build: `eas build --platform ios --profile production` - Upload via Transporter or EAS Submit
- [ ] Android AAB Upload: `eas build --platform android --profile production` - Upload to Google Play Console
- [ ] Build Processing: Verify no errors, testflight internal for iOS, internal testing track for Android
- [ ] Binary Selected: Latest stable build chosen for submission

### Final Review
- [ ] Metadata Alignment: Descriptions/keywords generalized for broad audience, features expanded (e.g., sentiment analysis, AI moderation)
- [ ] Screenshots Reviewed: Ensure they showcase general features (reviews, chat, search) without specific demographics; optimized for all device sizes
- [ ] In-App Purchases Verified: Prices, descriptions match, demo account tests full flow
- [ ] Privacy & Legal: URLs accessible, policies reflect general data practices
- [ ] Contact Info Current: Updated email/phone for reviewer inquiries

### Submission
- [ ] iOS: Submit in App Store Connect, export compliance certified
- [ ] Android: Roll out to production in Google Play Console, content rating confirmed
- [ ] Confirmation: Receipt numbers/emails saved, status monitored in both consoles
- [ ] Pricing & Availability: Set to all countries, free with IAP

## Post-Submission

### Review Process
- [ ] Monitor Status: Daily checks in App Store Connect (1-2 days typical) and Google Play (few hours to days)
- [ ] Reviewer Feedback: Respond within 24 hours to questions on features like anonymous content moderation or global location
- [ ] Rejection Handling: Common issues (e.g., privacy declarations, IAP mismatches) - resubmit with notes after fixes
- [ ] Beta Testing: Use TestFlight/Internal Testing for pre-launch validation with generalized user scenarios

### Launch Preparation
- [ ] Marketing: Social announcements highlighting "instant access for safer dating", press release on broad positioning
- [ ] Support Documentation: FAQ for features (e.g., "How to share anonymous reviews globally?"), updated for general users
- [ ] Analytics Setup: Firebase/Supabase events for downloads, engagement (chat sessions, review views), premium conversions
- [ ] A/B Testing: Post-launch variants for descriptions/screenshots to optimize for broad appeal

### Post-Launch Monitoring
- [ ] Performance: Crash reports, user reviews - address issues like chat latency or search accuracy
- [ ] Metrics: Track organic downloads from ASO keywords, retention (aim 75% 7-day), premium rate (10%+)
- [ ] Updates: Plan v1.0.1 for feedback (e.g., more filter options, enhanced privacy)
- [ ] Compliance: Ongoing audits for user data, app store guideline changes

## Common Rejection Reasons to Avoid

### Technical Issues
- [ ] App crashes/bugs in key features (e.g., media upload, real-time chat)
- [ ] Incomplete IAP (no restore button, mismatched products)
- [ ] Performance problems (slow global search, high battery use)
- [ ] Broken integrations (Supabase auth, AdMob ads)

### Content & Metadata Issues
- [ ] Misleading descriptions (e.g., overpromising anonymity without moderation details)
- [ ] Inappropriate user-generated content simulation in demo
- [ ] Keyword stuffing or irrelevant terms
- [ ] Screenshots not representing general audience use cases

### Business Model Issues
- [ ] Unclear subscription terms or pricing discrepancies
- [ ] Missing trial/refund info in policies
- [ ] Ads in sensitive areas (e.g., safety reports)
- [ ] No opt-out for data collection in privacy section

### Privacy & Legal Issues
- [ ] Missing/inaccurate privacy policy (must detail location data use for filters)
- [ ] Undeclared permissions (e.g., location without manifest reason)
- [ ] Export non-compliance for global features
- [ ] Terms not covering user-generated content guidelines

## Success Metrics to Track
- [ ] Downloads: 50K+ in first month via ASO
- [ ] Conversion: 15% from store views to installs
- [ ] Retention: 70% 7-day, 40% 30-day (boosted by chat engagement)
- [ ] Ratings: 4.5+ stars, focus on privacy/safety feedback
- [ ] Revenue: $10K+ month 1 from premium (8% conversion)
- [ ] Engagement: Average 12 min/session, 30% users post reviews/chat

---

**Remember**: iOS review typically 24-48 hours (up to 7 days peak); Android 1-7 days. Prepare for iterations based on generalized, feature-rich positioning. Launch with monitoring for broad user feedback!
