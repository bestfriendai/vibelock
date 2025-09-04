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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import AnimatedButton from "../components/AnimatedButton";
import AnimatedInput from "../components/AnimatedInput";
import TestingBanner from "../components/TestingBanner";
import useAuthStore from "../state/authStore";

export default function SignUpScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [cityError, setCityError] = useState("");
  const [stateError, setStateError] = useState("");

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);

  const { register, isLoading, error, clearError } = useAuthStore();

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

  // const validateConfirmPassword = (password: string, confirmPassword: string) => {
  //   if (!confirmPassword) {
  //     return "Please confirm your password";
  //   }
  //   if (password !== confirmPassword) {
  //     return "Passwords do not match";
  //   }
  //   return "";
  // };

  // const validateCity = (city: string) => {
  //   if (!city) {
  //     return "City is required";
  //   }
  //   if (city.length < 2) {
  //     return "Please enter a valid city name";
  //   }
  //   return "";
  // };

  // const validateState = (state: string) => {
  //   if (!state) {
  //     return "State is required";
  //   }
  //   if (state.length !== 2) {
  //     return "Please enter a valid 2-letter state code";
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
    
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Please confirm your password");
      return;
    }
    
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }
    
    if (!city.trim()) {
      setCityError("City is required");
      return;
    }
    
    if (!state.trim() || state.length !== 2) {
      setStateError("Please enter a valid 2-letter state code");
      return;
    }
    
    try {
      await register(email.trim(), password, { city: city.trim(), state: state.trim() });
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleSignInPress = () => {
    navigation.navigate("SignIn");
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
        <TestingBanner />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
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
                <Text className="text-3xl font-bold text-text-primary mb-2">
                  Join the Community
                </Text>
                <Text className="text-text-secondary text-center">
                  Create your account to start sharing experiences
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
                    // Validation disabled for testing
                  }}
                  error={passwordError}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <AnimatedInput
                  ref={confirmPasswordRef}
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) setConfirmPasswordError("");
                    // Validation disabled for testing
                  }}
                  error={confirmPasswordError}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  leftIcon="lock-closed-outline"
                  rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                {/* Location Section */}
                <View className="space-y-4">
                  <Text className="text-text-primary font-medium">Location</Text>
                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <AnimatedInput
                        ref={cityRef}
                        placeholder="City"
                        value={city}
                        onChangeText={(text) => {
                          setCity(text);
                          if (cityError) setCityError("");
                        }}
                        error={cityError}
                        autoCapitalize="words"
                        returnKeyType="next"
                        onSubmitEditing={() => stateRef.current?.focus()}
                        leftIcon="location-outline"
                      />
                    </View>
                    <View className="w-20">
                      <AnimatedInput
                        ref={stateRef}
                        placeholder="ST"
                        value={state}
                        onChangeText={(text) => {
                          setState(text.toUpperCase());
                          if (stateError) setStateError("");
                        }}
                        error={stateError}
                        autoCapitalize="characters"
                        maxLength={2}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                      />
                    </View>
                  </View>
                </View>

                {/* Global Error */}
                {error && (
                  <View className="bg-brand-red/20 border border-brand-red/30 rounded-lg p-4">
                    <Text className="text-brand-red text-center font-medium">
                      {error}
                    </Text>
                  </View>
                )}

                {/* Submit Button */}
                <AnimatedButton
                  title="Create Account"
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  onPress={handleSubmit}
                  className="mt-8"
                />

                {/* Terms */}
                <Text className="text-text-muted text-xs text-center leading-5">
                  By creating an account, you agree to our{" "}
                  <Text className="text-brand-red">Terms of Service</Text> and{" "}
                  <Text className="text-brand-red">Privacy Policy</Text>
                </Text>
              </Animated.View>
            </View>

            {/* Footer */}
            <Animated.View style={footerAnimatedStyle} className="px-6 pb-8">
              <View className="flex-row justify-center items-center">
                <Text className="text-text-secondary">
                  Already have an account?{" "}
                </Text>
                <AnimatedButton
                  title="Sign In"
                  variant="ghost"
                  size="small"
                  onPress={handleSignInPress}
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