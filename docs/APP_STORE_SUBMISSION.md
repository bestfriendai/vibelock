# App Store Submission Guide

This document outlines the end-to-end process to submit the LockerRoom app to the Apple App Store and Google Play Store.

## Pre-submission Checklist
- Production verification passes: `npm run verify:production`
- Lint and typecheck clean: `npm run lint:check`, `npm run typecheck`
- Test suite green with coverage: `npm test`
- Built and tested on physical iOS and Android devices
- Required assets prepared:
  - 1024x1024 marketing icon at `assets/icon-1024.png` (no transparency)
  - App store screenshots under `app-store-assets/screenshots/`
- Privacy policy and terms of service URLs configured
- App Tracking Transparency implemented and strings localized

## iOS App Store Submission
- App Store Connect setup: create app record, bundle identifier, and version
- Certificates and provisioning profiles via Apple Developer portal
- Ensure compliance with App Review Guidelines
- Configure Privacy Nutrition Labels in App Store Connect
- Upload build via EAS or Xcode Transporter
- Fill metadata: description, keywords, screenshots, support URL, privacy policy
- Submit for review and monitor status

## Google Play Store Submission
- Create app in Google Play Console and configure app signing
- Complete Content Rating Questionnaire
- Complete Data Safety form accurately
- Prepare release notes and upload AAB/APK via EAS build
- Provide screenshots for phone and tablet form factors
- Use release tracks: internal → closed → open → production

## Post-submission Monitoring
- Track review status and respond to feedback
- Verify crash reporting and performance monitoring
- Monitor user reviews and ratings; iterate quickly on critical issues

## Common Rejection Reasons
- Missing/incorrect privacy policy
- App Tracking Transparency violations
- Metadata issues or misleading content
- Technical crashes or performance issues

