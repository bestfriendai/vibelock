# Analytics Setup Guide

## Overview
This document provides a complete guide for implementing analytics in the React Native application using Firebase Analytics and other complementary tools.

## Prerequisites
- React Native project with `@react-native-firebase/analytics` installed (already in package.json)
- Firebase project set up
- iOS and Android development environments set up

## Setup Steps

### 1. Firebase Project Setup

#### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name and follow the setup wizard
4. Enable Google Analytics when prompted
5. Configure Analytics settings (accept defaults or customize as needed)

#### Register Your App
1. In your Firebase project dashboard, click the Android icon to add an Android app
   - **Android package name**: e.g., com.example.app
   - **App nickname**: Your app name (optional)
   - **Debug signing certificate SHA-1**: Get this from your Android keystore

2. Click the iOS icon to add an iOS app
   - **iOS bundle ID**: e.g., com.example.app
   - **App nickname**: Your app name (optional)
   - **App Store ID**: Optional (can be added later)

### 2. Platform-Specific Configuration

#### Android Configuration
1. Download `google-services.json` from Firebase console
2. Place it in `android/app/`
3. Add the google-services plugin to `android/app/build.gradle`:
```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // Add this line
```

4. Add the dependency to `android/build.gradle`:
```gradle
buildscript {
  dependencies {
    // ...
    classpath 'com.google.gms:google-services:4.3.15' // Add this line
  }
}
```

#### iOS Configuration
1. Download `GoogleService-Info.plist` from Firebase console
2. Open your iOS project in Xcode
3. Right-click on your project name in the left navigation panel and select "Add Files to [your project name]"
4. Select the downloaded `GoogleService-Info.plist` file
5. Add the initialization code to your `AppDelegate.m` or `AppDelegate.mm`:
```objectivec
#import <Firebase.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  // ...
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }
  // ...
  return YES;
}
```

6. Add the following to your `Podfile`:
```ruby
pod 'Firebase/Analytics'
```

7. Run `pod install` in the `ios` directory

### 3. React Native Implementation

#### Create Analytics Service
Create a file `src/services/analytics.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

// Initialize analytics
export const initializeAnalytics = async () => {
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    console.log('Analytics initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    return false;
  }
};

// Set user properties
export const setUserProperties = async (properties: Record<string, string>) => {
  try {
    await analytics().setUserProperties(properties);
    console.log('User properties set:', properties);
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
};

// Set user ID for cross-device tracking
export const setUserId = async (userId: string) => {
  try {
    await analytics().setUserId(userId);
    console.log('User ID set:', userId);
  } catch (error) {
    console.error('Failed to set user ID:', error);
  }
};

// Log screen view
export const logScreenView = async (screenName: string, screenClass?: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log('Screen view logged:', screenName);
  } catch (error) {
    console.error('Failed to log screen view:', error);
  }
};

// Log custom event
export const logEvent = async (name: string, parameters?: Record<string, any>) => {
  try {
    await analytics().logEvent(name, parameters);
    console.log('Event logged:', name, parameters);
  } catch (error) {
    console.error('Failed to log event:', error);
  }
};

// App lifecycle events
export const logAppOpen = async () => {
  try {
    await analytics().logAppOpen();
    console.log('App open logged');
  } catch (error) {
    console.error('Failed to log app open:', error);
  }
};

// User engagement events
export const logSessionStart = async () => {
  try {
    // Firebase automatically tracks session duration
    // This is a placeholder for any additional session start logic
    console.log('Session start logged');
  } catch (error) {
    console.error('Failed to log session start:', error);
  }
};

// E-commerce events
export const logViewItem = async (item: {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  currency?: string;
}) => {
  try {
    await analytics().logViewItem({
      items: [item],
    });
    console.log('View item logged:', item);
  } catch (error) {
    console.error('Failed to log view item:', error);
  }
};

export const logAddToCart = async (item: {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}) => {
  try {
    await analytics().logAddToCart({
      items: [item],
      value: item.price ? item.price * (item.quantity || 1) : undefined,
      currency: item.currency,
    });
    console.log('Add to cart logged:', item);
  } catch (error) {
    console.error('Failed to log add to cart:', error);
  }
};

export const logPurchase = async (purchase: {
  transaction_id: string;
  value: number;
  currency: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    item_brand?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  try {
    await analytics().logPurchase(purchase);
    console.log('Purchase logged:', purchase);
  } catch (error) {
    console.error('Failed to log purchase:', error);
  }
};

// Ad events
export const logAdImpression = async (adUnitId: string, adPlatform: string) => {
  try {
    await analytics().logEvent('ad_impression', {
      ad_unit_id: adUnitId,
      ad_platform: adPlatform,
    });
    console.log('Ad impression logged:', adUnitId);
  } catch (error) {
    console.error('Failed to log ad impression:', error);
  }
};

export const logAdClick = async (adUnitId: string, adPlatform: string) => {
  try {
    await analytics().logEvent('ad_click', {
      ad_unit_id: adUnitId,
      ad_platform: adPlatform,
    });
    console.log('Ad click logged:', adUnitId);
  } catch (error) {
    console.error('Failed to log ad click:', error);
  }
};

// Tutorial events
export const logTutorialBegin = async () => {
  try {
    await analytics().logTutorialBegin();
    console.log('Tutorial begin logged');
  } catch (error) {
    console.error('Failed to log tutorial begin:', error);
  }
};

export const logTutorialComplete = async () => {
  try {
    await analytics().logTutorialComplete();
    console.log('Tutorial complete logged');
  } catch (error) {
    console.error('Failed to log tutorial complete:', error);
  }
};

// Social events
export const logShare = async (contentType: string, itemId: string) => {
  try {
    await analytics().logShare({
      content_type: contentType,
      item_id: itemId,
    });
    console.log('Share logged:', contentType, itemId);
  } catch (error) {
    console.error('Failed to log share:', error);
  }
};

// Search events
export const logSearch = async (searchTerm: string) => {
  try {
    await analytics().logSearch({
      search_term: searchTerm,
    });
    console.log('Search logged:', searchTerm);
  } catch (error) {
    console.error('Failed to log search:', error);
  }
};

// Error tracking
export const logError = async (error: Error, context?: string) => {
  try {
    await analytics().logEvent('app_error', {
      error_message: error.message,
      error_stack: error.stack,
      context: context || 'unknown',
      timestamp: Date.now(),
    });
    console.log('Error logged:', error.message);
  } catch (analyticsError) {
    console.error('Failed to log error:', analyticsError);
  }
};

// Performance monitoring
export const logPerformanceMetric = async (metricName: string, duration: number, context?: string) => {
  try {
    await analytics().logEvent('performance_metric', {
      metric_name: metricName,
      duration_ms: duration,
      context: context || 'unknown',
      timestamp: Date.now(),
    });
    console.log('Performance metric logged:', metricName, duration);
  } catch (error) {
    console.error('Failed to log performance metric:', error);
  }
};
```

#### Create Analytics Hook
Create a file `src/hooks/useAnalytics.ts`:

```typescript
import { useEffect } from 'react';
import {
  logScreenView,
  logEvent,
  setUserProperties,
  setUserId,
  logAppOpen,
  logSessionStart,
  logViewItem,
  logAddToCart,
  logPurchase,
  logAdImpression,
  logAdClick,
  logTutorialBegin,
  logTutorialComplete,
  logShare,
  logSearch,
  logError,
  logPerformanceMetric,
} from '../services/analytics';
import { useAuthContext } from '../contexts/AuthContext';

export const useAnalytics = () => {
  const { user } = useAuthContext();

  // Set user ID when auth state changes
  useEffect(() => {
    if (user) {
      setUserId(user.id);
      setUserProperties({
        user_type: user.isPremium ? 'premium' : 'free',
        sign_up_date: user.createdAt,
      });
    } else {
      setUserId('anonymous');
    }
  }, [user]);

  // Track app open
  useEffect(() => {
    logAppOpen();
    logSessionStart();
  }, []);

  return {
    logScreenView,
    logEvent,
    setUserProperties,
    logViewItem,
    logAddToCart,
    logPurchase,
    logAdImpression,
    logAdClick,
    logTutorialBegin,
    logTutorialComplete,
    logShare,
    logSearch,
    logError,
    logPerformanceMetric,
  };
};
```

#### Create Screen View Tracker
Create a file `src/components/analytics/ScreenViewTracker.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useNavigationState, useRoute } from '@react-navigation/native';
import { useAnalytics } from '../../hooks/useAnalytics';

interface ScreenViewTrackerProps {
  name: string;
  params?: Record<string, any>;
}

const ScreenViewTracker: React.FC<ScreenViewTrackerProps> = ({ name, params }) => {
  const { logScreenView } = useAnalytics();
  const route = useRoute();

  useEffect(() => {
    // Log screen view when component mounts
    logScreenView(name, name);
    
    // Log screen parameters if any
    if (params && Object.keys(params).length > 0) {
      logEvent('screen_view_with_params', {
        screen_name: name,
        params: JSON.stringify(params),
      });
    }
  }, [name, params, logScreenView]);

  return null; // This component doesn't render anything
};

// Higher-order component to track screen views
export const withScreenTracking = (ScreenComponent: React.ComponentType<any>, screenName: string) => {
  return (props: any) => (
    <>
      <ScreenViewTracker name={screenName} params={props.route?.params} />
      <ScreenComponent {...props} />
    </>
  );
};

// Navigation container wrapper to track all screen changes
export const NavigationTracker = () => {
  const { logScreenView } = useAnalytics();
  const navigationState = useNavigationState(state => state);

  useEffect(() => {
    if (navigationState) {
      const route = navigationState.routes[navigationState.index];
      if (route) {
        logScreenView(route.name, route.name);
        
        // Log navigation parameters if any
        if (route.params && Object.keys(route.params).length > 0) {
          logEvent('navigation_with_params', {
            screen_name: route.name,
            params: JSON.stringify(route.params),
          });
        }
      }
    }
  }, [navigationState, logScreenView]);

  return null; // This component doesn't render anything
};

export default ScreenViewTracker;
```

### 4. Integration in App

#### Update App Entry Point
Update your `App.tsx` to initialize analytics:

```typescript
import React, { useEffect } from 'react';
import { initializeAnalytics } from './src/services/analytics';

const App = () => {
  useEffect(() => {
    // Initialize analytics when app starts
    const setupAnalytics = async () => {
      await initializeAnalytics();
    };
    
    setupAnalytics();
  }, []);

  // ... rest of your app
};
```

#### Update Navigation Container
Update your navigation container to include screen tracking:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { NavigationTracker } from './src/components/analytics/ScreenViewTracker';

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <NavigationTracker />
      {/* Your navigators and screens */}
    </NavigationContainer>
  );
};

export default AppNavigator;
```

### 5. Advanced Analytics Implementation

#### Create Event Tracking for Key Actions
Create a file `src/utils/eventTracking.ts`:

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

// User engagement events
export const trackUserEngagement = () => {
  const { logEvent } = useAnalytics();
  
  return {
    trackButtonPress: (buttonName: string, screenName: string) => {
      logEvent('button_press', {
        button_name: buttonName,
        screen_name: screenName,
      });
    },
    
    trackFormStart: (formName: string) => {
      logEvent('form_start', {
        form_name: formName,
      });
    },
    
    trackFormSubmit: (formName: string, success: boolean) => {
      logEvent('form_submit', {
        form_name: formName,
        success: success,
      });
    },
    
    trackFeatureUsage: (featureName: string, action: string) => {
      logEvent('feature_usage', {
        feature_name: featureName,
        action: action,
      });
    },
  };
};

// Content interaction events
export const trackContentInteraction = () => {
  const { logEvent } = useAnalytics();
  
  return {
    trackContentView: (contentId: string, contentType: string) => {
      logEvent('content_view', {
        content_id: contentId,
        content_type: contentType,
      });
    },
    
    trackContentLike: (contentId: string, contentType: string) => {
      logEvent('content_like', {
        content_id: contentId,
        content_type: contentType,
      });
    },
    
    trackContentSave: (contentId: string, contentType: string) => {
      logEvent('content_save', {
        content_id: contentId,
        content_type: contentType,
      });
    },
    
    trackContentShare: (contentId: string, contentType: string, method: string) => {
      logEvent('content_share', {
        content_id: contentId,
        content_type: contentType,
        method: method,
      });
    },
  };
};

// Onboarding events
export const trackOnboarding = () => {
  const { logEvent, logTutorialBegin, logTutorialComplete } = useAnalytics();
  
  return {
    trackOnboardingStart: () => {
      logTutorialBegin();
      logEvent('onboarding_start');
    },
    
    trackOnboardingStep: (stepNumber: number, stepName: string) => {
      logEvent('onboarding_step', {
        step_number: stepNumber,
        step_name: stepName,
      });
    },
    
    trackOnboardingComplete: () => {
      logTutorialComplete();
      logEvent('onboarding_complete');
    },
    
    trackOnboardingSkip: (stepNumber: number) => {
      logEvent('onboarding_skip', {
        step_number: stepNumber,
      });
    },
  };
};

// Monetization events
export const trackMonetization = () => {
  const { logEvent, logPurchase, logViewItem, logAddToCart } = useAnalytics();
  
  return {
    trackSubscriptionView: (planId: string, planName: string) => {
      logViewItem({
        item_id: planId,
        item_name: planName,
        item_category: 'subscription',
      });
    },
    
    trackSubscriptionStart: (planId: string, planName: string, price: number, currency: string) => {
      logPurchase({
        transaction_id: `sub_${Date.now()}`,
        value: price,
        currency: currency,
        items: [{
          item_id: planId,
          item_name: planName,
          item_category: 'subscription',
          price: price,
          quantity: 1,
        }],
      });
    },
    
    trackAddToCart: (itemId: string, itemName: string, price: number, currency: string) => {
      logAddToCart({
        item_id: itemId,
        item_name: itemName,
        price: price,
        currency: currency,
        quantity: 1,
      });
    },
    
    trackPurchaseInitiation: (items: Array<any>, value: number, currency: string) => {
      logEvent('purchase_initiation', {
        number_of_items: items.length,
        value: value,
        currency: currency,
      });
    },
  };
};

// Performance events
export const trackPerformance = () => {
  const { logPerformanceMetric } = useAnalytics();
  
  return {
    trackAppLoadTime: (loadTime: number) => {
      logPerformanceMetric('app_load_time', loadTime);
    },
    
    trackScreenLoadTime: (screenName: string, loadTime: number) => {
      logPerformanceMetric('screen_load_time', loadTime, screenName);
    },
    
    trackApiCallTime: (apiEndpoint: string, callTime: number) => {
      logPerformanceMetric('api_call_time', callTime, apiEndpoint);
    },
  };
};
```

#### Create Error Boundary with Analytics
Create a file `src/components/analytics/AnalyticsErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logError } from '../../services/analytics';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AnalyticsErrorBoundaryInternal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to analytics
    logError(error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <ErrorFallback error={error} onReset={this.handleReset} />
      );
    }

    return children;
  }
}

// Error fallback component
const ErrorFallback = ({ error, onReset }: { error: Error | null; onReset: () => void }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: theme.secondaryText }]}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={onReset}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Wrapper component to use hooks
export const AnalyticsErrorBoundary: React.FC<Props> = (props) => {
  return <AnalyticsErrorBoundaryInternal {...props} />;
};

export default AnalyticsErrorBoundary;
```

### 6. Create Analytics Dashboard Integration

#### Create a service for custom analytics dashboard
Create a file `src/services/customAnalytics.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';

// Custom events for your specific app needs
export const trackUserProgress = async (userId: string, progressData: {
  completedSteps: number;
  totalSteps: number;
  lastStepCompleted: string;
  timeSpent: number;
}) => {
  try {
    await analytics().logEvent('user_progress', {
      user_id: userId,
      completed_steps: progressData.completedSteps,
      total_steps: progressData.totalSteps,
      completion_percentage: Math.round((progressData.completedSteps / progressData.totalSteps) * 100),
      last_step_completed: progressData.lastStepCompleted,
      time_spent_minutes: Math.round(progressData.timeSpent / 60000),
    });
  } catch (error) {
    console.error('Failed to track user progress:', error);
  }
};

export const trackFeatureAdoption = async (userId: string, featureName: string, adoptionData: {
  firstUse: boolean;
  sessionCount: number;
  lastUsed: string;
}) => {
  try {
    await analytics().logEvent('feature_adoption', {
      user_id: userId,
      feature_name: featureName,
      first_use: adoptionData.firstUse,
      session_count: adoptionData.sessionCount,
      last_used: adoptionData.lastUsed,
    });
  } catch (error) {
    console.error('Failed to track feature adoption:', error);
  }
};

export const trackRetentionMetrics = async (userId: string, retentionData: {
  daysSinceFirstUse: number;
  sessionCount: number;
  averageSessionDuration: number;
  lastActiveDate: string;
}) => {
  try {
    await analytics().logEvent('retention_metrics', {
      user_id: userId,
      days_since_first_use: retentionData.daysSinceFirstUse,
      session_count: retentionData.sessionCount,
      average_session_duration_minutes: Math.round(retentionData.averageSessionDuration / 60000),
      last_active_date: retentionData.lastActiveDate,
    });
  } catch (error) {
    console.error('Failed to track retention metrics:', error);
  }
};

// Funnel tracking
export const trackFunnelStep = async (funnelName: string, stepName: string, stepNumber: number, userId?: string) => {
  try {
    await analytics().logEvent('funnel_step', {
      funnel_name: funnelName,
      step_name: stepName,
      step_number: stepNumber,
      user_id: userId || 'anonymous',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to track funnel step:', error);
  }
};

// Cohort analysis
export const trackCohortActivity = async (cohortName: string, userId: string, activityData: {
  activityType: string;
  activityCount: number;
  lastActivityDate: string;
}) => {
  try {
    await analytics().logEvent('cohort_activity', {
      cohort_name: cohortName,
      user_id: userId,
      activity_type: activityData.activityType,
      activity_count: activityData.activityCount,
      last_activity_date: activityData.lastActivityDate,
    });
  } catch (error) {
    console.error('Failed to track cohort activity:', error);
  }
};
```

### 7. A/B Testing Integration

#### Create A/B testing service
Create a file `src/services/abTesting.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';

// A/B test variants
export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // 0-1, probability of selection
}

// A/B test definition
export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  startDate: string;
  endDate?: string;
}

// Track A/B test exposure
export const trackABTestExposure = async (testId: string, variantId: string, userId?: string) => {
  try {
    await analytics().logEvent('ab_test_exposure', {
      test_id: testId,
      variant_id: variantId,
      user_id: userId || 'anonymous',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to track A/B test exposure:', error);
  }
};

// Track A/B test conversion
export const trackABTestConversion = async (testId: string, variantId: string, conversionData: {
  conversionType: string;
  conversionValue?: number;
  userId?: string;
}) => {
  try {
    await analytics().logEvent('ab_test_conversion', {
      test_id: testId,
      variant_id: variantId,
      conversion_type: conversionData.conversionType,
      conversion_value: conversionData.conversionValue,
      user_id: conversionData.userId || 'anonymous',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to track A/B test conversion:', error);
  }
};

// Simple A/B test variant selector (for client-side only)
export const selectABTestVariant = (test: ABTest, userId?: string): ABTestVariant => {
  // Simple deterministic selection based on user ID
  // In a real implementation, you might use a more sophisticated algorithm
  // or a remote config service
  
  if (!userId) {
    // Random selection for anonymous users
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }
    
    // Fallback to first variant
    return test.variants[0];
  }
  
  // Deterministic selection based on user ID
  // Create a simple hash from the user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  
  // Normalize to 0-1 range
  const normalizedHash = Math.abs(hash) / 2147483647; // Max 32-bit signed integer
  
  // Select variant based on normalized hash
  let cumulativeWeight = 0;
  for (const variant of test.variants) {
    cumulativeWeight += variant.weight;
    if (normalizedHash <= cumulativeWeight) {
      return variant;
    }
  }
  
  // Fallback to first variant
  return test.variants[0];
};
```

### 8. Privacy and Compliance

#### Create analytics consent management
Create a file `src/services/analyticsConsent.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'analytics_consent_status';

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNKNOWN = 'unknown',
}

// Check current consent status
export const getConsentStatus = async (): Promise<ConsentStatus> => {
  try {
    const status = await AsyncStorage.getItem(CONSENT_KEY);
    return (status as ConsentStatus) || ConsentStatus.UNKNOWN;
  } catch (error) {
    console.error('Failed to get consent status:', error);
    return ConsentStatus.UNKNOWN;
  }
};

// Set consent status
export const setConsentStatus = async (status: ConsentStatus): Promise<void> => {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, status);
    
    // Enable or disable analytics collection based on consent
    if (status === ConsentStatus.GRANTED) {
      await analytics().setAnalyticsCollectionEnabled(true);
    } else {
      await analytics().setAnalyticsCollectionEnabled(false);
    }
  } catch (error) {
    console.error('Failed to set consent status:', error);
  }
};

// Reset analytics data (for GDPR compliance)
export const resetAnalyticsData = async (): Promise<void> => {
  try {
    await analytics().resetAnalyticsData();
  } catch (error) {
    console.error('Failed to reset analytics data:', error);
  }
};
```

#### Create consent form component
Create a file `src/components/analytics/AnalyticsConsentForm.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ConsentStatus, getConsentStatus, setConsentStatus } from '../../services/analyticsConsent';

interface AnalyticsConsentFormProps {
  onConsentResolved: () => void;
}

const AnalyticsConsentForm: React.FC<AnalyticsConsentFormProps> = ({ onConsentResolved }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [consentStatus, setConsentStatusState] = useState<ConsentStatus>(ConsentStatus.UNKNOWN);

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      const status = await getConsentStatus();
      setConsentStatusState(status);
      
      if (status !== ConsentStatus.UNKNOWN) {
        onConsentResolved();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking consent status:', error);
      setIsLoading(false);
    }
  };

  const handleConsent = async (granted: boolean) => {
    try {
      setIsLoading(true);
      await setConsentStatus(granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED);
      setConsentStatusState(granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED);
      onConsentResolved();
    } catch (error) {
      console.error('Error setting consent status:', error);
      setIsLoading(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://yourapp.com/privacy-policy');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.text, { color: theme.text }]}>Loading...</Text>
      </View>
    );
  }

  if (consentStatus !== ConsentStatus.UNKNOWN) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Analytics & Privacy
        </Text>
        
        <Text style={[styles.text, { color: theme.text }]}>
          We use analytics to understand how you use our app and improve your experience. 
          This helps us see which features are popular and how we can make our app better for you.
        </Text>
        
        <Text style={[styles.text, { color: theme.text }]}>
          The data we collect is anonymous and cannot be used to personally identify you. 
          You can change your consent at any time in the app settings.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton, { backgroundColor: theme.primary }]}
            onPress={() => handleConsent(true)}
          >
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.declineButton, { borderColor: theme.primary }]}
            onPress={() => handleConsent(false)}
          >
            <Text style={[styles.buttonText, { color: theme.primary }]}>Decline</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={openPrivacyPolicy}>
          <Text style={[styles.link, { color: theme.primary }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 20,
    gap: 15,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    // backgroundColor set in component
  },
  declineButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  link: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default AnalyticsConsentForm;
```

### 9. Testing and Debugging

#### Enable debug mode
Create a file `src/services/analyticsDebug.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';

// Enable debug mode for development
export const enableAnalyticsDebugMode = async () => {
  try {
    // Enable verbose logging
    await analytics().setAnalyticsCollectionEnabled(true);
    
    // Enable debug event logging
    if (__DEV__) {
      // Note: This is a placeholder for any platform-specific debug setup
      console.log('Analytics debug mode enabled');
    }
  } catch (error) {
    console.error('Failed to enable analytics debug mode:', error);
  }
};

// Log test events for verification
export const logTestEvent = async () => {
  try {
    await analytics().logEvent('test_event', {
      test_parameter: 'test_value',
      timestamp: Date.now(),
    });
    console.log('Test event logged');
  } catch (error) {
    console.error('Failed to log test event:', error);
  }
};
```

### 10. Best Practices and Optimization

#### Analytics Best Practices
1. **Define clear goals**: Know what you want to measure before implementing
2. **Use consistent naming**: Follow a consistent naming convention for events and parameters
3. **Limit data collection**: Only collect data that you'll actually use
4. **Respect privacy**: Always get user consent and provide opt-out options
5. **Test thoroughly**: Verify events are being tracked correctly

#### Performance Optimization
1. **Batch events**: Group related events together when possible
2. **Throttle high-frequency events**: Limit how often you log certain events
3. **Use offline persistence**: Ensure events are stored locally when offline
4. **Minimize payload size**: Keep event data small and focused

#### User Experience Guidelines
1. **Be transparent**: Inform users about what data you collect and why
2. **Provide value**: Use analytics to improve the app experience
3. **Respect preferences**: Honor user consent and privacy choices
4. **Minimize impact**: Ensure analytics don't affect app performance

## Troubleshooting

### Common Issues

#### Events Not Showing Up
1. Check if analytics is properly initialized
2. Verify internet connectivity
3. Ensure debug mode is enabled in development
4. Check if consent has been granted

#### Incorrect Event Data
1. Verify event names and parameters match your implementation
2. Check data types and formatting
3. Ensure events are logged at the right time
4. Test with different user scenarios

#### Performance Issues
1. Check if you're logging too many events
2. Verify event payloads aren't too large
3. Ensure analytics collection is disabled when consent is denied
4. Monitor network usage

### Debugging Tools
1. **Firebase Console**: Use the DebugView to see events in real-time
2. **Console Logs**: Enable verbose logging to trace event flow
3. **Network Inspector**: Monitor analytics requests and responses
4. **Device Logs**: Check native logs for platform-specific issues

## Conclusion
This guide provides a comprehensive implementation of analytics in your React Native application. By following these steps, you'll be able to effectively track user behavior, measure key metrics, and make data-driven decisions to improve your app.

Remember to:
- Always respect user privacy and get proper consent
- Define clear goals for what you want to measure
- Test thoroughly to ensure events are tracked correctly
- Use analytics data to improve the user experience
- Comply with relevant regulations (GDPR, CCPA, etc.)