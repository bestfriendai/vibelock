# Byterover Handbook

## Layer 1: System Overview

**Purpose**:
The Locker Room Talk app is a mobile application built with Expo React Native, designed for dating reviews and social interactions. Users can create reviews of dating experiences, chat in real-time rooms, manage profiles, and browse location-based content. The app uses Supabase exclusively for authentication, realtime updates, storage, and database operations. Key features include offline handling, push notifications via Expo, AI integrations for content moderation, and comprehensive user safety features.

**Tech Stack**:
- **Frontend**: Expo SDK 53, React Native 0.79.5, React 19.0.0, TypeScript ~5.8.3, NativeWind (Tailwind CSS for RN), Zustand for state management.
- **Backend/Database**: Supabase exclusively (Auth, PostgREST, Realtime, Storage, Edge Functions). Table names contain "firebase" for legacy reasons but all data is in Supabase.
- **Navigation**: React Navigation (bottom-tabs, drawer, stack, material-top-tabs).
- **UI/Components**: Various Expo modules (expo-camera, expo-location, expo-notifications, expo-image-picker), react-native-reanimated, lottie-react-native, react-native-maps, @gorhom/bottom-sheet.
- **AI/Integrations**: @anthropic-ai/sdk, openai for content moderation and chat features.
- **Utilities**: clsx, tailwind-merge, date-fns, uuid, victory-native for charts.
- **Dev Tools**: ESLint, Prettier, Babel, Metro bundler, patch-package for dependencies.
- **Other**: AsyncStorage, expo-secure-store for persistence, Supabase Realtime for websockets.

**Architecture**:  
The application follows a modular client-side architecture typical of React Native apps with a BaaS (Backend-as-a-Service) like Supabase. Key directories:  
- **src/api/**: Handles API calls to AI services (Anthropic, OpenAI, Grok) and chat/transcription.  
- **src/components/**: Reusable UI components for reviews, chats, media, modals, etc.  
- **src/config/**: Configuration for Supabase client.  
- **src/hooks/**: Custom hooks like useOffline for offline support.  
- **src/navigation/**: AppNavigator using React Navigation for routing.  
- **src/screens/**: Main screens for auth, browsing, profiles, reviews, chats, etc.  
- **src/services/**: Business logic services for Supabase interactions, realtime chat, notifications, storage, moderation.  
- **src/state/**: Zustand stores for auth, chat, comments, notifications, reviews, etc.  
- **src/types/**: TypeScript definitions for AI and index types.  
- **src/utils/**: Utility functions for auth, error handling, location, responsive design.  
Overall pattern: MVVM-like with state stores managing data, services abstracting backend calls, and screens composing components. Realtime subscriptions via Supabase and WebSockets.

## Layer 2: Module Map

**Core Modules and Responsibilities**:
- **Auth Module** (src/state/authStore.ts, src/services/supabase.ts, src/utils/authUtils.ts): Handles user authentication, session management, sign-up/sign-in with Supabase Auth, profile creation, and persistence with AsyncStorage.
- **Reviews Module** (src/state/reviewsStore.ts, src/screens/CreateReviewScreen.tsx, src/services/supabase.ts): Manages dating review creation, fetching, and display using Supabase tables. Includes media uploads, content moderation, and location-based filtering.
- **Chat Module** (src/state/chatStore.ts, src/services/realtimeChat.ts): Real-time chat rooms and messages using Supabase Realtime; supports typing indicators, presence tracking, and media in chats.
- **Notifications Module** (src/state/notificationStore.ts, src/services/notificationService.ts, supabase/functions/notifications/): Push notifications via Expo, triggered by Supabase Edge Functions on table inserts.
- **Profile Module** (src/state/subscriptionStore.ts, src/screens/ProfileScreen.tsx): User profiles, basic subscription state, location settings, and app preferences.
- **Media/Storage Module** (src/services/storageService.ts, src/components/MediaUploadGrid.tsx): Handles image/video uploads to Supabase Storage buckets (avatars, evidence, thumbnails, chat-media).
- **UI/Offline Module** (src/hooks/useOffline.ts, src/components/OfflineBanner.tsx): Offline detection and retry logic for network resilience.

**Data Layer**: Supabase exclusively for all data storage (users, reviews_firebase, chat_rooms_firebase, notifications, push_tokens, etc.). Table names contain "firebase" for legacy reasons but all data is stored in Supabase. Utilities in src/utils/ for error handling and location services.

**Utilities**: src/utils/ for responsive styles, cn (class names), supabaseTestSuite for testing.

## Layer 3: Integration Guide

**APIs and Interfaces**:
- **Supabase Client**: Configured in src/config/supabase.ts with URL and anon key from env; used exclusively for auth, queries, realtime subscriptions, and storage.
- **AI APIs**: src/api/openai.ts, src/api/anthropic.ts for content moderation and chat features; uses SDKs with API keys from env.
- **Expo Push Notifications**: Integrated via expo-notifications; tokens stored in Supabase push_tokens table.
- **Realtime**: src/services/realtimeChat.ts subscribes to Supabase channels for chat_rooms_firebase and chat_messages_firebase using Supabase Realtime.
- **External Dependencies**: Expo modules for device features (camera, location, media-library); react-native-maps for location display; no custom routes/endpoints as it's client-only with BaaS.
- **Configuration Files**: .env for secrets (SUPABASE_URL, EXPO_PUBLIC_PROJECT_ID); supabase/config.toml for local Supabase dev; firebase.json/firestore.rules are legacy files (unused).
Integration points: Services act as facades to Supabase client; stores subscribe to service events for state updates.

## Layer 4: Extension Points

**Patterns and Customization Areas**:  
- **Design Patterns**: Hooks for offline/realtime (useOffline.ts); Store pattern with Zustand for global state; Component composition for screens; Error boundaries (ErrorBoundary.tsx) for robustness.  
- **Extension Points**:  
  - Add new stores in src/state/ and integrate with services/screens.  
  - Custom services in src/services/ for new backend features (e.g., extend supabase.ts for new tables).  
  - Plugins via Expo config plugins (expo-build-properties).  
  - AI integrations: Extend src/api/ for new models/providers.  
  - UI Customization: NativeWind classes for theming (src/state/themeStore.ts); responsive utils.  
  - Supabase Edge Functions: Add new functions in supabase/functions/ and deploy.  
  - Recent Changes: Patches for react-native and expo-asset; scripts for env verification and backend tests.  
Customization: Override env vars for different environments; extend navigation in AppNavigator.tsx; add RLS policies in Supabase for new tables.

**Validation Checklist**:  
- [x] All 4 required sections present  
- [x] Architecture pattern identified (Modular client-side MVVM with BaaS)  
- [x] At least 3 core modules documented (Auth, Reviews, Chat, Notifications, etc.)  
- [x] Tech stack matches project reality (from package.json and structure)  
- [x] Extension points or patterns identified (Stores, Services, Hooks, Supabase extensions)
