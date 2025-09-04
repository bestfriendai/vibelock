import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Import screens (we'll create these next)
import BrowseScreen from "../screens/BrowseScreen";
import SearchScreen from "../screens/SearchScreen";
import CreateReviewScreen from "../screens/CreateReviewScreen";
import ChatroomsScreen from "../screens/ChatroomsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PersonProfileScreen from "../screens/PersonProfileScreen";
import AuthScreen from "../screens/AuthScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import ReviewDetailScreen from "../screens/ReviewDetailScreen";

// Import stores
import useAuthStore from "../state/authStore";

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
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
  Browse: undefined;
  Search: undefined;
  Chatrooms: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function FloatingCreateButton() {
  const navigation = useNavigation<any>();
  return (
    <Pressable
      className="absolute bottom-16 self-center w-14 h-14 rounded-full bg-brand-red items-center justify-center shadow"
      onPress={() => navigation.navigate("CreateReview")}
      hitSlop={10}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </Pressable>
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
              case "Browse":
                iconName = focused ? "home" : "home-outline";
                break;
              case "Search":
                iconName = focused ? "search" : "search-outline";
                break;
              case "Chatrooms":
                iconName = focused ? "chatbubbles" : "chatbubbles-outline";
                break;
              case "Settings":
                iconName = focused ? "person" : "person-outline";
                break;
              default:
                iconName = "home-outline";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#FF6B6B",
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
        <Tab.Screen name="Browse" component={BrowseScreen} options={{ tabBarLabel: "Browse" }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: "Search" }} />
        <Tab.Screen name="Chatrooms" component={ChatroomsScreen} options={{ tabBarLabel: "Chatrooms" }} />
        <Tab.Screen name="Settings" component={ProfileScreen} options={{ tabBarLabel: "Settings" }} />
      </Tab.Navigator>

      {/* Floating Create Button */}
      <FloatingCreateButton />
    </View>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}