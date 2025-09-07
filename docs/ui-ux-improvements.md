# UI/UX Improvements for Locker Room Talk App

## Introduction

This document provides a comprehensive analysis and improvement suggestions for the UI/UX of the Locker Room Talk app, a React Native mobile application for anonymous dating reviews and community discussions. The app uses Expo (SDK 53), Tailwind CSS (via NativeWind), Reanimated for animations, Zustand for state management, and Supabase for backend services (authentication, database, realtime, storage). Additional integrations include Firebase for chat and notifications, AI APIs (OpenAI, Anthropic, Grok) for moderation and chat enhancements, and Expo for push notifications.

The analysis covers every screen, component, feature, and backend integration based on a full codebase scan using tools like search_files for patterns (e.g., spacing classes, console logs for bugs) and read_file for key docs like APP_RUNBOOK.md. Suggestions focus on enhancing usability, accessibility, performance, and visual consistency, including minor tweaks like spacing adjustments (e.g., standardizing padding/margins to py-6 for headers and space-y-6 for form sections to improve breathing room and touch targets). Code examples use Tailwind classes for frontend fixes and pseudocode for backend optimizations.

Goals:
- **Frontend UX**: Smoother interactions, better visual hierarchy, responsive layouts.
- **Backend Integration UX**: Reduced latency (optimistic updates, caching), better error handling, real-time feedback.
- **Accessibility**: ARIA labels, sufficient contrast, keyboard navigation.
- **Performance**: Lazy loading, virtualization (e.g., FlashList).
- **Consistency**: Dark theme enforcement, standard spacing (e.g., 24px/6 units for sections).

Scan Findings:
- **Bugs/Inconsistencies**: Frequent console.error/warn in services (e.g., auth state mismatches in authUtils.ts, fallback to mock data in reviewsStore.ts potentially causing data sync issues). No TODO/FIXME tags, but unhandled realtime subscription errors in realtimeChat.ts. Inconsistent error handling across APIs (e.g., image-generation.ts throws errors without user-friendly messages).
- **Spacing Issues**: Inconsistent use of py-3/py-4, px-4/px-3; gaps missing in flex rows; absolute positioning causing overlaps on small screens.
- **Overall**: Strong dark theme, but lacks responsive variants; realtime features (chat, notifications) need better offline UX.

## General Improvements

### Spacing and Layout Consistency
- **Issue**: Inconsistent padding/margins across screens (e.g., py-4 in headers vs. py-6 in forms). This affects visual rhythm and touch targets on mobile. Search revealed 263 spacing class matches, with py-3 common in comments but py-2 in buttons, leading to cramped UIs.
- **Suggestion**: Standardize to py-6 (24px) for headers/sections, space-y-6 for vertical stacks, px-6 for content padding. Use safe-area insets for edges. Introduce gap-4 for flex layouts to reduce manual margins.
- **Code Example (Update Header in BrowseScreen.tsx)**:
  ```
  ------- SEARCH
  <View className="bg-black px-4 py-4">
  =======
  <View className="bg-black px-6 py-6">
  +++++++ REPLACE
  ```
  This increases vertical space for better readability on smaller devices.
- **Minor Suggestion**: In components like MessageBubble.tsx, change my-1 to my-2 for better message separation.

### Animations and Transitions
- **Issue**: Some transitions feel abrupt (e.g., modal presentations). Reanimated is used but not consistently (e.g., no entering/exiting in ConfirmationModal.tsx).
- **Suggestion**: Add fade/slide animations to all modals and list items. Use withSpring for natural feel. For carousels (ImageCarousel.tsx), add smooth scroll snapping.
- **Code Example (Add Fade to ReportModal in BrowseScreen.tsx)**:
  ```
  <ReportModal
    visible={showReportModal}
    // Add animation props if component supports
    entering={FadeIn}
    exiting={FadeOut}
  />
  ```
  Import FadeIn/FadeOut from 'react-native-reanimated'.

### Accessibility
- **Issue**: Missing semantic labels for icons/buttons (e.g., Pressables in LikeDislikeButtons.tsx lack accessibilityLabel). Contrast issues in light elements on dark bg.
- **Suggestion**: Add accessibilityLabel to Pressables/Ionicons. Ensure contrast ratios >4.5:1 using tools like WAVE. Support VoiceOver for media uploads.
- **Code Example (Add Label to Like Button)**:
  ```
  ------- SEARCH
  <Pressable onPress={handleLike} className="flex-row items-center bg-brand-red/10 px-3 py-2 rounded-full">
  =======
  <Pressable accessibilityLabel="Like review" onPress={handleLike} className="flex-row items-center bg-brand-red/10 px-3 py-2 rounded-full">
  +++++++ REPLACE
  ```

### Performance
- **Issue**: Large lists (e.g., reviews in BrowseScreen) without virtualization in some places; no memoization in heavy components like EnhancedReviewCard.tsx.
- **Suggestion**: Use FlashList everywhere (already in some screens). Memoize components with React.memo. Lazy load images in MediaGallery.tsx.
- **Code Example (Memoize ReviewCard)**:
  ```
  ------- SEARCH
  export const ReviewCard = ({ review }) => {
  =======
  const ReviewCard = React.memo(({ review }) => {
  +++++++ REPLACE
  ```

## Screen-by-Screen Improvements

### AppNavigator.tsx (Navigation Structure)
- **Current UX**: Bottom tabs with floating create button, stack for auth/modals. Dark headers consistent.
- **Issues**: Tab bar height=80 too tall on iPhone SE; floating button absolute bottom-16 may overlap on notch devices; auth flow lacks back button prevention. No haptic feedback on tab switches.
- **Suggestions**: 
  - Reduce tabBarStyle height to 60, paddingBottom:4.
  - Use safeAreaView for floating button positioning.
  - Add gesture handlers for modals (e.g., swipe down to dismiss CreateReview).
  - Backend: Ensure navigation guards for guest mode via authStore.
- **Minor Spacing**: tabBarStyle paddingTop:4 to paddingTop:6 for icon breathing room.
- **Code Example (Update Tab Style)**:
  ```
  ------- SEARCH
  tabBarStyle: {
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2F",
    paddingBottom: 8,
    paddingTop: 8,
    height: 80,
  },
  =======
  tabBarStyle: {
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2F",
    paddingBottom: 4,
    paddingTop: 6,
    height: 60,
  },
  +++++++ REPLACE
  ```
- **Bug**: Potential infinite re-renders if state changes trigger navigation; fix with useFocusEffect.

### AuthScreen.tsx (Authentication Flow)
- **Current UX**: Centralized sign-in/up with logo, social media inputs, error banners.
- **Issues**: Form sections cramped (py-3), no progress indicators for API calls; guest mode toggle lacks confirmation. SocialMediaInput uses inconsistent px-4/py-3.
- **Suggestions**: Add loading spinner during auth; use FormSection for better organization. Improve error UX with inline validation.
- **Minor Spacing**: Change py-3 in inputs to py-4 for larger touch targets.
- **Code Example (Add Spacing to SocialMediaInput)**:
  ```
  ------- SEARCH
  className={`flex-row items-center bg-surface-800 border rounded-xl px-4 py-3 ${
  =======
  className={`flex-row items-center bg-surface-800 border rounded-xl px-4 py-4 ${
  +++++++ REPLACE
  ```
- **Backend**: Supabase auth in authStore.ts has warnings for state mismatches; implement retry logic for session fetch.

### BrowseScreen.tsx (Home Feed)
- **Current UX**: Black header with logo/guest badge, location/distance filters, category tabs, StaggeredGrid for reviews, overlays for error/empty, AdBanner.
- **Issues**: Header py-4 compact on small screens; mt-4 between sections feels cramped; absolute overlays may clip on scroll; AdBanner at bottom obstructs. StaggeredGrid p-4 inconsistent with px-6 elsewhere.
- **Suggestions**: 
  - Increase header py-6 for better touch targets.
  - Use conditional rendering for empty/error instead of absolute to avoid z-index issues.
  - Integrate infinite scroll feedback (e.g., skeleton loaders in StaggeredGrid).
  - Backend: reviewsStore.ts falls back to mock data on Supabase failure – add user notification and retry button.
- **Minor Spacing**: Add space-y-6 to section stacks.
- **Code Example (Fix Header Spacing)**:
  ```
  ------- SEARCH
  <View className="bg-black px-4 py-4">
  =======
  <View className="bg-black px-6 py-6 space-y-6">
  +++++++ REPLACE
  ```
- **Bug**: OfflineBanner absolute top-0 may overlap header; use z-index or integrate into header.

### ChatRoomScreen.tsx (Chat Interface)
- **Current UX**: Header with room info/members, message list with bubbles, input with attachments/emojis, typing indicators, member list modal.
- **Issues**: Message bubbles my-1 too tight; input px-3 py-2 cramped for typing; realtime updates lack smooth animations. Member list py-3 borders inconsistent.
- **Suggestions**: Use gap-2 for message list; add auto-scroll with animation. Enhance typing indicator with dots animation.
- **Minor Spacing**: Change my-1 to my-2 in MessageBubble; py-3 to py-4 in input.
- **Code Example (Improve Message Spacing)**:
  ```
  ------- SEARCH
  <View className={`w-full my-1 ${isOwn ? "items-end" : "items-start"}`}>
  =======
  <View className={`w-full my-2 ${isOwn ? "items-end" : "items-start"}`}>
  +++++++ REPLACE
  ```
- **Backend**: realtimeChat.ts has console.errors on subscription failures; implement exponential backoff and offline queue.

### ChatroomsScreen.tsx (Chat List)
- **Current UX**: Search bar, segmented tabs (active/joined), ChatRoomCard list, empty state.
- **Issues**: px-4 py-4 header cramped; cards mb-4 but no gap in list; search input pr-12 tight.
- **Suggestions**: Use FlatList with keyExtractor for performance; add pull-to-refresh.
- **Minor Spacing**: Add gap-4 to card list.
- **Code Example (Add Gap to List)**:
  ```
  ------- SEARCH
  <Pressable onPress={() => onPress?.(room)} className="bg-surface-800 border border-border rounded-2xl p-4 mb-4">
  =======
  <Pressable onPress={() => onPress?.(room)} className="bg-surface-800 border border-border rounded-2xl p-4">
  +++++++ REPLACE
  // Then wrap in FlatList with ItemSeparatorComponent={<View className="h-4" />}
  ```
- **Bug**: chatStore.ts load errors not surfaced to UI; add error banner.

### CreateReviewScreen.tsx (Review Creation)
- **Current UX**: Multi-step form with category/sentiment selectors, text input, media upload, submit button.
- **Issues**: Selectors py-3 too small; textarea h-32 fixed, no auto-resize; error banners p-3 cramped.
- **Suggestions**: Use stepper for multi-step; add character count for text. Validate sentiment before submit.
- **Minor Spacing**: py-3 to py-4 in selectors; add space-y-4 to form fields.
- **Code Example (Improve Selector Spacing)**:
  ```
  ------- SEARCH
  className={`flex-1 items-center justify-center rounded-xl border px-3 py-3 ${
  =======
  className={`flex-1 items-center justify-center rounded-xl border px-3 py-4 ${
  +++++++ REPLACE
  ```
- **Backend**: supabase.ts createReview lacks moderation pre-check; integrate moderation.ts before insert.

### NotificationsScreen.tsx (Notifications)
- **Current UX**: List with unread badges, mark all read button, empty state.
- **Issues**: Items py-3 borders thin; badge px-3 py-1 small on small screens.
- **Suggestions**: Group by type (e.g., likes, comments); add swipe actions for quick read/mark.
- **Minor Spacing**: py-3 to py-4 for items; increase badge py-1.5.
- **Code Example (Fix Item Spacing)**:
  ```
  ------- SEARCH
  className={`px-4 py-3 border-b border-surface-700 ${item.isRead ? "bg-surface-900" : "bg-surface-800"}`}
  =======
  className={`px-4 py-4 border-b border-surface-700 ${item.isRead ? "bg-surface-900" : "bg-surface-800"}`}
  +++++++ REPLACE
  ```
- **Bug**: notificationStore.ts unread count updates fail silently; add toast on error.

### OnboardingScreen.tsx (Initial Setup)
- **Current UX**: Logo, description, stats cards, continue button.
- **Issues**: py-8 content tight; stats justify-around uneven on wide screens.
- **Suggestions**: Add swipe-through slides; personalize based on location.
- **Minor Spacing**: py-8 to py-12; use space-x-4 for stats.
- **Code Example**:
  ```
  ------- SEARCH
  <View className="flex-1 px-6 py-8">
  =======
  <View className="flex-1 px-6 py-12 space-y-6">
  +++++++ REPLACE
  ```

### PersonProfileScreen.tsx (Profile View)
- **Current UX**: Gradient header, stats cards, action buttons, reviews list.
- **Issues**: Cards p-6 but mb-6 uneven; reviews gap-2 too small.
- **Suggestions**: Add follow button; lazy load reviews.
- **Minor Spacing**: space-y-4 for sections; gap-4 for flags.
- **Code Example (Fix Review Gap)**:
  ```
  ------- SEARCH
  <View className="flex-row flex-wrap gap-2 mb-4">
  =======
  <View className="flex-row flex-wrap gap-4 mb-4">
  +++++++ REPLACE
  ```
- **Backend**: Fetch reviews with pagination to avoid large payloads.

### ProfileScreen.tsx (User Profile/Settings)
- **Current UX**: Settings list, theme toggle, account actions.
- **Issues**: List items p-4 borders thin; guest banner p-4 cramped.
- **Suggestions**: Add search for settings; confirm dialogs for destructive actions.
- **Minor Spacing**: p-4 to p-5 for items.
- **Code Example**:
  ```
  ------- SEARCH
  <Pressable className="flex-row items-center justify-between p-4 border-b border-surface-700"
  =======
  <Pressable className="flex-row items-center justify-between p-5 border-b border-surface-700"
  +++++++ REPLACE
  ```
- **Bug**: themeStore.ts toggle lacks persistence check; sync with AsyncStorage.

### ReviewDetailScreen.tsx (Review View)
- **Current UX**: Hero section, content card, flags, actions, comments.
- **Issues**: px-6 mb-8 tight; flags gap-2 small.
- **Suggestions**: Expandable content; threaded comments view.
- **Minor Spacing**: space-y-6 for sections; gap-3 for flags.
- **Code Example**:
  ```
  ------- SEARCH
  <View className="flex-row flex-wrap gap-2">
  =======
  <View className="flex-row flex-wrap gap-3">
  +++++++ REPLACE
  ```

### SearchScreen.tsx (Search)
- **Current UX**: Search input, tabs (reviews/comments/messages), results list.
- **Issues**: Input pr-12 tight; results p-4 but no separators.
- **Suggestions**: Debounced search; filters sidebar.
- **Minor Spacing**: py-3 to py-4 for results.
- **Code Example**:
  ```
  ------- SEARCH
  className="bg-surface-800 rounded-lg p-4"
  =======
  className="bg-surface-800 rounded-lg p-5 mb-4"
  +++++++ REPLACE
  ```
- **Bug**: Search errors not cleared on new query; add useEffect cleanup.

### SignInScreen.tsx / SignUpScreen.tsx (Auth Forms)
- **Current UX**: Similar to AuthScreen; form with validation.
- **Issues**: Inputs py-3 small; footer pb-8 uneven.
- **Suggestions**: Password strength meter; biometric login.
- **Minor Spacing**: py-3 to py-4.
- **Code Example (Common Input Fix)**:
  ```
  ------- SEARCH
  className="bg-surface-800 border border-border rounded-xl px-4 py-3 text-text-primary"
  =======
  className="bg-surface-800 border border-border rounded-xl px-4 py-4 text-text-primary"
  +++++++ REPLACE
  ```
- **Backend**: authUtils.ts mismatches – add periodic sync timer.

### DeleteAccountScreen.tsx (Account Deletion)
- **Current UX**: Confirmation form with reason input.
- **Issues**: p-6 content tight; button py-4 standard but disabled state lacks animation.
- **Suggestions**: Add data export option before delete.
- **Minor Spacing**: space-y-6 for form.
- **Code Example**:
  ```
  ------- SEARCH
  <View className="px-4 py-6">
  =======
  <View className="px-6 py-8 space-y-6">
  +++++++ REPLACE
  ```
- **Bug**: No confirmation email; implement via Supabase function.

## Component Improvements

### AdBanner.tsx
- **Issue**: Absolute bottom pb-2 overlaps content; text-xs too small.
- **Suggestion**: Use fixed position with safe area; increase text-sm.
- **Minor Spacing**: py-3 to py-4.
- **Code Example**:
  ```
  ------- SEARCH
  <View className="w-11/12 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 items-center">
  =======
  <View className="w-11/12 bg-surface-800 border border-surface-700 rounded-xl px-4 py-4 items-center">
  +++++++ REPLACE
  ```

### AnimatedButton.tsx / AnimatedInput.tsx
- **Issue**: Sizes py-2/3/4 inconsistent; no loading state.
- **Suggestion**: Standardize to py-3 px-6; add spinner prop.
- **Minor Spacing**: Base to py-3 px-6.

### ChatInput.tsx
- **Issue**: px-3 py-2 input cramped; attachments space-x-4 uneven.
- **Suggestion**: Use gap-4; auto-focus on mount.
- **Minor Spacing**: py-2 to py-3.

### CommentInput.tsx / CommentSection.tsx
- **Issue**: py-3 comments tight; ml-8 for replies hard-coded.
- **Suggestion**: Use nested indentation with pl-8; add reply chain visuals.
- **Minor Spacing**: py-3 to py-4.
- **Code Example**:
  ```
  ------- SEARCH
  <View className={`py-3 ${isReply ? "ml-8" : ""}`}>
  =======
  <View className={`py-4 ${isReply ? "ml-8 pl-4" : ""}`}>
  +++++++ REPLACE
  ```
- **Bug**: No moderation on submit; call moderation.ts.

### ConfirmationModal.tsx / ReportModal.tsx
- **Issue**: p-6 modal content tight; buttons py-4 but no gap.
- **Suggestion**: Add space-y-4; backdrop tap to dismiss.
- **Minor Spacing**: py-4 to py-5 for buttons.

### DistanceFilter.tsx / LocationSelector.tsx
- **Issue**: py-4 header cramped; list items border-b thin.
- **Suggestion**: Add search debounce; current location loading spinner.
- **Minor Spacing**: py-3 to py-4 for items.

### EmptyState.tsx / LoadingSpinner.tsx
- **Issue**: py-12 fixed, not responsive; icons size=48 static.
- **Suggestion**: Use flex-1 with min-h; scale icons responsively.
- **Minor Spacing**: px-6 to px-8.

### EnhancedReviewCard.tsx / ReviewCard.tsx / ProfileCard.tsx
- **Issue**: p-6 consistent but flags gap-2 small; skeletons lack timing.
- **Suggestion**: Animate flag reveals; use ReviewSkeleton for all.
- **Minor Spacing**: gap-3 for flags.
- **Code Example**:
  ```
  ------- SEARCH
  <View className="flex-row flex-wrap gap-2">
  =======
  <View className="flex-row flex-wrap gap-3">
  +++++++ REPLACE
  ```
- **Bug**: Like counts not synced realtime; subscribe to updates.

### ImageCarousel.tsx / MediaViewer.tsx / MediaUploadGrid.tsx
- **Issue**: Controls p-3 small; counter px-3 py-1.5 tight.
- **Suggestion**: Add pinch zoom; compress images on upload.
- **Minor Spacing**: p-3 to p-4 for nav buttons.

### LikeDislikeButtons.tsx
- **Issue**: px-4 py-3 buttons good, but counts px-2 py-0.5 tiny.
- **Suggestion**: Merge into single reaction bar.
- **Minor Spacing**: py-0.5 to py-1 for counts.

### OfflineBanner.tsx
- **Issue**: py-3 banner overlaps; no retry animation.
- **Suggestion**: Slide down on offline detect; integrate with useOffline hook.
- **Minor Spacing**: py-3 to py-4.

### SegmentedTabs.tsx
- **Issue**: py-3 tabs tight on touch.
- **Suggestion**: Add underline animation.
- **Minor Spacing**: py-3 to py-4.

## Backend & Feature Improvements

### Authentication (authStore.ts, supabase.ts)
- **Current UX**: Session sync via listener; guest mode.
- **Issues**: Warnings for mismatches; no multi-device sync.
- **Suggestions**: Add biometric auth; email verification flow.
- **Fix**: Implement reconciliation in getAuthenticatedUser.
- **Code Example (Pseudocode for Sync)**:
  ```
  useEffect(() => {
    const reconcile = async () => {
      if (storeMismatch) {
        await supabase.auth.refreshSession();
        updateStore();
      }
    };
    reconcile();
  }, [user]);
  ```
- **Bug**: console.warn in authUtils.ts – suppress only after 3 retries; log to Sentry.

### Chat Features (chatStore.ts, realtimeChat.ts)
- **Current UX**: Realtime messages, typing, presence.
- **Issues**: Subscription errors timed out; no message search.
- **Suggestions**: Add message editing/deletion; end-to-end encryption hint.
- **Fix**: Exponential backoff in subscribeToRoom.
- **Code Example**:
  ```
  ------- SEARCH
  console.error(`⏰ Subscription timed out for room ${roomId}`);
  =======
  console.error(`⏰ Subscription timed out for room ${roomId}`);
  setTimeout(() => subscribeToRoom(roomId), 5000 * Math.pow(2, retryCount));
  +++++++ REPLACE
  ```
- **Inconsistency**: websocketService.ts unused? Migrate to Supabase realtime.

### Notifications (notificationService.ts, notificationStore.ts)
- **Current UX**: Expo push, unread count, mark read.
- **Issues**: console.error on token register; no do-not-disturb.
- **Suggestions**: Rich notifications with images; batching for high volume.
- **Fix**: Handle Device.isDevice false gracefully.
- **Code Example**:
  ```
  ------- SEARCH
  console.warn('Push notifications only work on physical devices');
  =======
  console.warn('Push notifications only work on physical devices');
  Alert.alert('Info', 'Push notifications require a physical device.');
  +++++++ REPLACE
  ```
- **Bug**: Failed to get preferences returns null without fallback.

### Moderation & AI (moderation.ts, api/openai.ts etc.)
- **Current UX**: Backend-only; flags in reviews.
- **Issues**: console.error on parse; defaults to approved on failure (risky).
- **Suggestions**: Add user-reported moderation queue; AI confidence scores in UI.
- **Fix**: Retry on API failure up to 3 times.
- **Code Example (Pseudocode)**:
  ```
  let retries = 0;
  while (retries < 3) {
    try {
      const response = await moderateContent(content);
      return parseResponse(response);
    } catch (e) {
      retries++;
      await delay(1000 * retries);
    }
  }
  throw new Error('Moderation failed after retries');
  ```

### Reviews & Comments (reviewsStore.ts, commentsStore.ts)
- **Current UX**: CRUD with media, likes, flags.
- **Issues**: Mock fallback on error; no optimistic updates.
- **Suggestions**: Add edit/delete for own reviews; sentiment analysis UI.
- **Fix**: Remove mock fallback; show offline error instead.
- **Code Example**:
  ```
  ------- SEARCH
  console.warn("Supabase failed, using mock data:", error);
  =======
  console.error("Supabase failed:", error);
  setError('Failed to load reviews. Please check connection.');
  +++++++ REPLACE
  ```
- **Inconsistency**: reviews_firebase vs Supabase tables; migrate fully to Supabase.

### Storage & Media (storageService.ts)
- **Current UX**: Upload grid, viewer, thumbnails.
- **Issues**: Compression fails silently; signed URLs expire without refresh.
- **Suggestions**: Progress bar for uploads; gallery view.
- **Fix**: Handle compression error with user alert.
- **Code Example**:
  ```
  ------- SEARCH
  console.error('Image compression error:', error);
  return uri; // Return original if compression fails
  =======
  console.error('Image compression error:', error);
  Alert.alert('Warning', 'Image not compressed. Upload may be large.');
  return uri;
  +++++++ REPLACE
  ```

### Realtime & Subscriptions (websocketService.ts, supabase realtime)
- **Current UX**: Live chat, notifications.
- **Issues**: Channel errors not retried; presence sync warnings.
- **Suggestions**: Add read receipts; offline message queue.
- **Fix**: Auto-reconnect on CHANNEL_ERROR.

## Bugs & Inconsistencies Summary
- **Auth Mismatches**: Frequent warnings in authUtils.ts – potential for ghost sessions. Fix: Add debounce to listener.
- **Error Logging**: 146 console.error instances; centralize with logger service (e.g., integrate Bugsnag).
- **Data Fallbacks**: Mock data in reviewsStore.ts risks stale UI; use local-first with sync.
- **Realtime Failures**: Timed out subscriptions in realtimeChat.ts; add max retries=5.
- **No TODOs**: Clean code, but add JSDoc for complex functions like handleSupabaseError.

- **Inconsistencies**: Mixed Firebase/Supabase tables (e.g., reviews_firebase); full migration needed. Env vars not validated in all services.

## Additional Bugs & Inconsistencies

### Silent Error Handling in Catch Blocks
- **Issue**: Many catch blocks (e.g., in notificationService.ts, storageService.ts) use console.error but continue execution without propagating errors or user feedback, leading to silent failures. Scan found ~50 such instances where errors are logged but not handled (e.g., push token registration fails but app proceeds).
- **Suggestion**: Always re-throw or return error states; integrate with errorHandling.ts for consistent toasts/alerts.
- **Code Example (Fix in notificationService.ts)**:
  ```
  ------- SEARCH
  } catch (error) {
    console.error('Failed to register push token:', error);
  } else {
  =======
  } catch (error) {
    console.error('Failed to register push token:', error);
    throw new Error('Push registration failed: ' + error.message); // Propagate for UI handling
  } else {
  +++++++ REPLACE
  ```
- **Impact**: Users miss notifications without knowing why; potential for desynced state.

### Race Conditions in Realtime Presence and Subscriptions
- **Issue**: In realtimeChat.ts, presence sync and message loading use concurrent awaits without locks, risking race conditions (e.g., multiple retries overlapping). Warnings like "Presence tracking attempt failed" indicate retries without coordination.
- **Suggestion**: Use AbortController for cancellations; implement a queue for subscriptions.
- **Code Example (Add Abort in realtimeChat.ts)**:
  ```
  ------- SEARCH
  } catch (error) {
    console.warn(`Presence tracking attempt ${4 - retries} failed:`, error);
    retries--;
  =======
  } catch (error) {
    if (!signal.aborted) {
      console.warn(`Presence tracking attempt ${4 - retries} failed:`, error);
    }
    retries--;
  +++++++ REPLACE
  // Use new AbortController() before calls
  ```
- **Impact**: Duplicate messages or stale presence; crashes on rapid joins/leaves.

### Missing Null/Undefined Checks in API Responses
- **Issue**: API services (e.g., openai.ts, grok.ts) assume response.data exists without checks, causing crashes if null (e.g., "Grok API key not found" warns but proceeds with undefined). Similar in transcribe-audio.ts where errorData may be undefined.
- **Suggestion**: Add optional chaining and defaults; validate responses before parsing.
- **Code Example (Fix in image-generation.ts)**:
  ```
  ------- SEARCH
  console.error("[AssetGenerationService] Error response:", errorData);
  throw new Error(`Image generation API error: ${response.status} ${JSON.stringify(errorData)}`);
  =======
  const safeError = errorData || { message: 'Unknown error' };
  console.error("[AssetGenerationService] Error response:", safeError);
  throw new Error(`Image generation API error: ${response.status} ${JSON.stringify(safeError)}`);
  +++++++ REPLACE
  ```
- **Impact**: App crashes on invalid API responses; poor offline/edge case UX.

### Inconsistent Row Level Security (RLS) in Supabase
- **Issue**: supabase.ts queries (e.g., getTrendingNames) lack RLS enforcement checks; potential for data leaks if policies not set (e.g., users table allows SELECT without auth). No validation in services/moderation.ts for user-owned data.
- **Suggestion**: Add .maybeSingle() for user-specific queries; test RLS with supabaseTestSuite.ts.
- **Code Example (Add Auth Check in supabase.ts)**:
  ```
  ------- SEARCH
  } catch (error: any) {
    console.error("Error getting trending names:", error);
    return [];
  =======
  } catch (error: any) {
    if (!supabase.auth.getUser()) throw new Error('Unauthorized');
    console.error("Error getting trending names:", error);
    return [];
  +++++++ REPLACE
  ```
- **Impact**: Security vulnerabilities; unauthorized access to profiles/reviews.

### Memory Leaks in Event Listeners and Subscriptions
- **Issue**: Realtime subscriptions in realtimeChat.ts and websocketService.ts not cleaned up on unmount (e.g., no unsubscribe in useEffect cleanup), leading to leaks on screen navigations. notificationStore.ts updates without dependency arrays.
- **Suggestion**: Use useEffect with returns for cleanup; track active subscriptions.
- **Code Example (Add Cleanup in chatStore.ts)**:
  ```
  ------- SEARCH
  } catch (error) {
    console.error("Error in subscription setup:", error);
  =======
  } catch (error) {
    console.error("Error in subscription setup:", error);
  } finally {
    return () => channel.unsubscribe(); // Cleanup
  }
  +++++++ REPLACE
  ```
- **Impact**: Increased memory usage over time; app slowdowns on long sessions.

### Validation Gaps in Form Inputs and Media Uploads
- **Issue**: CommentInput.tsx and MediaUploadGrid.tsx lack client-side validation (e.g., empty comments submitted, oversized media without warnings). storageService.ts compression returns original without size check.
- **Suggestion**: Add useForm hooks with yup validation; cap media size at 10MB.
- **Code Example (Add Validation in CommentInput.tsx)**:
  ```
  ------- SEARCH
  <TextInput
    className={`bg-surface-700 rounded-2xl px-4 py-3 text-text-primary max-h-24 ${
  =======
  <TextInput
    onSubmitEditing={handleSubmit}
    blurOnSubmit={false}
    className={`bg-surface-700 rounded-2xl px-4 py-3 text-text-primary max-h-24 ${
    text.length < 3 ? 'border-red-500' : '' // Min length validation
  +++++++ REPLACE
  ```
- **Impact**: Invalid data submission; server rejections after user effort.


These additional findings from deeper pattern analysis (e.g., catch swallowing, missing guards) highlight critical areas for robustness. Prioritize security-related bugs first.

## Further Bugs & Inconsistencies

### Hardcoded Mock Data Conflicts and Fallback Issues
- **Issue**: In chatStore.ts, mockChatRooms use hardcoded UUIDs that may conflict with real Supabase IDs during hybrid mock/real use. loadChatRooms falls back to mocks on error without logging or user notification, and loadMembers always uses mocks without attempting real fetch. This leads to inconsistent data (e.g., stale rooms after network recovery).
- **Suggestion**: Use dynamic UUID generation for mocks or disable mocks in production; add toggle for mock mode via env var; implement fallback with retry and offline indicator.
- **Code Example (Dynamic Mock in chatStore.ts)**:
  ```
  ------- SEARCH
  const mockChatRooms: ChatRoom[] = [
    {
      id: "86250edc-5520-48da-b9cd-0c28982b6148",
  =======
  const mockChatRooms: ChatRoom[] = [
    {
      id: `mock_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  +++++++ REPLACE
  ```
- **Impact**: Data desync, user sees outdated chats; hard to debug in prod.

### Optimistic Update Inconsistencies and Cleanup Leaks
- **Issue**: sendMessage adds optimistic temp messages but only filters on error – if server succeeds but local add fails, duplicates occur. addTypingUser uses setTimeout(3000) for auto-remove but doesn't clear on unmount or user leave, causing memory leaks and ghost typing indicators. Duplicate addMessage/addMessageImmediate functions risk maintenance errors.
- **Suggestion**: Use unique temp IDs with server confirmation removal; store timeouts in ref for cleanup; consolidate functions.
- **Code Example (Cleanup Timeout in chatStore.ts)**:
  ```
  ------- SEARCH
  setTimeout(() => {
    get().removeTypingUser(typingUser.userId, typingUser.chatRoomId);
  }, 3000);
  =======
  const timeoutRef = useRef<NodeJS.Timeout>();
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => {
    get().removeTypingUser(typingUser.userId, typingUser.chatRoomId);
  }, 3000);
  // Cleanup in useEffect return
  +++++++ REPLACE
  ```
- **Impact**: UI glitches (dupe/ghost messages), memory leaks on navigation.

### Inefficient Realtime Subscriptions and Error Swallowing
- **Issue**: onMessagesSnapshot in supabase.ts fetches ALL messages on every change – O(n) inefficiency for large rooms. chatStore.ts subscribeToMessages lacks error handling in callback (e.g., if Supabase errors, state not updated). startListeningToMessages returns unsubscribe but store doesn't call it on leaveChatRoom.
- **Suggestion**: Use incremental updates (insert only new); add try-catch in callbacks; call unsubscribe on leave.
- **Code Example (Error Handling in Callback for chatStore.ts)**:
  ```
  ------- SEARCH
  realtimeChatService.subscribeToMessages(roomId, (messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: messages,
      },
    }));
  });
  =======
  realtimeChatService.subscribeToMessages(roomId, (messages) => {
    try {
      set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: messages,
        },
      }));
    } catch (e) {
      console.error('Subscription update error:', e);
    }
  });
  +++++++ REPLACE
  ```
- **Impact**: High battery/network use; missed updates on errors; leaks on room switches.

### State Persistence Bloat and Race Conditions in Auth Integration
- **Issue**: partialize in chatStore.ts persists entire messages object – can bloat AsyncStorage (e.g., 100+ messages/room). requireAuthentication in actions (e.g., sendMessage) may race with auth listener changes, causing stale user in optimistic updates. Debounce in authStore.ts timeout not cleared on listener unsubscribe.
- **Suggestion**: Persist only metadata (e.g., room IDs, last seen); use latest auth state snapshot before async calls; add cleanup for timeouts.
- **Code Example (Limit Persist in chatStore.ts)**:
  ```
  ------- SEARCH
  partialize: (state) => ({
    chatRooms: state.chatRooms,
    messages: state.messages,
    members: state.members,
    roomCategoryFilter: (state as any).roomCategoryFilter,
  }),
  =======
  partialize: (state) => ({
    chatRooms: state.chatRooms,
    messages: {}, // Don't persist messages to avoid bloat
    members: state.members,
    roomCategoryFilter: (state as any).roomCategoryFilter,
  }),
  +++++++ REPLACE
  ```
- **Impact**: App crashes on storage full; auth races lead to failed sends.

### Query Sanitization Gaps and Aggregation Duplicates
- **Issue**: supabase.ts searchProfiles aggregation uses simple key concat for uniqueness but may duplicate if location varies slightly (e.g., "New York" vs "NYC"); sanitization replaces but doesn't escape all for ilike. getTrendingNames limits to 100 but no dedup.
- **Suggestion**: Use canonical location normalization; add DISTINCT in Supabase query; dedup post-fetch.
- **Code Example (Add Dedup in supabase.ts getTrendingNames)**:
  ```
  ------- SEARCH
  return Array.from(nameCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
  =======
  const uniqueNames = new Set(Array.from(nameCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name));
  return Array.from(uniqueNames);
  +++++++ REPLACE
  ```
- **Impact**: Inaccurate trending; potential injection if sanitization misses.


These further findings from file-specific analysis (authStore.ts races, supabase.ts inefficiencies, chatStore.ts leaks) emphasize need for robust error propagation and cleanup. Test with tools like npm run verify:backend.

## Expanded Bugs from Core Files

### Stale Data from Optimistic Updates and Incomplete Fallbacks
- **Issue**: In reviewsStore.ts, createReview adds review locally before server save, but on failure only console.warns without rollback (stale review remains). loadReviews mock fallback on error doesn't reset pagination state (hasMore stays true, infinite load attempts). dislikeReview is a stub that only logs, inconsistent with likeReview's full implementation.
- **Suggestion**: On server error, remove optimistic entry and show toast; implement dislike backend call; reset hasMore=false on fallback.
- **Code Example (Rollback on Failure in reviewsStore.ts)**:
  ```
  ------- SEARCH
  supabaseReviews.createReview(reviewData).catch((error) => {
    console.warn("Failed to save review to Supabase (but it's still visible locally):", error);
  });
  =======
  supabaseReviews.createReview(reviewData).catch((error) => {
    console.warn("Failed to save review to Supabase:", error);
    // Rollback optimistic update
    get().deleteReview(newReview.id);
    set({ error: 'Failed to save review. Please try again.' });
  });
  +++++++ REPLACE
  ```
- **Impact**: Users see unsaved reviews; inconsistent like/dislike; endless loading.

### Media Handling and Validation Weaknesses
- **Issue**: createReview media upload compresses but warns on failure and uses original without size check (risk of large files crashing upload). No type validation (allows non-image media without warning). partialize persists media URIs in storage, bloating AsyncStorage with potentially hundreds of entries.
- **Suggestion**: Add max size check (e.g., 10MB) and reject; use local refs for media instead of persisting URIs; validate type before manipulateAsync.
- **Code Example (Add Size Check in reviewsStore.ts)**:
  ```
  ------- SEARCH
  } catch (uploadError) {
    console.warn("Failed to upload media, using original URI:", uploadError);
    uploadedMedia.push(mediaItem);
  =======
  } catch (uploadError) {
    if (mediaItem.size > 10 * 1024 * 1024) {
      throw new Error('Media file too large (max 10MB)');
    }
    console.warn("Failed to upload media, using original URI:", uploadError);
    uploadedMedia.push(mediaItem);
  +++++++ REPLACE
  ```
- **Impact**: App crashes on large media; storage overflow slows app startup.

### Notification and State Sync Gaps
- **Issue**: likeReview creates notification but catches notifyErr with warn only, no retry or user feedback (user likes but author never notified). No dedup in addReview (if concurrent loads, duplicates possible). filters set doesn't trigger reload.
- **Suggestion**: Retry notifications with exponential backoff; use Set for dedup in setReviews; add useEffect for filter changes to reload.
- **Code Example (Retry Notification in reviewsStore.ts)**:
  ```
  ------- SEARCH
  } catch (notifyErr) {
    console.warn("Failed to create like notification:", notifyErr);
  }
  =======
  } catch (notifyErr) {
    console.warn("Failed to create like notification:", notifyErr);
    // Retry once after delay
    setTimeout(() => notificationService.createNotification(...), 1000);
  }
  +++++++ REPLACE
  ```
- **Impact**: Missed notifications; duplicate reviews clutter UI; filters don't update dynamically.


These expanded findings from reviewsStore.ts analysis highlight CRUD and media issues. Combined with prior scans, this covers core functionality. Full file-by-file review confirms clean code but needs these robustness enhancements.

## Config and Error Handling Bugs

### Environment and Init Validation Gaps
- **Issue**: supabase.ts validates env vars and throws on missing, but no fallback for dev (e.g., mock client); console.error logs URL/key before throw, potential leak if captured. No check for service role key in functions.
- **Suggestion**: Add dev fallback to local Supabase; mask logs fully; validate all env in a central verify function.
- **Code Example (Fallback in supabase.ts)**:
  ```
  ------- SEARCH
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase configuration");
    throw new Error(
      "Missing Supabase configuration: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  }
  =======
  if (!supabaseUrl || !supabaseAnonKey) {
    if (__DEV__) {
      console.warn("Using mock Supabase in dev due to missing env");
      // Mock client for dev
      return createMockClient();
    }
    console.error("Missing Supabase configuration");
    throw new Error(
      "Missing Supabase configuration: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  }
  +++++++ REPLACE
  ```
- **Impact**: App unusable in misconfigured env; security leak in logs.

### Incomplete Error Mapping and Sensitive Logging
- **Issue**: handleSupabaseError covers HTTP but misses PostgREST errors (e.g., PGRST116 no row returns generic); console.error("Supabase error:", error) logs full object with sensitive data (e.g., tokens). No custom codes for realtime disconnects.
- **Suggestion**: Extend switch for PostgREST; sanitize error before log; add realtime error types.
- **Code Example (Add PostgREST in handleSupabaseError)**:
  ```
  ------- SEARCH
  if (error?.status) {
    switch (error.status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
  =======
  if (error?.code && error.code.startsWith('PGRST')) {
    switch (error.code) {
      case 'PGRST116':
        return "No data found. Please try again.";
      default:
        return `Database error (${error.code}). Please try again.`;
    }
  }
  if (error?.status) {
    switch (error.status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
  +++++++ REPLACE
  ```
- **Impact**: Vague errors confuse users; logs expose PII/tokens.

### PKCE and Session Handling Inconsistencies
- **Issue**: flowType: 'pkce' set but no custom verifier/state generation for RN (defaults may collide); isAuthenticatedAsync uses getUser but ignores session expiry (getSession needed for full check); autoRefreshToken true but no manual refresh on 401.
- **Suggestion**: Implement custom PKCE with crypto.randomUUID; use getSession in isAuthenticatedAsync; add refresh on error.
- **Code Example (Custom PKCE in supabase.ts)**:
  ```
  ------- SEARCH
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: __DEV__,
  },
  =======
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    // Custom PKCE for RN
    pkce: {
      generateCodeVerifier: () => crypto.randomUUID().replace(/-/g, ''),
      generateCodeChallenge: async (verifier) => {
        // Implement SHA256 challenge
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }
    },
    debug: __DEV__,
  },
  +++++++ REPLACE
  ```
- **Impact**: Auth failures in multi-tab or offline; session ghosts post-expiry.

These config bugs from supabase.ts affect app stability. With scans of stores, services, config, and prior patterns, this exhaustive review identifies key issues for a production-ready app.

## Navigation and Screen-Specific Bugs

### AppNavigator.tsx Tab Bar and Floating Button Issues
- **Issue**: Tab bar height of 80 is excessive on smaller devices like iPhone SE (320px width). Floating create button uses `absolute bottom-16` which doesn't account for safe area insets, potentially overlapping with home indicator on newer iPhones. No haptic feedback on tab switches reduces tactile feedback.
- **Suggestion**: Use responsive tab bar height based on screen size; implement safe area aware positioning for floating button; add haptic feedback using Expo Haptics.
- **Code Example (Responsive Tab Bar)**:
  ```
  ------- SEARCH
  tabBarStyle: {
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2F",
    paddingBottom: 8,
    paddingTop: 8,
    height: 80,
  },
  =======
  tabBarStyle: {
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2F",
    paddingBottom: 8,
    paddingTop: 8,
    height: screenWidth < 375 ? 65 : 80, // Responsive height
  },
  +++++++ REPLACE
  ```
- **Impact**: Poor UX on small devices; button overlap issues; reduced accessibility.

### CreateReviewScreen.tsx Form Validation and Draft Management Issues
- **Issue**: Draft saving uses `setTimeout(400ms)` which may not save on rapid navigation. Form validation only checks for required fields but doesn't validate data quality (e.g., minimum text length, appropriate media). No progress indicator for multi-step form completion. Auto-save conflicts with manual save attempts.
- **Suggestion**: Implement proper draft debouncing; add comprehensive validation; show form progress; handle save conflicts.
- **Code Example (Improved Draft Saving)**:
  ```
  ------- SEARCH
  useEffect(() => {
    const save = setTimeout(() => {
      AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          firstName,
          selectedLocation,
          reviewText,
          sentiment,
          category,
          media,
          socialMedia,
        }),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(save);
  }, [firstName, selectedLocation, reviewText, sentiment, category, media, socialMedia]);
  =======
  const draftTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    draftTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            firstName,
            selectedLocation,
            reviewText,
            sentiment,
            category,
            media,
            socialMedia,
            lastSaved: Date.now(),
          }),
        );
      } catch (error) {
        console.warn('Failed to save draft:', error);
      }
    }, 1000); // Increased debounce time

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [firstName, selectedLocation, reviewText, sentiment, category, media, socialMedia]);
  +++++++ REPLACE
  ```
- **Impact**: Lost draft data; poor form validation; confusing save states.

### ChatRoomScreen.tsx Message Loading and Subscription Issues
- **Issue**: FlashList `estimatedItemSize={64}` is too small for messages with media or long text, causing layout jumps. "Load older messages" button doesn't show loading state or handle failures gracefully. Message subscription doesn't handle reconnection after network interruption. Typing indicators don't clear on component unmount.
- **Suggestion**: Use dynamic item size estimation; add proper loading states; implement reconnection logic; clean up typing indicators.
- **Code Example (Dynamic Item Size)**:
  ```
  ------- SEARCH
  <FlashList
    ref={listRef}
    data={roomMessages}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <MessageBubble message={item} onReply={handleReply} onReact={handleReact} />}
    estimatedItemSize={64}
  =======
  <FlashList
    ref={listRef}
    data={roomMessages}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <MessageBubble message={item} onReply={handleReply} onReact={handleReact} />}
    estimatedItemSize={item => {
      // Dynamic sizing based on content
      const baseSize = 64;
      const textLength = item.content?.length || 0;
      const hasMedia = item.mediaUrl ? 200 : 0;
      return baseSize + Math.min(textLength * 0.5, 100) + hasMedia;
    }}
  +++++++ REPLACE
  ```
- **Impact**: Poor scrolling performance; confusing loading states; lost messages on network issues.

### ProfileScreen.tsx Settings Organization and Guest Mode Issues
- **Issue**: Settings list lacks search functionality making it hard to find options in longer lists. Guest mode banner takes up significant space but doesn't provide quick actions. Theme toggle doesn't provide immediate visual feedback. No confirmation for destructive actions like logout.
- **Suggestion**: Add settings search; optimize guest banner; improve theme feedback; add action confirmations.
- **Code Example (Add Settings Search)**:
  ```
  ------- SEARCH
  <ScrollView className="flex-1">
    <View className="px-4 py-6">
  =======
  const [searchQuery, setSearchQuery] = useState('');
  const filteredSettings = useMemo(() => {
    if (!searchQuery) return allSettings;
    return allSettings.filter(setting =>
      setting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allSettings]);

  <ScrollView className="flex-1">
    <View className="px-4 py-6">
      {/* Search Bar */}
      <View className="mb-6">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search settings..."
          className="bg-surface-800 rounded-lg px-4 py-3 text-text-primary"
        />
      </View>
  +++++++ REPLACE
  ```
- **Impact**: Poor settings discoverability; inefficient guest mode UX; jarring theme transitions.

### ReviewDetailScreen.tsx Content Display and Interaction Issues
- **Issue**: Hero section uses fixed `px-6 mb-8` spacing that doesn't adapt to content length. Flag display uses `gap-2` which is too tight for touch targets. Comment section doesn't implement threaded replies properly. No content sharing functionality despite being a social app.
- **Suggestion**: Use adaptive spacing; improve flag touch targets; implement proper threading; add sharing features.
- **Code Example (Adaptive Hero Spacing)**:
  ```
  ------- SEARCH
  <View className="px-6 mb-8">
    {/* Person Name */}
    <Text className="text-4xl font-bold text-text-primary mb-3">{review.reviewedPersonName}</Text>
  =======
  <View className={`px-6 ${review.reviewText.length > 200 ? 'mb-6' : 'mb-8'}`}>
    {/* Person Name */}
    <Text className="text-4xl font-bold text-text-primary mb-3" numberOfLines={2}>
      {review.reviewedPersonName}
    </Text>
  +++++++ REPLACE
  ```
- **Impact**: Poor content hierarchy; difficult flag interaction; limited social features.

## Service Layer and API Integration Bugs

### Authentication Service Race Conditions and Session Management
- **Issue**: `authUtils.ts` has warnings about auth state mismatches indicating race conditions between Supabase auth listener and local state updates. Session refresh doesn't handle concurrent requests properly. Guest mode transitions don't clear sensitive data from previous sessions.
- **Suggestion**: Implement proper auth state synchronization; add request deduplication; ensure data cleanup on mode switches.
- **Code Example (Fix Auth Race Condition)**:
  ```
  ------- SEARCH
  export const requireAuthentication = async (): Promise<User> => {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error("Authentication required");
    }
    return user;
  };
  =======
  let authPromise: Promise<User | null> | null = null;

  export const requireAuthentication = async (): Promise<User> => {
    // Deduplicate concurrent auth checks
    if (!authPromise) {
      authPromise = getAuthenticatedUser();
    }

    const user = await authPromise;
    authPromise = null; // Reset for next call

    if (!user) {
      throw new Error("Authentication required");
    }
    return user;
  };
  +++++++ REPLACE
  ```
- **Impact**: Auth state inconsistencies; session conflicts; data leaks between user modes.

### Realtime Service Connection Management and Error Recovery
- **Issue**: `realtimeChat.ts` has subscription timeouts without proper retry logic. Connection state isn't exposed to UI for user feedback. Presence tracking fails silently without user notification. Channel errors don't trigger reconnection attempts.
- **Suggestion**: Implement exponential backoff retry; expose connection state; add presence error handling; auto-reconnect on channel errors.
- **Code Example (Add Connection State)**:
  ```
  ------- SEARCH
  export class RealtimeChatService {
    private supabase: SupabaseClient;
    private channels: Map<string, RealtimeChannel> = new Map();
  =======
  export class RealtimeChatService {
    private supabase: SupabaseClient;
    private channels: Map<string, RealtimeChannel> = new Map();
    private connectionState: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
    private connectionListeners: Set<(state: string) => void> = new Set();

    public onConnectionStateChange(listener: (state: string) => void) {
      this.connectionListeners.add(listener);
      return () => this.connectionListeners.delete(listener);
    }

    private notifyConnectionState(state: 'connected' | 'connecting' | 'disconnected') {
      this.connectionState = state;
      this.connectionListeners.forEach(listener => listener(state));
    }
  +++++++ REPLACE
  ```
- **Impact**: Poor connection reliability; no user feedback on connection issues; silent failures.

### Storage Service File Management and Cleanup Issues
- **Issue**: `storageService.ts` doesn't implement file cleanup for failed uploads or deleted content. Signed URLs expire without refresh mechanism. Image compression fails silently returning original file without size validation. No progress tracking for large file uploads.
- **Suggestion**: Implement file cleanup routines; add URL refresh mechanism; validate compressed file sizes; add upload progress tracking.
- **Code Example (Add File Cleanup)**:
  ```
  ------- SEARCH
  export const uploadMedia = async (file: File, path: string): Promise<string> => {
    try {
      const compressedFile = await compressImage(file);
      return await supabaseStorage.uploadFile('media', path, compressedFile);
    } catch (error) {
      console.error('Media upload failed:', error);
      throw error;
    }
  };
  =======
  export const uploadMedia = async (
    file: File,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    let uploadedPath: string | null = null;

    try {
      const compressedFile = await compressImage(file);

      // Validate compressed file size
      if (compressedFile.size > 10 * 1024 * 1024) {
        throw new Error('File too large after compression');
      }

      uploadedPath = await supabaseStorage.uploadFile('media', path, compressedFile, onProgress);
      return uploadedPath;
    } catch (error) {
      // Cleanup failed upload
      if (uploadedPath) {
        try {
          await supabaseStorage.deleteFile('media', uploadedPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError);
        }
      }

      console.error('Media upload failed:', error);
      throw error;
    }
  };
  +++++++ REPLACE
  ```
- **Impact**: Storage bloat from failed uploads; broken media links; poor upload UX.

## Input and Form Component Specific Issues

### ChatInput.tsx Media Handling and Keyboard Management
- **Issue**: Emoji picker shows/hides without smooth transitions causing jarring UX. Attachment menu doesn't close when keyboard appears, causing overlap. Voice recording feature shows "coming soon" alert instead of proper implementation or hiding the feature. Input height animation doesn't account for multiline text properly.
- **Suggestion**: Add smooth transitions for emoji picker; implement proper keyboard avoidance; either implement voice recording or hide the feature; fix multiline input height calculation.
- **Code Example (Fix Keyboard Overlap)**:
  ```
  ------- SEARCH
  const toggleEmojis = () => {
    setShowEmojis(!showEmojis);
    emojiScale.value = withSpring(showEmojis ? 0 : 1);
  };

  const toggleAttachments = () => {
    setShowAttachments(!showAttachments);
    attachmentScale.value = withSpring(showAttachments ? 0 : 1);
  };
  =======
  const toggleEmojis = () => {
    // Close attachments when opening emojis
    if (!showEmojis && showAttachments) {
      setShowAttachments(false);
      attachmentScale.value = withSpring(0);
    }

    setShowEmojis(!showEmojis);
    emojiScale.value = withSpring(showEmojis ? 0 : 1, {
      damping: 15,
      stiffness: 300,
    });
  };

  const toggleAttachments = () => {
    // Close emojis when opening attachments
    if (!showAttachments && showEmojis) {
      setShowEmojis(false);
      emojiScale.value = withSpring(0);
    }

    setShowAttachments(!showAttachments);
    attachmentScale.value = withSpring(showAttachments ? 0 : 1, {
      damping: 15,
      stiffness: 300,
    });
  };
  +++++++ REPLACE
  ```
- **Impact**: Poor keyboard UX; confusing feature availability; jarring animations.

### CommentInput.tsx Character Limit and Submission Issues
- **Issue**: Character counter only appears after 400 characters, giving no early warning. No validation prevents submission of empty or whitespace-only comments. Loading state doesn't prevent multiple rapid submissions. Focus management doesn't work properly with reply cancellation.
- **Suggestion**: Show character counter earlier; add proper validation; implement submission debouncing; fix focus management.
- **Code Example (Improve Character Counter)**:
  ```
  ------- SEARCH
  {comment.length > 400 && (
    <Text className="text-text-muted text-xs mt-1 text-right">{comment.length}/500</Text>
  )}
  =======
  <View className="flex-row justify-between items-center mt-1">
    {comment.length > 0 && (
      <Text className={`text-xs ${comment.length > 450 ? 'text-red-400' : 'text-text-muted'}`}>
        {comment.length}/500
      </Text>
    )}
    {comment.length > 450 && (
      <Text className="text-red-400 text-xs">
        {500 - comment.length} characters remaining
      </Text>
    )}
  </View>
  +++++++ REPLACE
  ```
- **Impact**: Unexpected character limit hits; empty comment submissions; multiple submissions.

### AnimatedInput.tsx Focus States and Error Display
- **Issue**: Focus animation doesn't reset properly when component unmounts while focused. Error animation plays every time error prop changes, even for the same error. Right icon press handler doesn't provide haptic feedback. Border color animation doesn't support custom error colors.
- **Suggestion**: Add proper cleanup for focus animations; prevent duplicate error animations; add haptic feedback; support custom error colors.
- **Code Example (Fix Focus Cleanup)**:
  ```
  ------- SEARCH
  const handleBlur = (event: any) => {
    setIsFocused(false);
    focusAnimation.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    });
    onBlur?.(event);
  };
  =======
  const handleBlur = (event: any) => {
    setIsFocused(false);
    focusAnimation.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    });
    onBlur?.(event);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      focusAnimation.value = 0;
      errorAnimation.value = 0;
    };
  }, []);
  +++++++ REPLACE
  ```
- **Impact**: Animation glitches; poor error UX; missing tactile feedback.

## List and Grid Component Performance Issues

### StaggeredGrid.tsx Memory Management and Scroll Performance
- **Issue**: `MemoizedProfileCard` doesn't have proper dependency array for memoization, causing unnecessary re-renders. Height calculation runs on every render instead of being memoized. Skeleton loading doesn't match actual content layout. Footer spacing of `h-20` is arbitrary and doesn't account for different tab bar heights.
- **Suggestion**: Fix memoization dependencies; cache height calculations; improve skeleton accuracy; use dynamic footer spacing.
- **Code Example (Fix Memoization)**:
  ```
  ------- SEARCH
  const MemoizedProfileCard = memo(ProfileCard);
  =======
  const MemoizedProfileCard = memo(ProfileCard, (prevProps, nextProps) => {
    return (
      prevProps.review.id === nextProps.review.id &&
      prevProps.cardHeight === nextProps.cardHeight &&
      prevProps.isLiked === nextProps.isLiked
    );
  });
  +++++++ REPLACE
  ```
- **Impact**: Poor scroll performance; excessive re-renders; layout inconsistencies.

### FlashList Implementation and Data Handling
- **Issue**: Multiple screens use FlashList but with inconsistent `estimatedItemSize` values. No error boundaries around list rendering causing crashes on malformed data. Pull-to-refresh doesn't provide proper loading feedback. Empty states don't account for loading vs. no data scenarios.
- **Suggestion**: Standardize FlashList configurations; add error boundaries; improve refresh feedback; distinguish loading from empty states.
- **Code Example (Add List Error Boundary)**:
  ```
  ------- SEARCH
  <FlashList
    data={itemsWithHeights}
    renderItem={renderItem}
    numColumns={2}
    estimatedItemSize={280}
  =======
  <ErrorBoundary fallback={<Text className="text-red-400 p-4">Failed to load list</Text>}>
    <FlashList
      data={itemsWithHeights}
      renderItem={renderItem}
      numColumns={2}
      estimatedItemSize={280}
      onError={(error) => {
        console.error('FlashList error:', error);
        // Report to crash analytics
      }}
  +++++++ REPLACE
  ```
- **Impact**: App crashes on data issues; poor loading UX; confusing empty states.

## Theme and Visual Consistency Issues

### Color System and Dark Theme Implementation
- **Issue**: Hardcoded colors throughout components don't respect theme changes. Brand colors lack sufficient contrast ratios for accessibility. No system theme detection for automatic theme switching. Color opacity values are inconsistent (e.g., `/10`, `/20`, `/30` used arbitrarily).
- **Suggestion**: Implement proper theme system; ensure accessibility compliance; add system theme detection; standardize opacity values.
- **Code Example (Theme-Aware Colors)**:
  ```
  ------- SEARCH
  <View className="bg-brand-red/20 border border-brand-red/30 rounded-lg p-4 mb-6">
  =======
  <View className={`${theme.colors.brand.background} ${theme.colors.brand.border} rounded-lg p-4 mb-6`}>
  +++++++ REPLACE
  // Where theme.colors.brand provides proper contrast ratios
  ```
- **Impact**: Poor accessibility; inconsistent theming; jarring theme transitions.

### Typography and Text Rendering Issues
- **Issue**: Text components don't handle RTL languages properly. Font sizes are hardcoded without responsive scaling. Line height values don't account for different font families. No text selection handling for important content like review text.
- **Suggestion**: Add RTL support; implement responsive typography; fix line heights; enable text selection where appropriate.
- **Code Example (Responsive Typography)**:
  ```
  ------- SEARCH
  <Text className="text-4xl font-bold text-text-primary mb-3">{review.reviewedPersonName}</Text>
  =======
  <Text
    className={`${getResponsiveTextSize('4xl')} font-bold text-text-primary mb-3`}
    selectable={true}
    style={{ writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}
  >
    {review.reviewedPersonName}
  </Text>
  +++++++ REPLACE
  ```
- **Impact**: Poor internationalization; readability issues; limited text interaction.

## Accessibility and Inclusive Design Gaps

### Screen Reader and VoiceOver Support
- **Issue**: Many interactive elements lack proper accessibility labels. Complex components like image carousels don't provide proper navigation hints. Form validation errors aren't announced to screen readers. Loading states don't provide audio feedback.
- **Suggestion**: Add comprehensive accessibility labels; implement proper navigation hints; ensure error announcements; add loading announcements.
- **Code Example (Improve Carousel Accessibility)**:
  ```
  ------- SEARCH
  <Pressable onPress={() => setCurrentIndex(index)}>
    <View className={`w-2 h-2 rounded-full mx-1 ${index === currentIndex ? "bg-white" : "bg-white/50"}`} />
  </Pressable>
  =======
  <Pressable
    onPress={() => setCurrentIndex(index)}
    accessibilityRole="button"
    accessibilityLabel={`Go to image ${index + 1} of ${images.length}`}
    accessibilityState={{ selected: index === currentIndex }}
  >
    <View className={`w-2 h-2 rounded-full mx-1 ${index === currentIndex ? "bg-white" : "bg-white/50"}`} />
  </Pressable>
  +++++++ REPLACE
  ```
- **Impact**: Inaccessible to users with disabilities; poor screen reader experience.

### Touch Target Sizes and Motor Accessibility
- **Issue**: Many buttons and interactive elements are smaller than the recommended 44x44pt minimum touch target size. Close buttons and small icons are particularly problematic. No support for switch control or other assistive input methods.
- **Suggestion**: Ensure minimum touch target sizes; add proper hit slop; implement assistive input support.
- **Code Example (Fix Touch Targets)**:
  ```
  ------- SEARCH
  <Pressable onPress={onClose} className="p-2">
    <Ionicons name="close" size={20} color="#FFFFFF" />
  </Pressable>
  =======
  <Pressable
    onPress={onClose}
    className="p-3"
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityLabel="Close"
    accessibilityRole="button"
  >
    <Ionicons name="close" size={20} color="#FFFFFF" />
  </Pressable>
  +++++++ REPLACE
  ```
- **Impact**: Difficult interaction for users with motor impairments; frustrating touch experience.

## Additional Component-Level Bugs & Improvements

### StaggeredGrid.tsx Performance and Layout Issues
- **Issue**: Fixed card width calculation `(screenWidth - 48) / 2` doesn't account for dynamic safe areas or different screen densities. Manual margin calculations `marginRight: index % 2 === 0 ? 8 : 0` create inconsistent spacing. Height calculation uses random variation that may cause layout jumps on re-renders.
- **Suggestion**: Use Dimensions.addEventListener for responsive updates; replace manual margins with FlashList's built-in spacing; cache height calculations to prevent recalculation.
- **Code Example (Fix Responsive Width)**:
  ```
  ------- SEARCH
  const { width: screenWidth } = Dimensions.get("window");
  const cardWidth = (screenWidth - 48) / 2;
  =======
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);
  const cardWidth = (screenData.width - 48) / 2;
  +++++++ REPLACE
  ```
- **Impact**: Layout breaks on device rotation; inconsistent spacing across devices; performance issues on re-renders.

### MessageBubble.tsx Animation and Accessibility Gaps
- **Issue**: Long press delay of 500ms too short for accessibility users. Reaction animations use `reactionScale.value = 0` without cleanup, causing memory leaks. Missing accessibility labels for reaction buttons and reply indicators. System messages use fixed styling without theme support.
- **Suggestion**: Increase long press delay to 800ms; add cleanup for animations; implement proper accessibility labels; make system messages themeable.
- **Code Example (Fix Accessibility)**:
  ```
  ------- SEARCH
  <Pressable
    onLongPress={handleLongPress}
    delayLongPress={500}
    className={`${isOwn ? "bg-brand-red" : "bg-surface-700"} max-w-[80%] rounded-2xl px-3 py-2 relative`}
  >
  =======
  <Pressable
    onLongPress={handleLongPress}
    delayLongPress={800}
    accessibilityLabel={`Message from ${message.senderName}: ${message.content}`}
    accessibilityHint="Long press for options"
    className={`${isOwn ? "bg-brand-red" : "bg-surface-700"} max-w-[80%] rounded-2xl px-3 py-2 relative`}
  >
  +++++++ REPLACE
  ```
- **Impact**: Poor accessibility for users with motor impairments; memory leaks on frequent message interactions.

### ReviewCard.tsx Data Safety and Interaction Issues
- **Issue**: No null checks for `review.reviewedPersonName.charAt(0)` - crashes if name is empty. `formatDate` doesn't handle invalid dates. Like button lacks haptic feedback and loading state. Truncation at 120 characters is arbitrary and doesn't consider line breaks.
- **Suggestion**: Add null safety checks; implement proper date validation; add haptic feedback and loading states; use intelligent text truncation.
- **Code Example (Add Safety Checks)**:
  ```
  ------- SEARCH
  <Text className="text-white font-bold text-lg">{review.reviewedPersonName.charAt(0).toUpperCase()}</Text>
  =======
  <Text className="text-white font-bold text-lg">
    {(review.reviewedPersonName || 'A').charAt(0).toUpperCase()}
  </Text>
  +++++++ REPLACE
  ```
- **Impact**: App crashes on malformed data; poor user feedback during interactions.

### AnimatedButton.tsx State Management and Loading Issues
- **Issue**: Loading spinner uses `animate-spin` class which may not work consistently across platforms. Disabled state only shows opacity change without preventing multiple taps. No haptic feedback on press. Loading state doesn't prevent rapid successive calls.
- **Suggestion**: Use Reanimated for cross-platform spinner; add proper disabled state handling; implement haptic feedback; debounce rapid presses.
- **Code Example (Fix Loading Spinner)**:
  ```
  ------- SEARCH
  <Animated.View className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
  =======
  <Animated.View
    style={[spinnerAnimatedStyle]}
    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
  />
  +++++++ REPLACE
  // Add spinner animation with useSharedValue and withRepeat
  ```
- **Impact**: Inconsistent loading indicators; accidental double-submissions; poor tactile feedback.

### FormSection.tsx Validation Display and Spacing Issues
- **Issue**: Error/success messages use fixed `p-3` padding that's cramped on small screens. Validation icons are static without animation. Required asterisk uses `text-xl` which may be too large. Section divider `h-px` too thin for accessibility.
- **Suggestion**: Use responsive padding; animate validation state changes; adjust asterisk size; increase divider thickness.
- **Code Example (Improve Error Display)**:
  ```
  ------- SEARCH
  <View className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
  =======
  <Animated.View
    entering={FadeInDown}
    className="mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
  >
  +++++++ REPLACE
  ```
- **Impact**: Poor error visibility; jarring validation state changes; accessibility issues with thin dividers.

### MediaUploadGrid.tsx File Validation and Error Handling Gaps
- **Issue**: No file size validation before upload - can crash on large files. Image quality hardcoded to 0.8 without user control. Video duration limit of 60 seconds not enforced client-side. Error handling shows generic alerts without retry options.
- **Suggestion**: Add file size checks (max 10MB); provide quality options; enforce duration limits; implement retry mechanisms.
- **Code Example (Add File Size Check)**:
  ```
  ------- SEARCH
  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    const newMediaItem: MediaItem = {
  =======
  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];

    // Check file size (assuming asset has fileSize property)
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert("File Too Large", "Please select a file smaller than 10MB");
      return;
    }

    const newMediaItem: MediaItem = {
  +++++++ REPLACE
  ```
- **Impact**: App crashes on large files; poor user control over media quality; confusing error messages.

### SocialMediaInput.tsx Validation Logic and UX Issues
- **Issue**: Username validation removes `@` prefix but doesn't validate platform-specific requirements (e.g., Instagram min 1 char, Twitter max 15). Error states don't clear when switching between inputs. Platform colors hardcoded without dark theme variants. Clear button lacks confirmation for accidental taps.
- **Suggestion**: Implement platform-specific validation rules; improve error state management; add theme-aware colors; add clear confirmation.
- **Code Example (Improve Validation)**:
  ```
  ------- SEARCH
  const validateUsername = (platform: SocialPlatform, value: string): string | null => {
    if (!value) return null;

    // Remove @ prefix if user typed it
    const cleanValue = value.startsWith("@") ? value.slice(1) : value;

    if (!platform.pattern.test(cleanValue)) {
      return `Invalid ${platform.label} username format`;
    }

    return null;
  };
  =======
  const validateUsername = (platform: SocialPlatform, value: string): string | null => {
    if (!value) return null;

    // Remove @ prefix if user typed it
    const cleanValue = value.startsWith("@") ? value.slice(1) : value;

    // Platform-specific length validation
    if (platform.key === 'instagram' && cleanValue.length < 1) {
      return "Instagram username must be at least 1 character";
    }
    if (platform.key === 'twitter' && cleanValue.length > 15) {
      return "Twitter username cannot exceed 15 characters";
    }

    if (!platform.pattern.test(cleanValue)) {
      return `Invalid ${platform.label} username format`;
    }

    return null;
  };
  +++++++ REPLACE
  ```
- **Impact**: Invalid usernames pass validation; confusing error states; poor accessibility in dark theme.

## Error Handling and User Feedback Improvements

### ErrorBoundary.tsx Recovery and Logging Issues
- **Issue**: Error boundary only logs to console without crash reporting integration. "Go to Home" button just retries instead of actual navigation. No error categorization or user-friendly error messages. Dev error display shows full stack trace which may contain sensitive info.
- **Suggestion**: Integrate crash reporting (Sentry/Bugsnag); implement proper navigation; categorize errors; sanitize dev error display.
- **Code Example (Add Error Categorization)**:
  ```
  ------- SEARCH
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  =======
  componentDidCatch(error: Error, errorInfo: any) {
    const errorCategory = this.categorizeError(error);
    console.error(`ErrorBoundary caught ${errorCategory} error:`, error.message);

    // Send to crash reporting service
    if (!__DEV__) {
      // crashlytics.recordError(error);
    }

    this.props.onError?.(error, errorInfo);
  }

  private categorizeError(error: Error): string {
    if (error.message.includes('Network')) return 'NETWORK';
    if (error.message.includes('Permission')) return 'PERMISSION';
    return 'UNKNOWN';
  }
  +++++++ REPLACE
  ```
- **Impact**: Lost crash data; confusing recovery options; potential security leaks in dev mode.

### OfflineBanner.tsx Network Detection and UX Issues
- **Issue**: Network check uses Google's endpoint as fallback which may be blocked in some regions. Banner appears/disappears too quickly causing UI jank. No progressive retry with exponential backoff. Retry button doesn't show loading state.
- **Suggestion**: Use multiple fallback endpoints; add debouncing for network state changes; implement progressive retry; add loading states.
- **Code Example (Add Debounced Network Check)**:
  ```
  ------- SEARCH
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setIsConnected(connected);
  =======
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout;

    const unsubscribe = NetInfo.addEventListener(state => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        const connected = !!(state.isConnected && state.isInternetReachable);
        setIsConnected(connected);
      }, 1000); // Debounce network changes
  +++++++ REPLACE
  ```
- **Impact**: Banner flickers on unstable connections; poor UX in restricted networks; no feedback during retry attempts.

### LoadingSpinner.tsx Animation and Accessibility Issues
- **Issue**: Spinner animation doesn't respect reduced motion preferences. Color prop doesn't support theme-aware colors. Text prop lacks proper spacing from spinner. No accessibility label for screen readers.
- **Suggestion**: Add reduced motion support; implement theme-aware colors; improve text spacing; add accessibility labels.
- **Code Example (Add Reduced Motion Support)**:
  ```
  ------- SEARCH
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, []);
  =======
  useEffect(() => {
    // Check for reduced motion preference
    const shouldAnimate = !AccessibilityInfo.isReduceMotionEnabled();

    if (shouldAnimate) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }
  }, []);
  +++++++ REPLACE
  ```
- **Impact**: Motion sickness for sensitive users; poor theme integration; inaccessible loading states.

## State Management and Data Flow Issues

### Store Persistence and Memory Management
- **Issue**: Multiple stores persist large objects (messages, media URIs) causing AsyncStorage bloat. No cleanup of old persisted data. State hydration happens synchronously blocking app startup. No error handling for corrupted storage data.
- **Suggestion**: Implement selective persistence; add data cleanup routines; use async hydration; handle storage corruption gracefully.
- **Code Example (Selective Persistence in chatStore.ts)**:
  ```
  ------- SEARCH
  partialize: (state) => ({
    chatRooms: state.chatRooms,
    messages: state.messages,
    members: state.members,
    roomCategoryFilter: (state as any).roomCategoryFilter,
  }),
  =======
  partialize: (state) => ({
    chatRooms: state.chatRooms.slice(0, 50), // Limit persisted rooms
    messages: {}, // Don't persist messages to avoid bloat
    members: Object.fromEntries(
      Object.entries(state.members).slice(0, 100) // Limit persisted members
    ),
    roomCategoryFilter: (state as any).roomCategoryFilter,
  }),
  +++++++ REPLACE
  ```
- **Impact**: App startup delays; storage quota exceeded; data corruption crashes.

### Optimistic Updates and Rollback Mechanisms
- **Issue**: Optimistic updates in reviewsStore and chatStore don't implement proper rollback on failure. Temporary IDs may conflict with server IDs. No user feedback when optimistic updates fail. Race conditions between optimistic and server updates.
- **Suggestion**: Implement proper rollback mechanisms; use UUID for temp IDs; add failure notifications; handle race conditions.
- **Code Example (Proper Rollback in reviewsStore.ts)**:
  ```
  ------- SEARCH
  supabaseReviews.createReview(reviewData).catch((error) => {
    console.warn("Failed to save review to Supabase (but it's still visible locally):", error);
  });
  =======
  const tempReviewId = newReview.id;
  supabaseReviews.createReview(reviewData)
    .then((serverReview) => {
      // Replace temp review with server review
      get().updateReview(tempReviewId, serverReview);
    })
    .catch((error) => {
      console.warn("Failed to save review to Supabase:", error);
      // Remove optimistic review and show error
      get().deleteReview(tempReviewId);
      set({ error: 'Failed to save review. Please try again.' });
    });
  +++++++ REPLACE
  ```
- **Impact**: Stale data in UI; user confusion about save status; data inconsistencies.

## Conclusion
Implementing these changes will significantly enhance the app's UX, making it more polished, accessible, and robust. Prioritize spacing standardization and bug fixes first, followed by error handling improvements and performance optimizations.

**Priority Order:**
1. **Critical Bugs** (crashes, data corruption): 8-10 hours
2. **Accessibility Issues** (labels, contrast, motion): 6-8 hours
3. **Spacing & Layout Consistency**: 4-6 hours
4. **Performance Optimizations**: 6-8 hours
5. **Error Handling & User Feedback**: 8-10 hours

**Total estimated effort: 32-42 hours**

Test thoroughly on iOS/Android emulators and physical devices, especially for accessibility features. For backend changes, run `npm run verify:backend` after modifications. Consider implementing changes incrementally with feature flags to minimize risk.
