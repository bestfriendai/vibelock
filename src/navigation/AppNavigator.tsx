import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import CustomTabBar from "../components/CustomTabBar";
import { useTheme } from "../providers/ThemeProvider";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

// Import screens
import BrowseScreen from "../screens/BrowseScreen";
import SearchScreen from "../screens/SearchScreen";
import CreateReviewScreen from "../screens/CreateReviewScreen";
import ChatroomsScreen from "../screens/ChatroomsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PersonProfileScreen from "../screens/PersonProfileScreen";
import ErrorBoundary from "../components/ErrorBoundary";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import ComponentErrorBoundary from "../components/ComponentErrorBoundary";

import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import ReviewDetailScreen from "../screens/ReviewDetailScreen";
// Screens (new)
// Screens (new)
import NotificationsScreen from "../screens/NotificationsScreen";
import DeleteAccountScreen from "../screens/DeleteAccountScreen";
import LocationSettingsScreen from "../screens/LocationSettingsScreen";

// Import stores
import useAuthStore from "../state/authStore";

// Wrapper component for ChatRoomScreen with error boundary
const ChatRoomScreenWithErrorBoundary = (props: any) => (
  <ErrorBoundary
    fallback={
      <SafeAreaView className="flex-1 bg-surface-900 justify-center items-center px-6">
        <View className="items-center">
          <Ionicons name="chatbubble-outline" size={48} color="#666" className="mb-4" />
          <Text className="text-text-primary text-lg font-semibold mb-2">Chat Unavailable</Text>
          <Text className="text-text-secondary text-center">
            There was an issue loading the chat. Please try again later.
          </Text>
        </View>
      </SafeAreaView>
    }
  >
    <ChatRoomScreen {...props} />
  </ErrorBoundary>
);

// Types for navigation - using serialized versions for React Navigation
type SerializedReview = Omit<import("../types").Review, "createdAt" | "updatedAt"> & {
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Navigation types for React Navigation v7
export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  PersonProfile: {
    firstName: string;
    location: { city: string; state: string };
  };
  CreateReview: undefined;
  ChatRoom: { roomId: string };
  ReviewDetail: {
    review?: SerializedReview;
    reviewId?: string;
  };
};

export type TabParamList = {
  BrowseStack: undefined;
  SearchStack: undefined;
  CreateAction: undefined;
  ChatroomsStack: undefined;
  SettingsStack: undefined;
};

export type BrowseStackParamList = {
  Browse: undefined;
  ReviewDetail: {
    review?: SerializedReview;
    reviewId?: string;
  };
};

export type SearchStackParamList = {
  Search: undefined;
  ReviewDetail: {
    review?: SerializedReview;
    reviewId?: string;
  };
};

export type ChatroomsStackParamList = {
  Chatrooms: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  Notifications: undefined;
  DeleteAccount: undefined;
  LocationSettings: undefined;
};

// Navigation prop types for React Navigation v7
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type TabNavigationProp = BottomTabNavigationProp<TabParamList>;
export type BrowseStackNavigationProp = NativeStackNavigationProp<BrowseStackParamList>;
export type SearchStackNavigationProp = NativeStackNavigationProp<SearchStackParamList>;
export type ChatroomsStackNavigationProp = NativeStackNavigationProp<ChatroomsStackParamList>;
export type SettingsStackNavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const ChatroomsStack = createNativeStackNavigator<ChatroomsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function CreateTabButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isGuestMode } = useAuthStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        // Offset the button up slightly to make it more prominent
        marginBottom: 8,
      }}
    >
      <Pressable
        onPress={() => navigation.navigate(isGuestMode ? "SignUp" : "CreateReview")}
        hitSlop={16}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
        }}
        accessibilityRole="button"
        accessibilityLabel="Create Review"
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 12,
            // Add a subtle border for better definition
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.05)",
          }}
        >
          <Ionicons name="add" size={32} color="#000000" />
        </View>
      </Pressable>
    </View>
  );
}

// Browse Stack Navigator
const standardHeader = {
  headerShown: true,
  headerStyle: { backgroundColor: "#000000" },
  headerTintColor: "#FFFFFF",
  headerTitleStyle: { color: "#FFFFFF" },
  headerBackTitle: "Back",
} as const;

function BrowseStackNavigator() {
  return (
    <BrowseStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <BrowseStack.Screen name="Browse">
        {(props) => (
          <ScreenErrorBoundary screenName="Browse">
            <BrowseScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </BrowseStack.Screen>
      <BrowseStack.Screen
        name="ReviewDetail"
        options={{
          ...standardHeader,
          headerTitle: "Review",
        }}
      >
        {() => (
          <ScreenErrorBoundary screenName="Review Detail">
            <ReviewDetailScreen />
          </ScreenErrorBoundary>
        )}
      </BrowseStack.Screen>
    </BrowseStack.Navigator>
  );
}

// Search Stack Navigator
function SearchStackNavigator() {
  return (
    <SearchStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SearchStack.Screen name="Search">
        {(props) => (
          <ScreenErrorBoundary screenName="Search">
            <SearchScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </SearchStack.Screen>
      <SearchStack.Screen
        name="ReviewDetail"
        options={{
          ...standardHeader,
          headerTitle: "Review",
        }}
      >
        {() => (
          <ScreenErrorBoundary screenName="Review Detail">
            <ReviewDetailScreen />
          </ScreenErrorBoundary>
        )}
      </SearchStack.Screen>
    </SearchStack.Navigator>
  );
}

// Chatrooms Stack Navigator
function ChatroomsStackNavigator() {
  return (
    <ChatroomsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ChatroomsStack.Screen name="Chatrooms" component={ChatroomsScreen} />
    </ChatroomsStack.Navigator>
  );
}

// Settings Stack Navigator
function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SettingsStack.Screen name="Settings" component={ProfileScreen} />
      <SettingsStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          ...standardHeader,
          headerTitle: "Notifications",
        }}
      />
      <SettingsStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{
          ...standardHeader,
          headerTitle: "Delete Account",
        }}
      />
      <SettingsStack.Screen
        name="LocationSettings"
        component={LocationSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </SettingsStack.Navigator>
  );
}

// Tab Navigator Component
function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={({ route }) => {
          return {
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;
              switch (route.name) {
                case "BrowseStack":
                  iconName = focused ? "home" : "home-outline";
                  break;
                case "SearchStack":
                  iconName = focused ? "search" : "search-outline";
                  break;
                case "CreateAction":
                  // Icon handled by custom tabBarButton
                  iconName = "add";
                  break;
                case "ChatroomsStack":
                  iconName = focused ? "chatbubbles" : "chatbubbles-outline";
                  break;
                case "SettingsStack":
                  iconName = focused ? "person" : "person-outline";
                  break;
                default:
                  iconName = "home-outline";
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.brand.red,
            tabBarInactiveTintColor: colors.text.muted,
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
              backgroundColor: colors.surface[900],
              borderTopWidth: 1,
              borderTopColor: colors.border.default,
              paddingBottom: Math.max(insets.bottom, 6),
              paddingTop: 4,
              height: 52 + (insets.bottom || 0),
            },
            tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
            headerShown: false,
          };
        }}
      >
        <Tab.Screen
          name="BrowseStack"
          component={BrowseStackNavigator}
          options={{
            tabBarLabel: "Browse",
            tabBarAccessibilityLabel: "Browse reviews and profiles",
          }}
        />
        <Tab.Screen
          name="SearchStack"
          component={SearchStackNavigator}
          options={{
            tabBarLabel: "Search",
            tabBarAccessibilityLabel: "Search for people and reviews",
          }}
        />
        <Tab.Screen
          name="CreateAction"
          component={View as any}
          options={{
            tabBarLabel: "",
            tabBarButton: (props) => <CreateTabButton />,
            tabBarIconStyle: { display: "none" },
            tabBarItemStyle: {
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        />
        <Tab.Screen
          name="ChatroomsStack"
          component={ChatroomsStackNavigator}
          options={{
            tabBarLabel: "Chatrooms",
            tabBarAccessibilityLabel: "View chat rooms and messages",
          }}
        />
        <Tab.Screen
          name="SettingsStack"
          component={SettingsStackNavigator}
          options={{
            tabBarLabel: "Settings",
            tabBarAccessibilityLabel: "View profile and settings",
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated, isGuestMode } = useAuthStore();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 300,
      }}
    >
      {!isAuthenticated && !isGuestMode ? (
        <>
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="CreateReview"
            options={{
              presentation: "modal",
              ...standardHeader,
              headerTitle: "Write Review",
            }}
          >
            {() => (
              <ScreenErrorBoundary screenName="Create Review">
                <CreateReviewScreen />
              </ScreenErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="PersonProfile"
            options={{
              presentation: "modal",
              ...standardHeader,
              headerTitle: "Profile",
            }}
          >
            {() => (
              <ScreenErrorBoundary screenName="Profile">
                <PersonProfileScreen />
              </ScreenErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreenWithErrorBoundary}
            options={{
              ...standardHeader,
              headerTitle: "Chat",
            }}
          />
          <Stack.Screen
            name="ReviewDetail"
            component={ReviewDetailScreen}
            options={{
              ...standardHeader,
              headerTitle: "Review",
            }}
          />
          {/** LocationFilterDemo removed */}
        </>
      )}
    </Stack.Navigator>
  );
}
