#!/usr/bin/env node

/**
 * App Store Connect Preparation Script
 * 
 * This script prepares everything needed for App Store Connect:
 * - Creates app metadata templates
 * - Generates screenshot requirements
 * - Sets up In-App Purchase products
 * - Validates app configuration
 */

const fs = require('fs');

console.log('🏪 Preparing App Store Connect Configuration...\n');

// App Store Connect metadata template
function createAppMetadata() {
  console.log('📝 Creating App Store Connect metadata template...');
  
  const metadata = {
    appInformation: {
      name: "LockerRoom",
      subtitle: "Sports Talk & Reviews",
      bundleId: "com.lockerroomtalk.app",
      sku: "lockerroom-ios-app",
      primaryLanguage: "English (U.S.)",
      categories: {
        primary: "Sports",
        secondary: "Social Networking"
      },
      contentRights: "Does Not Use Third-Party Content"
    },
    
    versionInformation: {
      version: "1.0.0",
      copyright: "2025 LockerRoom",
      releaseType: "Manual Release",
      earliestReleaseDate: null,
      versionReleaseNotes: `🎉 Welcome to LockerRoom - the ultimate sports talk app!

✨ Features:
• Share and discover sports reviews
• Connect with fellow sports fans
• Location-based content discovery
• Premium features with ad-free experience
• Real-time notifications

🏆 Join the conversation and share your sports passion!`
    },
    
    appDescription: {
      description: `LockerRoom is the premier destination for sports enthusiasts to share reviews, connect with fellow fans, and discover the best sports experiences in their area.

🏟️ KEY FEATURES:

📍 Location-Based Discovery
Find sports venues, events, and experiences near you with our advanced location filtering system.

⭐ Review & Rating System
Share detailed reviews of games, venues, restaurants, and sports experiences. Help others discover the best spots for their sports adventures.

💬 Community Connection
Connect with like-minded sports fans in your area. Join conversations, share experiences, and build lasting friendships.

🔔 Real-Time Updates
Stay informed with push notifications about new reviews, nearby events, and community activity.

🎯 Premium Experience
Upgrade to Premium for:
• Ad-free browsing
• Advanced search and filtering
• Review analytics and insights
• Custom profile themes
• Priority support
• Extended location search

🌟 Whether you're looking for the best sports bar to watch the game, want to review your latest stadium experience, or connect with fellow fans, LockerRoom is your go-to platform.

Download now and join the sports conversation!`,
      
      keywords: "sports, reviews, social, community, location, venues, games, fans, premium, talk",
      
      supportURL: "https://lockerroom.support",
      marketingURL: "https://lockerroom.app",
      privacyPolicyURL: "https://lockerroom.app/privacy"
    },
    
    ageRating: {
      rating: "12+",
      reasons: [
        "Infrequent/Mild Profanity or Crude Humor",
        "User Generated Content"
      ]
    },
    
    reviewInformation: {
      contact: {
        firstName: "Patrick",
        lastName: "Support",
        phone: "+1-555-0123",
        email: "support@lockerroom.app"
      },
      demoAccount: {
        username: "demo@lockerroom.app",
        password: "DemoPass123!",
        notes: "Demo account with sample reviews and content for testing purposes."
      },
      notes: `LockerRoom is a sports-focused social platform where users can:

1. Share and discover sports venue reviews
2. Connect with other sports fans
3. Use location-based filtering to find nearby content
4. Subscribe to premium features for enhanced experience

The app includes:
- User-generated content with moderation
- In-app purchases for premium subscription
- Location services for content discovery
- Push notifications for community updates

All content is moderated and follows community guidelines. The app promotes positive sports discussion and venue discovery.`
    }
  };
  
  fs.writeFileSync('app-store-metadata.json', JSON.stringify(metadata, null, 2));
  console.log('✅ Created app-store-metadata.json');
}

// In-App Purchase products configuration
function createInAppPurchases() {
  console.log('💰 Creating In-App Purchase configuration...');
  
  const iapConfig = {
    subscriptions: [
      {
        productId: "com.lockerroomtalk.app.premium.monthly",
        referenceName: "LockerRoom Premium Monthly",
        type: "Auto-Renewable Subscription",
        subscriptionGroup: "Premium Subscriptions",
        subscriptionDuration: "1 Month",
        price: "$9.99",
        displayName: {
          "en-US": "Premium Monthly"
        },
        description: {
          "en-US": "Get unlimited access to all premium features including ad-free experience, advanced search, review analytics, custom themes, and priority support."
        },
        reviewNotes: "Monthly subscription for premium features. Users can cancel anytime through their Apple ID settings."
      },
      {
        productId: "com.lockerroomtalk.app.premium.annual",
        referenceName: "LockerRoom Premium Annual",
        type: "Auto-Renewable Subscription",
        subscriptionGroup: "Premium Subscriptions", 
        subscriptionDuration: "1 Year",
        price: "$99.99",
        displayName: {
          "en-US": "Premium Annual"
        },
        description: {
          "en-US": "Get unlimited access to all premium features for a full year. Save 17% compared to monthly billing. Includes ad-free experience, advanced search, review analytics, custom themes, and priority support."
        },
        reviewNotes: "Annual subscription for premium features with significant savings. Users can cancel anytime through their Apple ID settings."
      }
    ],
    
    subscriptionGroupInformation: {
      name: "Premium Subscriptions",
      localizations: {
        "en-US": {
          name: "Premium Subscriptions",
          customAppName: "LockerRoom"
        }
      }
    },
    
    appStorePromotions: {
      promotionalOffers: [
        {
          productId: "com.lockerroomtalk.app.premium.annual",
          offerName: "New User Special",
          offerType: "Introductory Offer",
          duration: "1 Week Free Trial",
          eligibility: "New Subscribers Only"
        }
      ]
    }
  };
  
  fs.writeFileSync('in-app-purchases.json', JSON.stringify(iapConfig, null, 2));
  console.log('✅ Created in-app-purchases.json');
}

// Screenshot requirements and guidelines
function createScreenshotGuide() {
  console.log('📱 Creating screenshot requirements guide...');
  
  const screenshotGuide = `# App Store Screenshot Requirements - LockerRoom

## Required Screenshot Sizes

### iPhone Screenshots (Required)
- **6.7" Display (iPhone 14 Pro Max, 15 Pro Max, etc.)**
  - Size: 1290 x 2796 pixels
  - Format: PNG or JPEG
  - Required: 3-10 screenshots

- **6.1" Display (iPhone 14, 15, etc.)**
  - Size: 1179 x 2556 pixels  
  - Format: PNG or JPEG
  - Required: 3-10 screenshots

### iPad Screenshots (Optional but Recommended)
- **12.9" Display (iPad Pro)**
  - Size: 2048 x 2732 pixels
  - Format: PNG or JPEG
  - Required: 3-10 screenshots

## Screenshot Content Strategy

### Screenshot 1: Main Feed/Home Screen
- Show the main review feed
- Display location-based content
- Highlight clean, modern UI
- Include sample sports reviews

### Screenshot 2: Review Creation
- Show the review creation interface
- Highlight photo upload capability
- Display rating system
- Show location tagging

### Screenshot 3: Premium Features
- Showcase premium paywall
- List premium benefits clearly
- Show ad-free experience
- Highlight advanced features

### Screenshot 4: Community/Social Features
- Display user profiles
- Show community interactions
- Highlight social aspects
- Display notifications/activity

### Screenshot 5: Location & Discovery
- Show map/location features
- Display search and filtering
- Highlight nearby content
- Show venue discovery

## Design Guidelines

### Text Overlays
- Use clear, readable fonts
- Ensure high contrast
- Keep text concise and impactful
- Highlight key features

### Visual Elements
- Use consistent branding
- Maintain app's color scheme
- Show realistic, diverse content
- Avoid placeholder text

### Content Requirements
- Use appropriate, family-friendly content
- Show diverse user representation
- Include realistic sports venues/content
- Avoid copyrighted sports logos/content

## App Preview Video (Optional)
- Duration: 15-30 seconds
- Same dimensions as screenshots
- Show app in action
- Highlight key user flows
- Include smooth transitions

## Localization
- Create screenshots for each supported language
- Ensure text is properly translated
- Maintain consistent visual design
- Test on actual devices

## Quality Checklist
- [ ] All screenshots are high resolution
- [ ] No pixelation or blurriness
- [ ] Consistent lighting and colors
- [ ] No UI elements cut off
- [ ] Text is readable on all devices
- [ ] Content follows App Store guidelines
- [ ] Screenshots show actual app functionality
- [ ] No placeholder or Lorem ipsum text

## Tools for Screenshot Creation
- Xcode Simulator (for basic screenshots)
- Screenshot Framer (for device frames)
- Figma/Sketch (for design overlays)
- App Store Screenshot Generator tools

## Submission Tips
- Upload screenshots in order of importance
- First screenshot is most critical (appears in search)
- Test how screenshots look in App Store search results
- Consider A/B testing different screenshot sets
- Update screenshots with major feature releases
`;

  fs.writeFileSync('SCREENSHOT_REQUIREMENTS.md', screenshotGuide);
  console.log('✅ Created SCREENSHOT_REQUIREMENTS.md');
}

// App Store Connect checklist
function createSubmissionChecklist() {
  console.log('✅ Creating App Store submission checklist...');
  
  const checklist = `# App Store Connect Submission Checklist - LockerRoom

## Pre-Submission Requirements

### App Store Connect Setup
- [ ] Apple Developer Program membership active
- [ ] App Store Connect account configured
- [ ] Team roles and permissions set
- [ ] App record created in App Store Connect

### App Information
- [ ] App name: "LockerRoom"
- [ ] Bundle ID: com.lockerroomtalk.app
- [ ] SKU: lockerroom-ios-app
- [ ] Primary language: English (U.S.)
- [ ] Categories: Sports (Primary), Social Networking (Secondary)

### Version Information
- [ ] Version number: 1.0.0
- [ ] Build number: Auto-incremented by EAS
- [ ] What's New in This Version completed
- [ ] Copyright information added

### App Description
- [ ] App description written (4000 character limit)
- [ ] Keywords optimized (100 character limit)
- [ ] Support URL: https://lockerroom.support
- [ ] Marketing URL: https://lockerroom.app
- [ ] Privacy Policy URL: https://lockerroom.app/privacy

### Screenshots & Media
- [ ] iPhone 6.7" screenshots (3-10 required)
- [ ] iPhone 6.1" screenshots (3-10 required)
- [ ] iPad screenshots (optional but recommended)
- [ ] App icon (1024x1024 pixels)
- [ ] App preview video (optional)

### Age Rating
- [ ] Age rating questionnaire completed
- [ ] Rating: 12+ (due to user-generated content)
- [ ] Content warnings configured

### In-App Purchases
- [ ] Subscription group created: "Premium Subscriptions"
- [ ] Monthly subscription: com.lockerroomtalk.app.premium.monthly ($9.99)
- [ ] Annual subscription: com.lockerroomtalk.app.premium.annual ($99.99)
- [ ] Subscription localizations completed
- [ ] Subscription review information provided

### App Review Information
- [ ] Contact information provided
- [ ] Demo account credentials:
  - Username: demo@lockerroom.app
  - Password: DemoPass123!
- [ ] Review notes explaining app functionality
- [ ] Special instructions for reviewers (if needed)

### Legal & Compliance
- [ ] Privacy policy published and accessible
- [ ] Terms of service published
- [ ] Content rights declaration
- [ ] Export compliance information
- [ ] Advertising identifier usage declared

## Build Requirements

### Technical Requirements
- [ ] iOS 13.0+ compatibility
- [ ] 64-bit architecture support
- [ ] App Transport Security configured
- [ ] Privacy manifest included (iOS 17+)
- [ ] Background modes properly declared

### Testing Requirements
- [ ] App tested on physical devices
- [ ] All features working correctly
- [ ] In-app purchases tested in sandbox
- [ ] Push notifications tested
- [ ] Location services tested
- [ ] No crashes or major bugs

### RevenueCat Integration
- [ ] RevenueCat products match App Store Connect
- [ ] Subscription entitlements configured
- [ ] Purchase restoration working
- [ ] Receipt validation working

## Submission Process

### Build Upload
- [ ] Production build created: \`eas build --platform ios --profile production\`
- [ ] Build uploaded to App Store Connect
- [ ] Build processed successfully
- [ ] Build selected for submission

### Final Review
- [ ] All metadata reviewed and accurate
- [ ] Screenshots reviewed on different device sizes
- [ ] In-app purchase information verified
- [ ] Privacy information accurate
- [ ] Contact information current

### Submission
- [ ] App submitted for review
- [ ] Submission confirmation received
- [ ] Review status monitored
- [ ] Ready for sale when approved

## Post-Submission

### Review Process
- [ ] Monitor review status daily
- [ ] Respond to any reviewer feedback promptly
- [ ] Address any rejection reasons
- [ ] Resubmit if necessary

### Launch Preparation
- [ ] Marketing materials prepared
- [ ] Social media announcements ready
- [ ] User support documentation updated
- [ ] Analytics and monitoring configured

### Post-Launch
- [ ] Monitor app performance and reviews
- [ ] Respond to user feedback
- [ ] Plan future updates and features
- [ ] Track subscription metrics

## Common Rejection Reasons to Avoid

### Technical Issues
- [ ] App crashes or has significant bugs
- [ ] Incomplete functionality
- [ ] Poor performance
- [ ] Broken links or features

### Content Issues
- [ ] Inappropriate content
- [ ] Misleading app description
- [ ] Copyright infringement
- [ ] Spam or low-quality content

### Business Model Issues
- [ ] Unclear subscription terms
- [ ] Misleading pricing
- [ ] Subscription not properly implemented
- [ ] Missing restore purchases functionality

### Privacy Issues
- [ ] Missing privacy policy
- [ ] Inappropriate data collection
- [ ] Missing permission descriptions
- [ ] Privacy manifest issues

## Success Metrics to Track
- [ ] Download numbers
- [ ] Subscription conversion rates
- [ ] User retention rates
- [ ] App Store rating and reviews
- [ ] Revenue metrics
- [ ] User engagement metrics

---

**Remember**: The App Store review process typically takes 24-48 hours, but can take up to 7 days during busy periods. Plan your launch accordingly!
`;

  fs.writeFileSync('APP_STORE_SUBMISSION_CHECKLIST.md', checklist);
  console.log('✅ Created APP_STORE_SUBMISSION_CHECKLIST.md');
}

// Main preparation function
function prepareAppStoreConnect() {
  try {
    createAppMetadata();
    createInAppPurchases();
    createScreenshotGuide();
    createSubmissionChecklist();
    
    console.log('\n🎉 App Store Connect Preparation Complete!\n');
    console.log('📋 Files Created:');
    console.log('✅ app-store-metadata.json - Complete app metadata template');
    console.log('✅ in-app-purchases.json - In-App Purchase configuration');
    console.log('✅ SCREENSHOT_REQUIREMENTS.md - Screenshot guidelines');
    console.log('✅ APP_STORE_SUBMISSION_CHECKLIST.md - Complete submission checklist');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Create App Store Connect app record');
    console.log('2. Configure In-App Purchases in App Store Connect');
    console.log('3. Create and upload screenshots');
    console.log('4. Complete app metadata in App Store Connect');
    console.log('5. Build production version: npx eas build --platform ios --profile production');
    console.log('6. Submit for App Store review');
    
    return true;
  } catch (error) {
    console.error('❌ Preparation failed:', error.message);
    return false;
  }
}

// Run preparation
if (require.main === module) {
  const success = prepareAppStoreConnect();
  process.exit(success ? 0 : 1);
}

module.exports = { prepareAppStoreConnect };
