# App Store Screenshots

This directory contains screenshots required for App Store and Google Play Store submission.

## iOS Screenshots (App Store Connect)

### Device Requirements

- **iPhone 6.7" (iPhone 14 Pro Max)**: 1290x2796 pixels
  - Store in: `ios/iphone-6.7/`
  - Required: Up to 10 screenshots per localization

- **iPhone 6.5" (iPhone 11 Pro Max)**: 1242x2688 pixels
  - Store in: `ios/iphone-6.5/`
  - Fallback for older devices

- **iPhone 5.5" (iPhone 8 Plus)**: 1242x2208 pixels
  - Store in: `ios/iphone-5.5/`
  - Support for older iPhone models

- **iPad Pro 12.9" (6th gen)**: 2048x2732 pixels
  - Store in: `ios/ipad-12.9/`
  - Required for iPad optimization

## Android Screenshots (Google Play Console)

### Device Requirements

- **Phone**: 1080x1920 pixels minimum (up to 3840x2160)
  - Store in: `android/phone/`
  - Required: Up to 8 screenshots per localization

- **Tablet**: 1200x1920 pixels minimum (up to 3840x2160)
  - Store in: `android/tablet/`
  - Required for tablet optimization

## Screenshot Content Guidelines

### Key Screens to Capture:

1. **Chat Room List** - Show active chat rooms with member counts
2. **Active Chat Conversation** - Demonstrate real-time messaging
3. **Profile/Settings Screen** - User personalization options
4. **Review Browsing** - Location-based review features
5. **Location Features** - GPS-based chat room discovery

### Technical Requirements:

- **Format**: PNG (preferred) or JPEG
- **Orientation**: Portrait for phones, both orientations for tablets
- **Content**: Must show actual app interface, no mock-ups
- **Text**: Should be legible and professional
- **Localization**: Create separate folders for each language if supporting multiple locales

### Content Guidelines:

- ✅ Show real app functionality
- ✅ Use realistic but appropriate chat content
- ✅ Demonstrate key features clearly
- ✅ Ensure good lighting and contrast
- ✅ Show diverse user scenarios

- ❌ No watermarks or borders
- ❌ No device frames (stores add these)
- ❌ No offensive or inappropriate content
- ❌ No personal information visible
- ❌ No development/test data

## Capture Tools

### iOS:

- Use iPhone/iPad simulator with exact pixel dimensions
- Xcode Simulator > Device > Screenshot
- Or physical device screenshots via Xcode

### Android:

- Use Android emulator with correct screen density
- Android Studio AVD with matching resolution
- Or physical device screenshots via ADB

## File Naming Convention

Use descriptive names that indicate the screen shown:

- `01_chat_room_list.png`
- `02_active_conversation.png`
- `03_profile_settings.png`
- `04_review_browser.png`
- `05_location_features.png`

## Upload Requirements

- App Store Connect: Upload via Xcode or web interface
- Google Play Console: Upload via web interface
- Maximum file size: 8MB per screenshot
- Minimum 2 screenshots required, up to 10 per device type

## Localization

If supporting multiple languages:

```
ios/
  iphone-6.7/
    en-US/
    es-ES/
    fr-FR/
android/
  phone/
    en-US/
    es-ES/
    fr-FR/
```
