import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../state/authStore";

// Test component to verify error handling works properly
export const AuthErrorTestScreen: React.FC = () => {
  const { register, login, isLoading } = useAuthStore();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testInvalidEmail = async () => {
    addResult("Testing invalid email...");
    try {
      await register("36373@gmail.com", "password123", { city: "Test", state: "Test" }, {});
      addResult("❌ Should have failed with invalid email");
    } catch (error) {
      addResult("✅ Invalid email test completed");
    }
  };

  const testInvalidEmailFormat = async () => {
    addResult("Testing invalid email format...");
    try {
      await register("notanemail", "password123", { city: "Test", state: "Test" }, {});
      addResult("❌ Should have failed with invalid email format");
    } catch (error) {
      addResult("✅ Invalid email format test completed");
    }
  };

  const testShortPassword = async () => {
    addResult("Testing short password...");
    try {
      await register("test@example.com", "123", { city: "Test", state: "Test" }, {});
      addResult("❌ Should have failed with short password");
    } catch (error) {
      addResult("✅ Short password test completed");
    }
  };

  const testInvalidLogin = async () => {
    addResult("Testing invalid login credentials...");
    try {
      await login("nonexistent@example.com", "wrongpassword");
      addResult("❌ Should have failed with invalid credentials");
    } catch (error) {
      addResult("✅ Invalid login test completed");
    }
  };

  const testEmptyFields = async () => {
    addResult("Testing empty email...");
    try {
      await register("", "password123", { city: "Test", state: "Test" }, {});
      addResult("❌ Should have failed with empty email");
    } catch (error) {
      addResult("✅ Empty email test completed");
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addResult("🧪 Starting comprehensive auth error tests...");

    await testInvalidEmail();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait between tests

    await testInvalidEmailFormat();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testShortPassword();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testInvalidLogin();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testEmptyFields();

    addResult("🎉 All error handling tests completed!");
    addResult("Check that each test showed a specific error dialog");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="p-6">
        <Text className="text-text-primary text-2xl font-bold mb-6">Auth Error Testing</Text>

        <Text className="text-text-secondary text-sm mb-6">
          Test specific error dialogs for authentication failures. Each test should show a specific error dialog instead
          of generic error messages.
        </Text>

        {/* Expected Error Messages */}
        <View className="bg-surface-800 rounded-lg p-4 mb-6">
          <Text className="text-text-primary font-semibold mb-3">Expected Error Messages</Text>
          <View className="space-y-2">
            <Text className="text-text-secondary text-sm">
              • Invalid email: "Email not valid, try a different email"
            </Text>
            <Text className="text-text-secondary text-sm">• Wrong credentials: "Email/Password is incorrect"</Text>
            <Text className="text-text-secondary text-sm">
              • Short password: "Password must be at least 6 characters long"
            </Text>
            <Text className="text-text-secondary text-sm">
              • Empty fields: "Email is required" / "Password is required"
            </Text>
          </View>
        </View>

        {/* Test Buttons */}
        <View className="mb-6">
          <Text className="text-text-primary font-semibold mb-3">Individual Tests</Text>

          <View className="space-y-2">
            <Pressable onPress={testInvalidEmail} disabled={isLoading} className="bg-red-500 px-4 py-3 rounded-lg">
              <Text className="text-white font-medium text-center">Test Invalid Email (36373@gmail.com)</Text>
            </Pressable>

            <Pressable
              onPress={testInvalidEmailFormat}
              disabled={isLoading}
              className="bg-orange-500 px-4 py-3 rounded-lg"
            >
              <Text className="text-white font-medium text-center">Test Invalid Email Format</Text>
            </Pressable>

            <Pressable onPress={testShortPassword} disabled={isLoading} className="bg-yellow-500 px-4 py-3 rounded-lg">
              <Text className="text-white font-medium text-center">Test Short Password</Text>
            </Pressable>

            <Pressable onPress={testInvalidLogin} disabled={isLoading} className="bg-purple-500 px-4 py-3 rounded-lg">
              <Text className="text-white font-medium text-center">Test Invalid Login</Text>
            </Pressable>

            <Pressable onPress={testEmptyFields} disabled={isLoading} className="bg-blue-500 px-4 py-3 rounded-lg">
              <Text className="text-white font-medium text-center">Test Empty Fields</Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2 mt-4">
            <Pressable onPress={runAllTests} disabled={isLoading} className="flex-1 bg-brand-red px-4 py-3 rounded-lg">
              <Text className="text-white font-semibold text-center">Run All Tests</Text>
            </Pressable>

            <Pressable onPress={clearResults} className="bg-surface-700 px-4 py-3 rounded-lg">
              <Text className="text-text-primary font-semibold">Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Test Results */}
        <View className="flex-1">
          <Text className="text-text-primary font-semibold mb-3">Test Results</Text>
          <ScrollView className="bg-surface-800 rounded-lg p-4 flex-1">
            {testResults.length === 0 ? (
              <Text className="text-text-secondary text-sm">No tests run yet. Click "Run All Tests" to start.</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} className="text-text-secondary text-xs mb-1 font-mono">
                  {result}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Instructions */}
        <View className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={16} color="#F59E0B" />
            <Text className="text-yellow-600 text-sm font-medium ml-2">Testing Instructions</Text>
          </View>
          <Text className="text-yellow-700 text-xs leading-5">
            Each test should show a specific error dialog. The old generic error banners should no longer appear. Verify
            that each error message is user-friendly and specific to the error type.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
