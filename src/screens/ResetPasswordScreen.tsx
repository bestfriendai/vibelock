import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableWithoutFeedback, Keyboard, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import AnimatedInput from "../components/AnimatedInput";
import ThemeAwareLogo from "../components/ThemeAwareLogo";
import { authService } from "../services/auth";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const confirmPasswordRef = useRef<TextInput>(null);

  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);

  // Initialize entrance animations
  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 200 }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));

    // Form entrance
    formOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    formTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 200 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleResetPassword = async () => {
    setError("");

    // Validate password
    if (!password.trim()) {
      setError("Please enter a new password");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await authService.updatePassword(password);
      setSuccess(true);

      // Show success message and navigate to sign in after delay
      setTimeout(() => {
        navigation.navigate("SignIn");
      }, 2000);
    } catch (err: any) {
      const appError = err instanceof AppError ? err : parseSupabaseError(err);

      if (appError.message.includes("Invalid refresh token") || appError.message.includes("expired")) {
        setError("Reset link has expired. Please request a new password reset");
      } else {
        setError(appError.message || "Failed to reset password. Please try again");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  if (success) {
    return (
      <LinearGradient colors={["#1a1a1a", "#2d2d2d", "#1a1a1a"]} className="flex-1">
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-6 justify-center items-center">
            <Animated.View style={logoAnimatedStyle} className="items-center">
              <View className="w-20 h-20 bg-green-500/20 rounded-full items-center justify-center mb-6">
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              </View>
              <Text className="text-white text-2xl font-bold text-center mb-4">Password Reset Successfully!</Text>
              <Text className="text-gray-400 text-center text-base mb-8">
                Your password has been updated. You can now sign in with your new password.
              </Text>
              <Text className="text-gray-500 text-center text-sm">Redirecting to sign in...</Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#1a1a1a", "#2d2d2d", "#1a1a1a"]} className="flex-1">
      <SafeAreaView className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-1 px-6 justify-center">
              {/* Logo */}
              <Animated.View style={logoAnimatedStyle} className="items-center mb-8">
                <ThemeAwareLogo size={80} />
                <Text className="text-white text-2xl font-bold mt-4 mb-2">Set New Password</Text>
                <Text className="text-gray-400 text-center text-base">Enter your new password below</Text>
              </Animated.View>

              {/* Form */}
              <Animated.View style={formAnimatedStyle}>
                <AnimatedInput
                  placeholder="New Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  rightIcon={
                    <TouchableWithoutFeedback onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
                    </TouchableWithoutFeedback>
                  }
                  className="mb-4"
                />

                <AnimatedInput
                  ref={confirmPasswordRef}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  rightIcon={
                    <TouchableWithoutFeedback onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
                    </TouchableWithoutFeedback>
                  }
                  className="mb-6"
                />

                {/* Password Requirements */}
                <View className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <Text className="text-white font-medium mb-2">Password Requirements:</Text>
                  <View className="space-y-1">
                    <Text className={`text-sm ${password.length >= 8 ? "text-green-400" : "text-gray-400"}`}>
                      • At least 8 characters
                    </Text>
                    <Text className={`text-sm ${/(?=.*[a-z])/.test(password) ? "text-green-400" : "text-gray-400"}`}>
                      • One lowercase letter
                    </Text>
                    <Text className={`text-sm ${/(?=.*[A-Z])/.test(password) ? "text-green-400" : "text-gray-400"}`}>
                      • One uppercase letter
                    </Text>
                    <Text className={`text-sm ${/(?=.*\d)/.test(password) ? "text-green-400" : "text-gray-400"}`}>
                      • One number
                    </Text>
                  </View>
                </View>

                {/* Error Message */}
                {error ? (
                  <View className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    <Text className="text-red-400 text-center">{error}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <AnimatedButton
                  title="Update Password"
                  variant="primary"
                  loading={isLoading}
                  onPress={handleResetPassword}
                  className="mb-6"
                />

                {/* Back to Sign In */}
                <View className="items-center">
                  <AnimatedButton
                    title="Back to Sign In"
                    variant="ghost"
                    size="small"
                    onPress={() => navigation.navigate("SignIn")}
                  />
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </LinearGradient>
  );
}
