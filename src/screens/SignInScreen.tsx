import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import AnimatedButton from "../components/AnimatedButton";
import AnimatedInput from "../components/AnimatedInput";

import useAuthStore from "../state/authStore";


export default function SignInScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const passwordRef = useRef<TextInput>(null);

  const { login, isLoading, error, clearError } = useAuthStore();

  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(30);

  // Initialize entrance animations
  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 200 }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));

    // Form entrance
    formOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    formTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 200 }));

    // Footer entrance
    footerOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    footerTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 200 }));
  }, []);

  // Validation functions kept for future use but not used in testing mode
  // const validateEmail = (email: string) => {
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   if (!email) {
  //     return "Email is required";
  //   }
  //   if (!emailRegex.test(email)) {
  //     return "Please enter a valid email address";
  //   }
  //   return "";
  // };

  // const validatePassword = (password: string) => {
  //   if (!password) {
  //     return "Password is required";
  //   }
  //   if (password.length < 6) {
  //     return "Password must be at least 6 characters";
  //   }
  //   return "";
  // };

  const handleSubmit = async () => {
    clearError();

    // Basic validation
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleSignUpPress = () => {
    navigation.navigate("SignUp");
  };



  const dismissKeyboard = () => {
    Keyboard.dismiss();
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

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerTranslateY.value }],
  }));

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView className="flex-1 bg-surface-900">
        <LinearGradient colors={["#141418", "#1A1A20", "#141418"]} className="absolute inset-0" />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center px-6 py-12">
              {/* Logo Section */}
              <Animated.View style={logoAnimatedStyle} className="items-center mb-12">
                <View className="w-20 h-20 mb-4 shadow-lg">
                  <Image
                    source={require("../../assets/logo-circular.png")}
                    style={{ width: 80, height: 80 }}
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-4xl font-bold text-text-primary mb-3 text-center">Welcome Back</Text>
                <Text className="text-lg text-text-secondary text-center leading-7">
                  Sign in to continue to Locker Room Talk
                </Text>
              </Animated.View>

              {/* Form Section */}
              <Animated.View style={formAnimatedStyle} className="space-y-6">
                <AnimatedInput
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError("");
                  }}
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  leftIcon="mail-outline"
                />

                <AnimatedInput
                  ref={passwordRef}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError("");
                  }}
                  error={passwordError}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                {/* Global Error */}
                {error && (
                  <View className="bg-brand-red/20 border border-brand-red/30 rounded-lg p-4">
                    <Text className="text-brand-red text-center font-medium">{error}</Text>
                  </View>
                )}

                {/* Submit Button */}
                <AnimatedButton
                  title="Sign In"
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  onPress={handleSubmit}
                  className="mt-8"
                />

                {/* Forgot Password */}
                <View className="items-center">
                  <AnimatedButton
                    title="Forgot Password?"
                    variant="ghost"
                    size="small"
                    onPress={() => {
                      // Handle forgot password
                    }}
                  />
                </View>
              </Animated.View>
            </View>



            {/* Footer */}
            <Animated.View style={footerAnimatedStyle} className="px-6 pb-8">
              <View className="flex-row justify-center items-center">
                <Text className="text-text-secondary">Don't have an account? </Text>
                <AnimatedButton
                  title="Sign Up"
                  variant="ghost"
                  size="small"
                  onPress={handleSignUpPress}
                  textClassName="text-brand-red font-semibold"
                />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
