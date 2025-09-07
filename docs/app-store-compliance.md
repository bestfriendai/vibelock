# App Store Compliance Document - LockerRoom

*Last Updated: January 2025*

## Executive Summary

This document provides a comprehensive guide for ensuring the LockerRoom React Native app complies with Google Play Store and Apple App Store policies. Based on analysis of the codebase and current store requirements, this guide identifies key compliance areas, potential issues, and recommended actions.

## 1. App Overview

**App Name:** Locker Room Talk
**Category:** Dating/Social Networking
**Platform:** React Native (Expo SDK 53) with Supabase backend
**Target Audience:** Adults (18+)
**Key Features:**
- User authentication and profiles (Supabase Auth)
- Dating reviews with photos and ratings
- Real-time chat messaging (Supabase Realtime)
- Location-based browsing and filtering
- User-generated content (reviews, comments, chat)
- Push notifications (Expo + Supabase Edge Functions)
- Content reporting and moderation (OpenAI integration)
- Basic subscription system (premium features)

## 2. Critical Compliance Requirements

### 2.1 Age Restrictions

**Requirements:**
- Both stores require dating apps to be rated 17+ (Apple) / Mature 17+ (Google)
- Must implement age verification during registration
- Cannot allow users under 18 to create accounts

**Current Status:** ⚠️ **Needs Implementation**
- No age verification found in registration flow
- No age-related fields in user profile

**Required Actions:**
1. Add date of birth field to registration
2. Implement age calculation and verification (must be 18+)
3. Add age verification to Terms of Service acceptance
4. Update app store listings with appropriate age ratings

### 2.2 User Safety Features

**Requirements:**
- Robust blocking and reporting mechanisms
- Clear community guidelines
- Prompt response to reports
- User profile verification options

**Current Status:** ✅ **Partially Implemented**
- User blocking system exists (`safetyStore.ts`)
- Content reporting with categories (inappropriate content, fake profile, harassment, spam)
- Report types: review, profile, comment, message

**Required Actions:**
1. Add visible "Report" and "Block" buttons on all user-generated content
2. Create community guidelines page
3. Implement report response workflow
4. Add optional profile verification feature

## 3. Privacy and Data Protection

### 3.1 Data Collection

**Data Collected by App:**
- **Account Information:** Email, password, anonymous ID
- **Profile Data:** Gender, gender preference
- **Location Data:** 
  - City and state
  - **GPS coordinates (latitude/longitude)** ⚠️ **High sensitivity**
- **User Content:** Reviews, photos, comments, chat messages
- **Device Information:** Push notification tokens
- **Usage Data:** Chat activity, review interactions

**Compliance Status:** ⚠️ **High Risk - GPS Coordinates**

**Required Actions:**
1. Remove automatic GPS coordinate collection or make it explicitly opt-in
2. Add location permission explanations
3. Implement data minimization practices
4. Add location data anonymization for reviews

### 3.2 Privacy Policy Requirements

**Must Include:**
- Types of data collected (especially location data)
- How data is used and shared
- Data retention periods
- User rights (access, deletion, portability)
- Third-party services (Supabase for backend, OpenAI/Anthropic for moderation)
- Contact information for privacy concerns
- Age restrictions (18+)
- No Firebase data collection (app uses Supabase exclusively)

**Required Actions:**
1. Create comprehensive privacy policy
2. Add privacy policy link in app settings
3. Show privacy policy during registration
4. Implement data deletion functionality

### 3.3 Data Security

**Current Implementation:**
- Supabase authentication with PKCE flow
- HTTPS/WSS for all connections (Supabase handles this)
- Row Level Security (RLS) policies needed for all tables
- Supabase Storage for media with access controls

**Required Enhancements:**
1. Implement comprehensive RLS policies for all tables
2. Add data encryption at rest for sensitive content
3. Implement secure photo storage with proper access controls
4. Regular security audits
5. Remove unused Firebase configuration files

## 4. User-Generated Content Policies

### 4.1 Content Moderation

**Current Status:** ✅ **Partially Implemented**
- OpenAI-based content moderation (`moderation.ts`)
- Pre-publish review screening
- Report-based moderation

**Required Enhancements:**
1. Add photo moderation for inappropriate images
2. Implement chat message filtering
3. Create moderation queue for reported content
4. Add appeals process for removed content

### 4.2 Prohibited Content

**Must Block:**
- Sexual or nude content
- Hate speech or discrimination
- Harassment or bullying
- Fake profiles or impersonation
- Spam or commercial content
- Illegal activities

**Implementation Requirements:**
1. Update content moderation rules
2. Add automated spam detection
3. Implement user verification options
4. Create content guidelines visible to users

## 5. Technical Requirements

### 5.1 Permissions

**Current Permissions Used:**
- Camera (for photos)
- Photo Library
- Location Services
- Push Notifications

**Compliance Requirements:**
1. Add permission usage descriptions in `app.json`
2. Request permissions only when needed
3. Provide clear explanations for each permission
4. Allow app to function with denied permissions

### 5.2 App Store Specific Requirements

**Google Play:**
- Target API level 33+ (Android 13)
- 64-bit support
- App Bundle format (.aab)
- Data Safety section completion

**Apple App Store:**
- iOS 13.0+ support
- App Tracking Transparency (ATT)
- Privacy nutrition labels
- Sign in with Apple (if offering third-party login)

## 6. Legal and Compliance Pages

### 6.1 Required Legal Documents

**Must Have:**
1. **Terms of Service**
   - User obligations
   - Prohibited behaviors
   - Content ownership
   - Liability limitations
   - Age requirements (18+)

2. **Privacy Policy**
   - Data collection and use
   - Third-party services
   - User rights
   - Contact information

3. **Community Guidelines**
   - Acceptable behavior
   - Content standards
   - Enforcement actions

4. **Safety Tips**
   - Meeting in person safely
   - Identifying fake profiles
   - Reporting concerns

### 6.2 Implementation

**Required Actions:**
1. Create all legal documents
2. Add links in app footer/settings
3. Show during registration
4. Version and date all documents
5. Implement acceptance tracking

## 7. Monetization Compliance

**If Implementing Monetization:**
- Use platform payment systems (Google Play Billing, StoreKit)
- Clear pricing display
- Subscription management
- Refund policies
- No external payment links

## 8. Marketing and Metadata

### 8.1 App Store Listing Requirements

**Must Include:**
- Accurate app description
- Real screenshots (no mockups)
- Age rating justification
- Content warnings
- Privacy policy URL
- Support contact

**Prohibited:**
- Sexual content in screenshots
- Misleading claims
- Keyword stuffing
- Competitor references

## 9. Implementation Checklist

### High Priority (Must Fix Before Submission)

- [ ] Implement age verification (18+) in registration flow
- [ ] Create and integrate Privacy Policy
- [ ] Create and integrate Terms of Service
- [ ] Add permission usage descriptions
- [ ] Remove or make GPS coordinates opt-in only
- [ ] Add content reporting UI for all user content
- [ ] Implement photo content moderation
- [ ] Create data deletion functionality
- [ ] Add community guidelines

### Medium Priority (Recommended)

- [ ] Implement profile verification options
- [ ] Add end-to-end encryption for chats
- [ ] Create safety tips section
- [ ] Implement appeals process
- [ ] Add location permission explanations
- [ ] Enhance spam detection

### Low Priority (Nice to Have)

- [ ] Add Sign in with Apple
- [ ] Implement advanced moderation queue
- [ ] Add user badges/verification
- [ ] Create detailed analytics opt-out

## 10. Store Submission Preparation

### Pre-Submission Checklist

1. **Technical:**
   - [ ] Test on multiple devices
   - [ ] Fix all crashes
   - [ ] Remove console logs
   - [ ] Update version numbers
   - [ ] Generate release builds

2. **Compliance:**
   - [ ] All high-priority items complete
   - [ ] Legal documents accessible
   - [ ] Age gate implemented
   - [ ] Permissions justified

3. **Store Assets:**
   - [ ] App icon (all sizes)
   - [ ] Screenshots (all devices)
   - [ ] App description
   - [ ] Keywords
   - [ ] Privacy policy URL
   - [ ] Support URL

4. **Testing:**
   - [ ] User registration flow
   - [ ] Content reporting
   - [ ] Chat functionality
   - [ ] Location features
   - [ ] Push notifications

## 11. Ongoing Compliance

### Regular Reviews

- **Monthly:** Review reported content metrics
- **Quarterly:** Update privacy policy if needed
- **Bi-annually:** Security audit
- **Annually:** Full compliance review

### Monitoring

- User reports response time
- Content moderation effectiveness
- Privacy policy compliance
- Store policy updates

## 12. Risk Mitigation

### High-Risk Areas

1. **GPS Coordinate Collection**
   - Risk: Privacy violation, store rejection
   - Mitigation: Make opt-in, clearly explain use

2. **User-Generated Photos**
   - Risk: Inappropriate content
   - Mitigation: Pre-upload moderation, quick removal

3. **Dating Reviews**
   - Risk: Harassment, defamation
   - Mitigation: Strong moderation, anonymous options

4. **Chat Messages**
   - Risk: Inappropriate content, spam
   - Mitigation: Real-time filtering, report system

## 13. Contact and Support

### Required Support Infrastructure

- **User Support Email:** support@lockerroom.app
- **Privacy Contact:** privacy@lockerroom.app
- **Content Moderation:** moderation@lockerroom.app
- **Legal/DMCA:** legal@lockerroom.app

### Response Time Targets

- General support: 48 hours
- Privacy requests: 30 days
- Safety reports: 24 hours
- Legal/DMCA: 5 business days

## Conclusion

The LockerRoom app has a solid technical foundation but requires several compliance enhancements before app store submission. The most critical issues are implementing age verification, addressing GPS coordinate collection, and creating required legal documents. Following this guide's recommendations will significantly improve the chances of successful app store approval while ensuring user safety and privacy protection.

### Next Steps

1. Prioritize high-priority compliance items
2. Develop and review legal documents with legal counsel
3. Implement technical changes in staged releases
4. Conduct thorough testing before submission
5. Prepare detailed app review notes explaining safety measures

---

*This document should be reviewed by legal counsel and updated regularly to reflect changing app store policies and regulations.*