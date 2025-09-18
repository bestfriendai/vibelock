import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import type { RootStackNavigationProp } from "../navigation/AppNavigator";

export default function OnboardingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { colors } = useTheme();

  const handleGetStarted = () => {
    navigation.navigate("SignUp");
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      {/* App Logo */}
      <View style={{ alignItems: "center", marginBottom: 48 }}>
        <Ionicons name="chatbubbles" size={80} color={colors.brand.red} style={{ marginBottom: 16 }} />
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: colors.text.primary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Welcome to{"\n"}Locker Room Talk
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.text.secondary,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          Connect with your community{"\n"}Share honest reviews and experiences
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ width: "100%", gap: 16 }}>
        <Pressable
          onPress={handleGetStarted}
          style={{
            backgroundColor: colors.brand.red,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Get Started
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSignIn}
          style={{
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: colors.border.default,
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Sign In
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
