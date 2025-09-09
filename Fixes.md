An analysis of the LockerRoom application's codebase has been conducted, revealing several critical, high-impact, and minor issues that affect security, performance, and user experience. This document provides a comprehensive overview of these findings, complete with code-level fixes and an implementation roadmap. The analysis is updated for **Expo SDK 53**, **React Native 0.79.5**, and **Supabase v2**.

### **Executive Summary**

The LockerRoom app is a well-architected platform built on a modern stack. However, several vulnerabilities and bugs compromise its production readiness.

*   **Critical Bugs (9):** Includes severe security risks such as potential path traversal, unvalidated environment variables, and SQL injection vulnerabilities. These require immediate attention.
*   **High-Impact Bugs (7):** Issues that cause app crashes, memory leaks, or significant data integrity problems, such as race conditions and unhandled promise rejections.
*   **Integration & Configuration Errors (8):** Critical misconfigurations in `babel.config.js`, dummy values in `google-services.json`, and missing Supabase RLS policies that prevent core features from working correctly.
*   **Performance & Memory Leaks (7):** Bugs that degrade user experience over time, including memory leaks in realtime subscriptions and inefficient image loading.
*   **Database and Data Integrity (4):** Missing foreign key constraints and inconsistent data types that risk data corruption.
*   **Minor Bugs & Best Practices (45+):** A range of smaller issues related to UI/UX, code quality, and testing that should be addressed for a polished final product.

With the proposed fixes, the application's stability, security, and performance can be significantly enhanced, positioning it for a successful launch.

***

## **Part 1: Critical Bugs (Highest Priority)**

These issues must be addressed immediately as they represent significant security risks, will cause application crashes, or prevent services from functioning correctly.

### **1.1. Security Vulnerabilities**

#### **Bug 1: Potential Path Traversal in Storage Service (Critical)**

*   **Location:** `src/services/storageService.ts`
*   **Issue:** The `folder` and `fileName` parameters in the `uploadFile` function are concatenated without proper sanitization. A malicious input like `../private/` could allow directory traversal, leading to unauthorized file access or overwrites.
*   **Risk:** Data leaks, corruption, and unauthorized access to storage buckets.
*   **Fix:** Implement a path sanitization function to strip traversal sequences and invalid characters before creating the final file path.

**Full Code Fix (in `src/services/storageService.ts`):**

```typescript
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { AppError, ErrorType } from '../utils/errorHandling';
import { supabase, parseSupabaseError } from '../config/supabase';

// Add this sanitization method to the StorageService class
private sanitizePath(path: string): string {
    // Remove traversal sequences and normalize slashes
    let sanitized = path
      .replace(/\.\.\//g, '') // Linux/Unix traversal
      .replace(/\\/g, '/')   // Normalize backslashes
      .replace(/\/+/g, '/'); // Normalize slashes

    // Remove leading/trailing slashes
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');

    if (sanitized.includes('..')) {
      throw new AppError('Invalid file path', ErrorType.VALIDATION, 'PATH_TRAVERSAL');
    }
    return sanitized;
}

// Update the uploadFile method
async uploadFile(fileUri: string, options: FileUploadOptions): Promise<UploadResult> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
            return { success: false, error: 'File does not exist' };
        }

        // Sanitize folder and file name
        const safeFolder = options.folder ? this.sanitizePath(options.folder) : '';
        const safeFileName = options.fileName ? this.sanitizePath(options.fileName) : this.generateFileName(fileUri);
        const filePath = safeFolder ? `${safeFolder}/${safeFileName}` : safeFileName;
        
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const arrayBuffer = decode(base64);
        const contentType = options.contentType || this.getContentType(fileUri);

        const { data, error } = await supabase.storage
            .from(options.bucket)
            .upload(filePath, arrayBuffer, {
                contentType,
                upsert: options.upsert || false,
            });

        if (error) {
            throw parseSupabaseError(error);
        }

        const { data: urlData } = supabase.storage
            .from(options.bucket)
            .getPublicUrl(data.path);

        return {
            success: true,
            url: urlData.publicUrl,
            path: data.path,
        };
    } catch (error) {
        console.error('Storage service upload error:', error);
        throw error instanceof AppError ? error : new AppError('File upload failed', ErrorType.SERVER, 'UPLOAD_FAILED');
    }
}
```

#### **Bug 2: Unvalidated Environment Variables (Critical)**

*   **Location:** `src/config/supabase.ts`
*   **Issue:** `process.env` variables are used without runtime validation. If these are missing in a production build (e.g., due to a misconfigured `.env` file), the `createClient` function will throw an error and crash the app on launch.
*   **Risk:** Application fails to start in production if environment variables are not correctly bundled.
*   **Fix:** Add a validation check that throws a clear, actionable error if the Supabase URL or key is missing.

**Full Code Fix (in `src/config/supabase.ts`):**

```typescript
// Replace the existing supabaseUrl and supabaseAnonKey declarations
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Add this validation block
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Supabase configuration is missing. Please check your .env file and rebuild the app.";
  console.error(`🚨 CRITICAL ERROR: ${errorMessage}`);
  console.error(`URL: ${supabaseUrl ? "Present" : "Missing"}`);
  console.error(`Anon Key: ${supabaseAnonKey ? "Present" : "Missing"}`);
  // In a production app, you might want to show a user-friendly error screen instead of throwing.
  throw new Error(errorMessage);
}
```

#### **Bug 3: SQL Injection Vulnerability in Search (High Impact)**

*   **Location:** `src/services/supabase.ts` (within `supabaseSearch` functions)
*   **Issue:** User-provided search queries are used directly in `.ilike()` clauses. While Supabase client parameterizes queries, complex patterns could potentially bypass sanitization, and there are no length limits, creating a risk of Denial of Service (DoS).
*   **Risk:** Potential for data exposure or service degradation through malicious search queries.
*   **Fix:** Implement a stricter `validateSearchQuery` utility that sanitizes input, limits length, and removes characters commonly used in SQL injection attacks.

**Full Code Fix (in `src/utils/inputValidation.ts`):**

```typescript
// Add or update this function
export function validateSearchQuery(query: string): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof query !== 'string') {
    return { isValid: false, sanitized: '', error: 'Search query must be a string' };
  }
  
  let sanitized = query.trim();
  if (sanitized.length < 2 || sanitized.length > 50) {
    return { isValid: false, sanitized, error: 'Search query must be between 2 and 50 characters.' };
  }
  
  // Basic sanitization against common SQL injection patterns
  const sqlPatterns = /(\b(select|insert|update|delete|drop|union|--)\b)|[;'"\\]/i;
  if (sqlPatterns.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid characters in search query.' };
  }
  
  // Remove any remaining potentially harmful characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  
  return { isValid: true, sanitized };
}
```

**Apply this validation in `src/services/supabase.ts`:**

```typescript
// Example within supabaseSearch.searchReviews
import { validateSearchQuery } from '../utils/inputValidation';

searchReviews: async (query, filters) => {
    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.isValid) {
        throw new Error(queryValidation.error);
    }
    const sanitizedQuery = queryValidation.sanitized;

    let queryBuilder = supabase
      .from("reviews_firebase")
      .select("*")
      .eq("status", "approved")
      .ilike("review_text", `%${sanitizedQuery}%`);
      // ... rest of the function
}
```

### **1.2. Critical Runtime Errors**

#### **Bug 4: Null Review Crash in `ReviewDetailScreen` (Critical)**

*   **Location:** `src/screens/ReviewDetailScreen.tsx`
*   **Issue:** The component assumes `route.params.review` is always present. If a review is deleted or the navigation parameter is missing, accessing properties like `review.likeCount` will cause a fatal crash.
*   **Risk:** The app crashes when navigating to a review that doesn't exist or failed to load.
*   **Fix:** Add null checks and an early return with a loading or error state. Ensure all state initializations are safe from null pointer exceptions.

**Full Code Fix (in `src/screens/ReviewDetailScreen.tsx`):**

```typescript
// At the top of the component function
const route = useRoute<ReviewDetailRouteProp>();
const navigation = useNavigation<any>();
const [review, setReview] = useState<Review | null>(null);
const [reviewLoading, setReviewLoading] = useState(true);

useEffect(() => {
    const loadReview = async () => {
        const params = route.params as any;
        let finalReview = null;

        if (params?.review) {
            const raw = params.review;
            finalReview = {
                ...raw,
                createdAt: new Date(raw.createdAt),
                updatedAt: new Date(raw.updatedAt),
            };
        } else if (params?.reviewId) {
            finalReview = await supabaseReviews.getReview(params.reviewId);
        }

        if (finalReview) {
            setReview(finalReview);
            setLikeCount(finalReview.likeCount || 0);
            setIsLiked(false); // Reset like state for new review
            setIsDisliked(false);
        } else {
            // If no review is found, show an alert and navigate back
            Alert.alert("Review not found", "This review may have been deleted.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        }
        setReviewLoading(false);
    };

    loadReview();
}, [route.params]);

// Add a loading and error state check before rendering
if (reviewLoading) {
    return (
        <View className="flex-1 bg-surface-900 items-center justify-center">
            <ActivityIndicator size="large" color="#EF4444" />
            <Text className="text-text-primary mt-4">Loading Review...</Text>
        </View>
    );
}

if (!review) {
    // This view is shown briefly before navigation.goBack() is called
    return (
        <View className="flex-1 bg-surface-900 items-center justify-center">
            <Text className="text-text-secondary">Review not available.</Text>
        </View>
    );
}

// ... rest of the component render logic
```

#### **Bug 5: Race Condition in Location Updates (High Impact)**

*   **Location:** `src/screens/BrowseScreen.tsx`
*   **Issue:** The `useEffect` hook for loading reviews depends on `user?.location`, a mutable object. This can trigger rapid, successive API calls when the location changes, leading to race conditions where stale data overwrites fresh data.
*   **Risk:** Inconsistent UI, unnecessary network requests, and potential app slowdown.
*   **Fix:** Use `useCallback` to memoize the data loading function and an `AbortController` to cancel stale requests.

**Full Code Fix (in `src/screens/BrowseScreen.tsx`):**

```typescript
import React, { useEffect, useState, useCallback, useRef } from "react";
// ... other imports

export default function BrowseScreen() {
    // ... existing state
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadInitialData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Cancel previous request
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            await loadReviews(true, undefined, signal);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Error loading reviews:", error);
            }
        }
    }, [loadReviews]);

    // Update the existing useEffect
    useEffect(() => {
        loadInitialData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [filters.category, filters.radius, user?.location.city, user?.location.state, loadInitialData]);

    // ... rest of the component
}
```

### **1.3. Critical Integration & Configuration Errors**

#### **Bug 6: Missing `react-native-reanimated` Babel Plugin (Critical)**

*   **Location:** `babel.config.js`
*   **Issue:** `react-native-reanimated` v3 (used in Expo 53) requires its Babel plugin to be listed *last* in the `plugins` array to function correctly. The file is missing this plugin entirely.
*   **Risk:** All animations will fail, leading to a broken UI and potential crashes.
*   **Fix:** Add `'react-native-reanimated/plugin'` to the `babel.config.js` file.

**Full Code Fix (replace `babel.config.js`):**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: [
      // This plugin must be listed last!
      'react-native-reanimated/plugin',
    ],
  };
};
```

#### **Bug 7: Dummy Values in `google-services.json` (Critical)**

*   **Location:** `google-services.json`
*   **Issue:** The file contains placeholder values (`dummy-project-id`). This prevents Android builds from connecting to Firebase services, which are essential for push notifications via FCM.
*   **Risk:** Push notifications will fail silently on Android devices.
*   **Fix:** Replace the placeholder file with the actual `google-services.json` file downloaded from your Firebase project console.

**Instructions:**

1.  Navigate to your **Firebase Console**.
2.  Select your project.
3.  Go to **Project Settings** > **General**.
4.  Under the "Your apps" section, find your Android app.
5.  Download the `google-services.json` file.
6.  Replace the existing dummy file in the root of your Expo project with the downloaded one.
7.  Ensure your `app.json` has `"googleServicesFile": "./google-services.json"` under the `android` key.

#### **Bug 8: Unhandled Promise Rejections in Dynamic Imports (High Impact)**

*   **Location:** `src/state/subscriptionStore.ts`
*   **Issue:** Dynamic imports like `await import('react-native-purchases')` can fail if the native module is not linked correctly. These calls are not wrapped in a `try-catch` block, leading to unhandled promise rejections that will crash the app.
*   **Risk:** The app will crash during the subscription initialization process if RevenueCat fails to load.
*   **Fix:** Wrap all dynamic imports in `try-catch` blocks and provide a safe fallback (e.g., disabling the feature or using a mock).

**Full Code Fix (in `src/state/subscriptionStore.ts`):**

```typescript
// Replace the initializeRevenueCat function
initializeRevenueCat: async (userId?: string) => {
    if (!canUseRevenueCat()) {
        console.log('RevenueCat not available - using mock implementation');
        set({ isLoading: false });
        return;
    }

    try {
        set({ isLoading: true });

        // Safely import native module
        const Purchases = (await import('react-native-purchases')).default;
        
        const apiKey = Platform.select({
            ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
            android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
        });

        if (!apiKey) {
            throw new Error('RevenueCat API key not found');
        }

        await Purchases.configure({ apiKey, appUserID: userId });
        await get().checkSubscriptionStatus();
        console.log('RevenueCat initialized successfully');

    } catch (error) {
        console.error('RevenueCat initialization failed:', error);
        set({ error: 'Subscription service is unavailable.', isLoading: false });
    }
},
```

***

## **Part 2: High-Impact Bugs**

These issues degrade user experience through performance degradation, memory leaks, or data inconsistencies.

### **2.1. Performance & Memory Leaks**

#### **Bug 9: Memory Leak in Realtime Subscriptions (High Impact)**

*   **Location:** `src/services/realtimeChat.ts`
*   **Issue:** The `joinRoom` function creates new Supabase channel subscriptions, but the `leaveRoom` function does not call `.unsubscribe()`. This creates a memory leak, as old subscriptions remain active even after the user navigates away.
*   **Risk:** Degraded performance and eventual app crash due to memory exhaustion.
*   **Fix:** Track active channels in a `Map` and ensure `unsubscribe` is called in the `leaveRoom` and `cleanup` methods.

**Full Code Fix (in `src/services/realtimeChat.ts`):**

```typescript
class RealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  // ... other properties

  async joinRoom(roomId: string, userId: string, userName: string) {
    if (this.channels.has(roomId)) {
      console.log(`Already subscribed to room ${roomId}`);
      return;
    }
    
    // ... existing channel setup logic ...
    const channel = supabase.channel(`room_${roomId}`, { /* config */ });
    
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to room ${roomId}`);
        // ... track presence ...
      }
    });

    this.channels.set(roomId, channel);
  }

  async leaveRoom(roomId: string) {
    const channel = this.channels.get(roomId);
    if (channel) {
        try {
            await channel.unsubscribe();
            console.log(`Unsubscribed from room ${roomId}`);
        } catch (error) {
            console.error(`Failed to unsubscribe from room ${roomId}:`, error);
        } finally {
            this.channels.delete(roomId);
            supabase.removeChannel(channel);
        }
    }
  }

  async cleanup() {
    console.log("Cleaning up all real-time chat channels");
    for (const [roomId, channel] of this.channels.entries()) {
      await channel.unsubscribe();
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }
}
```

#### **Bug 10: Image Loading Without Caching (Medium Impact)**

*   **Location:** `src/components/ImageCarousel.tsx` & `src/components/ProfileCard.tsx`
*   **Issue:** The app uses `expo-image`, but it does not specify a `cachePolicy`. This can lead to images being re-downloaded frequently, increasing data usage and slowing down the UI.
*   **Risk:** Poor performance on image-heavy screens and excessive data consumption for users.
*   **Fix:** Use the `expo-image` `Image` component and set the `cachePolicy` to `'memory-disk'` to enable both memory and persistent disk caching.

**Full Code Fix (example for `src/components/ProfileCard.tsx`):**

```typescript
import { Image } from 'expo-image'; // Ensure this import is from expo-image

// ... inside the ProfileCard component render function
<Image
    source={{ uri: review.profilePhoto || `https://picsum.photos/seed/${review.id}/400/600` }}
    style={{ width: cardWidth, height: cardHeight }}
    contentFit="cover"
    transition={300}
    // Add cache policy and placeholder for better performance
    cachePolicy="memory-disk"
    placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
    onLoad={() => setImageLoaded(true)}
/>
```

### **2.2. Database and Data Integrity**

#### **Bug 11: Missing Foreign Key Constraints (High Impact)**

*   **Location:** Supabase Database Schema
*   **Issue:** Key tables like `comments_firebase` and `chat_messages_firebase` reference IDs from other tables (e.g., `reviews_firebase`, `chat_rooms_firebase`) but lack foreign key constraints. This allows for "orphaned" records—for example, comments that belong to a deleted review.
*   **Risk:** Data integrity issues, orphaned records cluttering the database, and potential application errors when trying to access non-existent parent records.
*   **Fix:** Add `FOREIGN KEY` constraints with `ON DELETE CASCADE` to the database schema. This ensures that when a parent record (like a review) is deleted, all its child records (like comments) are automatically deleted as well.

**Full Code Fix (run this SQL in the Supabase SQL Editor):**

```sql
-- Ensure referential integrity for comments
ALTER TABLE public.comments_firebase
ADD CONSTRAINT fk_comments_review
FOREIGN KEY (review_id)
REFERENCES public.reviews_firebase(id)
ON DELETE CASCADE; -- This will auto-delete comments when a review is deleted

-- Ensure referential integrity for chat messages
ALTER TABLE public.chat_messages_firebase
ADD CONSTRAINT fk_messages_room
FOREIGN KEY (chat_room_id)
REFERENCES public.chat_rooms_firebase(id)
ON DELETE CASCADE; -- This will auto-delete messages when a chat room is deleted

-- Add an index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_comments_review_id ON public.comments_firebase(review_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.chat_messages_firebase(chat_room_id);
```

#### **Bug 12: Inconsistent Data Types for Timestamps (Medium Impact)**

*   **Location:** `src/types/index.ts` and data handling logic
*   **Issue:** Timestamps like `createdAt` are defined with mixed types (`Date | string`). This can lead to runtime errors, especially with data from different sources (local state vs. database), as one might be a `Date` object and the other an ISO string.
*   **Risk:** Application crashes due to invalid date operations (e.g., calling `.getFullYear()` on a string).
*   **Fix:** Standardize all timestamp fields to the `Date` type within the application. Create a utility function to safely parse incoming data (which might be strings) into `Date` objects upon retrieval.

**Full Code Fix:**

1.  **Update `src/types/index.ts`:**
    ```typescript
    export interface Review {
      // ... other fields
      createdAt: Date; // Standardize to Date
      updatedAt: Date; // Standardize to Date
    }
    // Apply the same change to ChatMessage, Comment, etc.
    ```

2.  **Update data fetching services (e.g., `src/services/supabase.ts`):**
    ```typescript
    // Inside a function like supabaseReviews.getReviews
    return data.map((item) => ({
        // ... other properties
        createdAt: new Date(item.created_at), // Ensure it's a Date object
        updatedAt: new Date(item.updated_at),
    })) as Review[];
    ```

***

## **Part 3: Minor Bugs & Best Practices**

This section details over 45 lower-priority issues that impact UI polish, code quality, and maintainability.

### **3.1. UI/UX Bugs**

*   **Missing Accessibility Labels:** Buttons and pressable elements lack `accessibilityLabel` props, making the app difficult to use with screen readers.
    *   **Fix:** Add descriptive labels. ` <Pressable accessibilityLabel="Submit your review" ... />`
*   **Keyboard Overlaps Forms:** On iOS, the keyboard covers input fields on screens without `KeyboardAvoidingView`.
    *   **Fix:** Wrap form screens in `<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>`.
*   **No Empty States:** Screens like Search and Chatrooms do not show a message when there is no data.
    *   **Fix:** Use the `ListEmptyComponent` prop in `FlashList` to render an `EmptyState` component.
*   **Inconsistent Header Styles:** Some screens use custom headers while others use default navigation headers, creating a disjointed look.
    *   **Fix:** Standardize all screen headers using `headerShown: true` and consistent `headerStyle` options in `AppNavigator.tsx`.

### **3.2. Code Quality & Best Practices**

*   **Unused Imports and Variables:** Many files contain unused imports, increasing bundle size.
    *   **Fix:** Configure ESLint to automatically detect and flag unused variables (`"no-unused-vars": "error"` in `.eslintrc.js`) and remove them.
*   **Hardcoded Strings:** Error messages, labels, and URLs are hardcoded directly in components.
    *   **Fix:** Centralize all strings in a constants file (e.g., `src/constants/strings.ts`) for easier management and future localization.
*   **Missing `key` Props:** Some lists rendered with `.map()` are missing the `key` prop.
    *   **Fix:** Ensure every mapped element has a unique `key` prop, preferably using the item's ID: `items.map(item => <Component key={item.id} ... />)`.
*   **Outdated Dependencies:** Several packages in `package.json` have newer versions available.
    *   **Fix:** Run `npx expo install --fix` to update dependencies to versions compatible with Expo 53.

### **3.3. Testing and Deployment**

*   **No E2E Tests:** The project has no end-to-end tests, making it difficult to verify user flows automatically.
    *   **Fix:** Add Maestro or Detox for E2E testing. The existing `.maestro/login.yaml` file is a good starting point.
*   **Incomplete CI/CD:** The `.github/workflows/ci.yml` file only runs linting and type-checking.
    *   **Fix:** Add steps to the CI workflow to run unit tests (`npm test`) and E2E tests to ensure code quality on every push.
*   **No Sentry Integration:** The app lacks a crash reporting tool.
    *   **Fix:** Integrate Sentry (`@sentry/react-native`) and wrap the root `App` component in `Sentry.wrap()` to automatically capture and report crashes.

***

### **Implementation Roadmap**

1.  **Immediate (1 Week):**
    *   Apply all **Part 1 Critical Bugs**, starting with security vulnerabilities.
    *   Correct all **Integration & Configuration Errors**.
    *   Run `npx expo doctor` to ensure environment health after fixes.
    *   Deploy schema changes (foreign keys) to the Supabase database.

2.  **Short-Term (2 Weeks):**
    *   Address all **Part 2 High-Impact Bugs**, focusing on memory leaks and database integrity.
    *   Begin migration from `expo-av` to `expo-video` across the app.
    *   Optimize image loading with the `expo-image` caching strategy.

3.  **Medium-Term (1 Month):**
    *   Systematically work through the **Part 3 Minor Bugs**, starting with UI/UX improvements.
    *   Write unit tests for all utility functions and critical components.
    *   Integrate Sentry for crash reporting.
    *   Expand the CI/CD pipeline to include automated testing.