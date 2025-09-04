import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

// Import screens (we'll create these next)
import BrowseScreen from "../screens/BrowseScreen";
import SearchScreen from "../screens/SearchScreen";
import CreateReviewScreen from "../screens/CreateReviewScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PersonProfileScreen from "../screens/PersonProfileScreen";
import AuthScreen from "../screens/AuthScreen";
import OnboardingScreen from "../screens/OnboardingScreen";

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
};

export type TabParamList = {
  Browse: undefined;
  Search: undefined;
  Create: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab Navigator Component
function TabNavigator() {
  return (
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
            case "Create":
              iconName = focused ? "add-circle" : "add-circle-outline";
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
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5EA",
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Browse" 
        component={BrowseScreen}
        options={{ tabBarLabel: "Browse" }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ tabBarLabel: "Search" }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateReviewScreen}
        options={{ tabBarLabel: "Create" }}
      />
      <Tab.Screen 
        name="Settings" 
        component={ProfileScreen}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
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
            name="PersonProfile" 
            component={PersonProfileScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Profile",
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: "600",
              },
              headerStyle: {
                backgroundColor: "#FFFFFF",
              },
              headerTintColor: "#000000",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}