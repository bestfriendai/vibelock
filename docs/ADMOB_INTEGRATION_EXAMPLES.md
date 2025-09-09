# AdMob Integration Examples - LockerRoom App

## Complete Platform Configuration

### iOS & Android App IDs
- **iOS**: `ca-app-pub-9512493666273460~7181904608`
- **Android**: `ca-app-pub-9512493666273460~4548589138`

### Ad Unit IDs by Platform

| Ad Format | iOS | Android |
|-----------|-----|---------|
| Banner | `ca-app-pub-9512493666273460/4655851607` | `ca-app-pub-9512493666273460/3837555963` |
| Interstitial | `ca-app-pub-9512493666273460/4188909755` | `ca-app-pub-9512493666273460/2783494598` |
| App Open | `ca-app-pub-9512493666273460/6722739608` | `ca-app-pub-9512493666273460/9249664748` |

## Integration Examples

### 1. Banner Ads (Already Implemented)

Banner ads are already integrated in your `AdBanner` component and show above the tab bar:

```typescript
// src/components/AdBanner.tsx - Already implemented
import { adMobService } from '../services/adMobService';

// Banner automatically uses the correct platform-specific ad unit ID
<BannerAd
  unitId={adMobService.getBannerAdUnitId()}
  size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
  onAdLoaded={() => console.log('Banner loaded')}
  onAdFailedToLoad={(error) => console.error('Banner failed:', error)}
/>
```

### 2. Interstitial Ads Integration

#### In Post Creation Flow
```typescript
// Example: src/screens/CreatePostScreen.tsx
import { useInterstitialAds } from '../hooks/useInterstitialAds';

const CreatePostScreen = () => {
  const { showAdAfterPostCreation } = useInterstitialAds();

  const handlePostSubmit = async (postData: any) => {
    try {
      // Submit the post
      await submitPost(postData);
      
      // Show interstitial ad after successful post creation
      // (Will only show every 3rd post based on configuration)
      await showAdAfterPostCreation();
      
      // Navigate back or show success message
      navigation.goBack();
    } catch (error) {
      console.error('Post submission failed:', error);
    }
  };

  return (
    // Your post creation UI
    <View>
      {/* Post creation form */}
      <Button title="Submit Post" onPress={handlePostSubmit} />
    </View>
  );
};
```

#### In Chat Exit Flow
```typescript
// Example: src/screens/ChatScreen.tsx
import { useInterstitialAds } from '../hooks/useInterstitialAds';

const ChatScreen = () => {
  const { showAdAfterChatExit } = useInterstitialAds();

  const handleChatExit = async () => {
    try {
      // Clean up chat resources
      await cleanupChat();
      
      // Show interstitial ad after chat exit
      // (Will only show every 2nd chat exit based on configuration)
      await showAdAfterChatExit();
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Chat cleanup failed:', error);
    }
  };

  return (
    <View>
      {/* Chat UI */}
      <Button title="Leave Chat" onPress={handleChatExit} />
    </View>
  );
};
```

### 3. App Open Ads (Already Implemented)

App Open ads are automatically handled by the `AppOpenAdHandler` component:

```typescript
// src/components/AppOpenAdHandler.tsx - Already implemented
// Automatically shows App Open ads when:
// - App returns from background after 30+ seconds
// - Respects 4-hour cooldown between ads
// - Only for non-premium users
```

## Ad Placement Strategy

### Banner Ads
- **Location**: Above tab bar (non-floating)
- **Visibility**: Always visible during app usage
- **User Experience**: Non-intrusive, doesn't block content
- **Revenue**: Consistent impressions, lower eCPM

### Interstitial Ads
- **Post Creation**: Every 3rd post submission
- **Chat Exit**: Every 2nd chat room exit
- **User Experience**: Natural break points, not disruptive
- **Revenue**: Higher eCPM, fewer impressions

### App Open Ads
- **Trigger**: App resume from background (30+ seconds)
- **Cooldown**: 4 hours between ads
- **User Experience**: App launch monetization
- **Revenue**: High eCPM, limited frequency

## Testing Your Integration

### Development Build Testing
```bash
# Build development clients
npx eas build --platform ios --profile development
npx eas build --platform android --profile development

# Install and test
npx eas build:run -p ios
npx eas build:run -p android
```

### What to Test

#### Banner Ads
- [ ] Banner loads on browse screen
- [ ] Banner loads on chat screen
- [ ] Banner shows test ads in development
- [ ] Banner hidden for premium users
- [ ] Banner positioned above tab bar

#### Interstitial Ads
- [ ] Shows after 3rd post creation
- [ ] Shows after 2nd chat exit
- [ ] Test ads display correctly
- [ ] Proper loading and error handling
- [ ] Hidden for premium users

#### App Open Ads
- [ ] Shows when app resumes from background
- [ ] Respects 30-second minimum background time
- [ ] Respects 4-hour cooldown
- [ ] Hidden for premium users

## Revenue Optimization Tips

### 1. Monitor Performance
- Track eCPM for each ad format
- Monitor fill rates
- Analyze user engagement impact

### 2. A/B Testing
- Test different interstitial frequencies
- Experiment with App Open ad cooldowns
- Try different banner positions (if needed)

### 3. User Experience Balance
- Monitor app store reviews for ad complaints
- Track premium conversion rates
- Ensure ads don't hurt core metrics

## Troubleshooting

### Common Issues
1. **Ads not loading**: Check internet connection and AdMob account status
2. **Wrong ads showing**: Verify you're using development build, not Expo Go
3. **Platform-specific issues**: Check that correct app IDs are configured

### Debug Commands
```bash
# Check configuration
cat src/config/admobConfig.ts

# View logs during testing
npx expo start --dev-client
# Look for "AdMob initialized successfully" and ad loading logs
```

## Production Checklist

- [ ] All ad unit IDs configured correctly
- [ ] Platform-specific app IDs set in app.json
- [ ] Test ads working in development builds
- [ ] Premium user experience tested (no ads)
- [ ] Ad placement feels natural and non-intrusive
- [ ] AdMob account approved and active
- [ ] App complies with AdMob policies
- [ ] Privacy policy updated with ad information

## Expected Revenue Impact

With your current configuration:
- **Banner Ads**: Consistent revenue from high-visibility placement
- **Interstitial Ads**: Higher eCPM from strategic placement
- **App Open Ads**: Additional revenue from app launches
- **Premium Option**: Users can remove ads with subscription

This multi-format approach maximizes revenue while maintaining good user experience.
