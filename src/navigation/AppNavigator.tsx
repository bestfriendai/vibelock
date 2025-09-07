import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import AdBanner from "../components/AdBanner";

// Import screens
import BrowseScreen from "../screens/BrowseScreen";
import SearchScreen from "../screens/SearchScreen";
import CreateReviewScreen from "../screens/CreateReviewScreen";
import ChatroomsScreen from "../screens/ChatroomsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PersonProfileScreen from "../screens/PersonProfileScreen";

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

// Types for navigation - using serialized versions for React Navigation
type SerializedReview = Omit<import("../types").Review, "createdAt" | "updatedAt"> & {
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Navigation types
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
    review: SerializedReview;
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
    review: SerializedReview;
  };
};

export type SearchStackParamList = {
  Search: undefined;
  ReviewDetail: {
    review: SerializedReview;
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const ChatroomsStack = createNativeStackNavigator<ChatroomsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function CreateTabButton() {
  const navigation = useNavigation<any>();
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
function BrowseStackNavigator() {
  return (
    <BrowseStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <BrowseStack.Screen name="Browse" component={BrowseScreen} />
      <BrowseStack.Screen
        name="ReviewDetail"
        component={ReviewDetailScreen}
        options={{
          headerShown: true,
          headerTitle: "Review",
          headerStyle: { backgroundColor: "#000000" },
          headerTintColor: "#FFFFFF",
          headerBackTitle: "Back",
        }}
      />
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
      <SearchStack.Screen name="Search" component={SearchScreen} />
      <SearchStack.Screen
        name="ReviewDetail"
        component={ReviewDetailScreen}
        options={{
          headerShown: true,
          headerTitle: "Review",
          headerStyle: { backgroundColor: "#000000" },
          headerTintColor: "#FFFFFF",
          headerBackTitle: "Back",
        }}
      />
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
          headerShown: true,
          headerTitle: "Notifications",
          headerStyle: { backgroundColor: "#000000" },
          headerTintColor: "#FFFFFF",
          headerBackTitle: "Back",
        }}
      />
      <SettingsStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{
          headerShown: true,
          headerTitle: "Delete Account",
          headerStyle: { backgroundColor: "#000000" },
          headerTintColor: "#FFFFFF",
          headerBackTitle: "Back",
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
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface-900">
      <Tab.Navigator
        screenOptions={({ route }) => ({
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
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: "#000000",
            borderTopWidth: 1,
            borderTopColor: "#2A2A2F",
            // Height accounts for the iOS home indicator area
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 4,
            height: 52 + (insets.bottom || 0),
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
          headerShown: false,
        })}
      >
        <Tab.Screen name="BrowseStack" component={BrowseStackNavigator} options={{ tabBarLabel: "Browse" }} />
        <Tab.Screen name="SearchStack" component={SearchStackNavigator} options={{ tabBarLabel: "Search" }} />
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
        <Tab.Screen name="ChatroomsStack" component={ChatroomsStackNavigator} options={{ tabBarLabel: "Chatrooms" }} />
        <Tab.Screen name="SettingsStack" component={SettingsStackNavigator} options={{ tabBarLabel: "Settings" }} />
      </Tab.Navigator>

      {/* Ad banner positioned at the tab navigator level for proper absolute positioning */}
      <AdBanner placement="browse" />
    </View>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated, isGuestMode } = useAuthStore();

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
            component={CreateReviewScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Write Review",
              headerStyle: { backgroundColor: "#000000" },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="PersonProfile"
            component={PersonProfileScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Profile",
              headerStyle: { backgroundColor: "#141418" },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreen}
            options={{
              headerShown: true,
              headerTitle: "Chat",
              headerStyle: { backgroundColor: "#141418" },
              headerTintColor: "#FFFFFF",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="ReviewDetail"
            component={ReviewDetailScreen}
            options={{
              headerShown: true,
              headerTitle: "Review",
              headerStyle: { backgroundColor: "#141418" },
              headerTintColor: "#FFFFFF",
              headerBackTitle: "Back",
            }}
          />
          {/** LocationFilterDemo removed */}
        </>
      )}
    </Stack.Navigator>
  );
}
