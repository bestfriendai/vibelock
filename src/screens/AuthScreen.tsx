import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../state/authStore";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async () => {
    clearError();

    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }
      if (!city || !state) {
        Alert.alert("Error", "Please enter your location");
        return;
      }
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, { city, state });
      }
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6">
          <View className="flex-1 justify-center py-12">
            {/* Logo/Header */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-brand-red rounded-full items-center justify-center mb-4">
                <Text className="text-black text-xl font-bold">LRT</Text>
              </View>
              <Text className="text-3xl font-bold text-text-primary mb-2">
                Locker Room Talk
              </Text>
              <Text className="text-text-secondary text-center">
                Anonymous dating insights from real people
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {/* Email Input */}
              <View>
                <Text className="text-text-primary font-medium mb-2">Email</Text>
                <TextInput
                  className="border border-border bg-surface-800 rounded-lg px-4 py-3 text-text-primary"
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-text-primary font-medium mb-2">Password</Text>
                <View className="relative">
                  <TextInput
                    className="border border-border bg-surface-800 rounded-lg px-4 py-3 pr-12 text-text-primary"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <Pressable
                    className="absolute right-3 top-3"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Registration Fields */}
              {!isLogin && (
                <>
                  <View>
                    <Text className="text-text-primary font-medium mb-2">
                      Confirm Password
                    </Text>
                    <TextInput
                      className="border border-border bg-surface-800 rounded-lg px-4 py-3 text-text-primary"
                      placeholder="Confirm your password"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                  </View>

                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className="text-text-primary font-medium mb-2">City</Text>
                      <TextInput
                        className="border border-border bg-surface-800 rounded-lg px-4 py-3 text-text-primary"
                        placeholder="City"
                        placeholderTextColor="#9CA3AF"
                        value={city}
                        onChangeText={setCity}
                        autoCapitalize="words"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary font-medium mb-2">State</Text>
                      <TextInput
                        className="border border-border bg-surface-800 rounded-lg px-4 py-3 text-text-primary"
                        placeholder="State"
                        placeholderTextColor="#9CA3AF"
                        value={state}
                        onChangeText={setState}
                        autoCapitalize="characters"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Error Message */}
              {error && (
                <View className="bg-brand-red/20 border border-brand-red rounded-lg p-3">
                  <Text className="text-brand-red text-center">{error}</Text>
                </View>
              )}

              {/* Submit Button */}
              <Pressable
                className={`bg-brand-red rounded-lg py-4 items-center ${
                  isLoading ? "opacity-50" : ""
                }`}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text className="text-black font-semibold text-lg">
                  {isLoading
                    ? "Loading..."
                    : isLogin
                    ? "Sign In"
                    : "Create Account"}
                </Text>
              </Pressable>

              {/* Toggle Auth Mode */}
              <View className="flex-row justify-center items-center mt-6">
                <Text className="text-text-secondary">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <Pressable onPress={() => setIsLogin(!isLogin)}>
                  <Text className="text-brand-red font-semibold">
                    {isLogin ? "Sign Up" : "Sign In"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}