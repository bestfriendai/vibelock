import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppState, View, Text, Pressable } from "react-native";
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
import { useAppInitialization } from "./src/hooks/useAppInitialization";

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
          BrowseStack: {
            screens: {
              Browse: "browse",
              ReviewDetail: "review/:reviewId",
            },
          },
          SearchStack: {
            screens: {
              Search: "search",
              ReviewDetail: "search/review/:reviewId",
            },
          },
          ChatroomsStack: {
            screens: {
              Chatrooms: "chatrooms",
            },
          },
          SettingsStack: {
            screens: {
              Settings: "settings",
              Notifications: "notifications",
              DeleteAccount: "delete-account",
              LocationSettings: "location-settings",
            },
          },
        },
      },
      PersonProfile: "profile/:firstName/:city/:state",
      ChatRoom: "chat/:roomId",
      CreateReview: "create",
      SignIn: "signin",
      SignUp: "signup",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",
      Onboarding: "onboarding",
    },
  },
};

export default function App() {
  const { initializeAuthListener } = useAuthStore();
  const { cleanup: cleanupChat } = useChatStore();
  const { initializeRevenueCat, identifyRevenueCatUser } = useSubscriptionStore();
  const { isLoading, error, retry } = useAppInitialization();

  useEffect(() => {
    const unsubscribe = initializeAuthListener();

    const initializeServices = async () => {
      try {
        await Promise.all([
          adMobService.initialize(),
          initializeRevenueCat(),
        ]);
      } catch (error) {
        console.error("Service initialization error:", error);
      }
    };

    initializeServices();

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("App backgrounded");
      }
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      unsubscribe?.();
      appStateSubscription?.remove();
      cleanupChat();
      notificationService.cleanup();
      enhancedRealtimeChatService.cleanup();
    };
  }, [initializeAuthListener, cleanupChat, initializeRevenueCat]);

  // Identify RevenueCat user when authenticated
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id) {
        console.log("👤 User authenticated, identifying RevenueCat user");
        identifyRevenueCatUser(state.user.id);
      }
    });

    return unsubscribe;
  }, [identifyRevenueCatUser]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error && !__DEV__) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Initialization Error</Text>
        <Text style={{ marginBottom: 20, textAlign: 'center' }}>{error.message}</Text>
        <Pressable
          onPress={() => retry()}
          style={{ padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
