import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Import screens
import BrowseScreen from "../screens/BrowseScreen";
import SearchScreen from "../screens/SearchScreen";
import CreateReviewScreen from "../screens/CreateReviewScreen";
import ChatroomsScreen from "../screens/ChatroomsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PersonProfileScreen from "../screens/PersonProfileScreen";
import AuthScreen from "../screens/AuthScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import ReviewDetailScreen from "../screens/ReviewDetailScreen";

// Import stores
import useAuthStore from "../state/authStore";

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  PersonProfile: { 
    firstName: string; 
    location: { city: string; state: string }; 
  };
  CreateReview: undefined;
  ChatRoom: { roomId: string };
  ReviewDetail: {
    review: import("../types").Review;
  };
};

export type TabParamList = {
  BrowseStack: undefined;
  SearchStack: undefined;
  ChatroomsStack: undefined;
  SettingsStack: undefined;
};

export type BrowseStackParamList = {
  Browse: undefined;
  ReviewDetail: {
    review: import("../types").Review;
  };
};

export type SearchStackParamList = {
  Search: undefined;
  ReviewDetail: {
    review: import("../types").Review;
  };
};

export type ChatroomsStackParamList = {
  Chatrooms: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const ChatroomsStack = createNativeStackNavigator<ChatroomsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function FloatingCreateButton() {
  const navigation = useNavigation<any>();
  return (
    <Pressable
      className="absolute bottom-16 self-center w-14 h-14 rounded-full bg-white items-center justify-center shadow-lg"
      onPress={() => navigation.navigate("CreateReview")}
      hitSlop={10}
    >
      <Ionicons name="add" size={28} color="#000000" />
    </Pressable>
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
          headerStyle: { backgroundColor: "#141418" },
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
          headerStyle: { backgroundColor: "#141418" },
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
    </SettingsStack.Navigator>
  );
}

// Tab Navigator Component
function TabNavigator() {
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
          tabBarStyle: {
            backgroundColor: "#141418",
            borderTopWidth: 1,
            borderTopColor: "#2A2A2F",
            paddingBottom: 8,
            paddingTop: 8,
            height: 80,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
          headerShown: false,
        })}
      >
        <Tab.Screen name="BrowseStack" component={BrowseStackNavigator} options={{ tabBarLabel: "Browse" }} />
        <Tab.Screen name="SearchStack" component={SearchStackNavigator} options={{ tabBarLabel: "Search" }} />
        <Tab.Screen name="ChatroomsStack" component={ChatroomsStackNavigator} options={{ tabBarLabel: "Chatrooms" }} />
        <Tab.Screen name="SettingsStack" component={SettingsStackNavigator} options={{ tabBarLabel: "Settings" }} />
      </Tab.Navigator>

      {/* Floating Create Button */}
      <FloatingCreateButton />
    </View>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 300,
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{
              animation: "fade",
            }}
          />
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen 
            name="SignIn" 
            component={SignInScreen}
            options={{
              animation: "slide_from_right",
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
              headerStyle: { backgroundColor: "#141418" },
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
        </>
      )}
    </Stack.Navigator>
  );
}