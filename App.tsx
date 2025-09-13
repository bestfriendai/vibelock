import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppState } from "react-native";
import * as Linking from "expo-linking";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import OfflineBanner from "./src/components/OfflineBanner";
import useAuthStore from "./src/state/authStore";
import useChatStore from "./src/state/chatStore";
import useSubscriptionStore from "./src/state/subscriptionStore";
import { notificationService } from "./src/services/notificationService";
import { enhancedRealtimeChatService } from "./src/services/realtimeChat";
import { adMobService } from "./src/services/adMobService";
import { buildEnv } from "./src/utils/buildEnvironment";
import { AdProvider } from "./src/contexts/AdContext";
import { ThemeProvider } from "./src/providers/ThemeProvider";
import AppOpenAdHandler from "./src/components/AppOpenAdHandler";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

// Deep linking configuration
const linking = {
  prefixes: [Linking.createURL("/"), "locker-room-talk://", "https://lockerroom.app", "http://lockerroom.app"],
  config: {
    screens: {
      MainTabs: {
        path: "main",
        screens: {
          Browse: "main",
          ReviewDetail: "review/:reviewId",
          Search: "search",
          Chatrooms: "chatrooms",
          Settings: "settings",
          Notifications: "notifications",
          DeleteAccount: "delete-account",
          LocationSettings: "location-settings",
        },
      },
      PersonProfile: "profile/:firstName/:city/:state",
      ChatRoom: "chat/:roomId",
      CreateReview: "create",
      SignIn: "signin",
      SignUp: "signup",
      Onboarding: "onboarding",
    },
  },
};

export default function App() {
  const { initializeAuthListener } = useAuthStore();
  const { cleanup: cleanupChat } = useChatStore();
  const { initializeRevenueCat } = useSubscriptionStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 App Environment:", {
          isExpoGo: buildEnv.isExpoGo,
          isDevelopmentBuild: buildEnv.isDevelopmentBuild,
          hasNativeModules: buildEnv.hasNativeModules,
        });

        // Initialize Supabase auth state listener (always available)
        const unsubscribe = initializeAuthListener();

        // Initialize monetization services conditionally
        if (buildEnv.hasNativeModules) {
          console.log("💰 Initializing native monetization services...");
          await Promise.all([adMobService.initialize(), initializeRevenueCat()]);
        } else {
          console.log("🎭 Using mock monetization services for Expo Go...");
          await Promise.all([
            adMobService.initialize(), // Will use mock implementation
            initializeRevenueCat(), // Will use mock implementation
          ]);
        }

        console.log("✅ App initialization complete");
        return unsubscribe;
      } catch (error) {
        console.error("❌ App initialization error:", error);
        // Don't crash the app, continue with limited functionality
        return initializeAuthListener();
      }
    };

    let unsubscribe: (() => void) | null = null;

    initializeApp().then((unsub) => {
      unsubscribe = unsub;
    });

    // Handle app state changes for cleanup
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("🧹 App backgrounded, cleaning up resources");
        // Don't fully cleanup on background, just reduce activity
      }
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    // Cleanup listener on unmount
    return () => {
      console.log("🧹 App unmounting, cleaning up all resources");
      unsubscribe?.();
      appStateSubscription?.remove();

      // Cleanup all services
      cleanupChat();
      notificationService.cleanup();
      enhancedRealtimeChatService.cleanup();
    };
  }, [initializeAuthListener, cleanupChat, initializeRevenueCat]);

  // Initialize RevenueCat with user ID when authenticated
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id) {
        console.log("👤 User authenticated, initializing RevenueCat with user ID");
        initializeRevenueCat(state.user.id);
      }
    });

    return unsubscribe;
  }, [initializeRevenueCat]);

  return (
    <ErrorBoundary>
      {buildEnv.hasNativeModules ? (
        <KeyboardProvider>
          <GestureHandlerRootView className="flex-1">
            <SafeAreaProvider>
              <ThemeProvider>
                <AdProvider>
                  <NavigationContainer linking={linking}>
                    <AppNavigator />
                    <OfflineBanner />
                    <AppOpenAdHandler />
                  </NavigationContainer>
                </AdProvider>
              </ThemeProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </KeyboardProvider>
      ) : (
        <GestureHandlerRootView className="flex-1">
          <SafeAreaProvider>
            <ThemeProvider>
              <AdProvider>
                <NavigationContainer linking={linking}>
                  <AppNavigator />
                  <OfflineBanner />
                  <AppOpenAdHandler />
                </NavigationContainer>
              </AdProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      )}
    </ErrorBoundary>
  );
}
