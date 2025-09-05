import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedButton from "./AnimatedButton";
import AnimatedInput from "./AnimatedInput";
import LoadingSpinner from "./LoadingSpinner";
import { supabaseAuth, supabaseUsers, supabaseReviews, supabaseChat } from "../services/supabase";
import useAuthStore from "../state/authStore";
import type { GreenFlag, RedFlag } from "../types";

export default function SupabaseExample() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("testpassword123");
  const [displayName, setDisplayName] = useState("Test User");

  const { user } = useAuthStore();

  const addTestResult = (result: string) => {
    setTestResults((prev) => [...prev, result]);
  };

  const testSupabaseAuth = async () => {
    setIsLoading(true);
    try {
      // Test sign up
      addTestResult("Testing Supabase Auth Sign Up...");
      const supabaseUser = await supabaseAuth.signUp(email, password, displayName);
      addTestResult(`✅ Sign up successful: ${supabaseUser.email}`);

      // Test sign out
      addTestResult("Testing Supabase Auth Sign Out...");
      await supabaseAuth.signOut();
      addTestResult("✅ Sign out successful");

      // Test sign in
      addTestResult("Testing Supabase Auth Sign In...");
      const signInUser = await supabaseAuth.signIn(email, password);
      addTestResult(`✅ Sign in successful: ${signInUser.email}`);
    } catch (error) {
      addTestResult(`❌ Auth test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const testSupabaseDatabase = async () => {
    setIsLoading(true);
    try {
      // Test basic database connection
      addTestResult("Testing Supabase Database Connection...");
      const currentUser = await supabaseAuth.getCurrentUser();
      if (!currentUser) {
        addTestResult("❌ No authenticated user found");
        return;
      }
      addTestResult(`✅ Database connection successful, user: ${currentUser.email}`);

      // Test user profile operations
      addTestResult("Testing User Profile Operations...");
      const userExists = await supabaseUsers.userExists(currentUser.id);
      addTestResult(`✅ User exists check: ${userExists}`);
    } catch (error) {
      addTestResult(`❌ Database test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const testUserProfile = async () => {
    const user = await supabaseAuth.getCurrentUser();
    if (!user) {
      addTestResult("❌ No authenticated user for profile test");
      return;
    }

    setIsLoading(true);
    try {
      // Test create user profile
      addTestResult("Testing User Profile Creation...");
      await supabaseUsers.createUserProfile(user.id, {
        email: user.email,
        anonymousId: `anon_${Date.now()}`,
        location: { city: "Test City", state: "TS" },
        genderPreference: "all",
      });
      addTestResult("✅ User profile created successfully");

      // Test get user profile
      addTestResult("Testing Get User Profile...");
      const profile = await supabaseUsers.getUserProfile(user.id);
      addTestResult(`✅ Profile retrieved: ${profile?.email}`);

      // Test update user profile
      addTestResult("Testing Update User Profile...");
      await supabaseUsers.updateUserProfile(user.id, {
        location: { city: "Updated City", state: "UC" },
      });
      addTestResult("✅ Profile updated successfully");
    } catch (error) {
      addTestResult(`❌ Profile test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const testReviews = async () => {
    setIsLoading(true);
    try {
      // Test create review
      addTestResult("Testing Review Creation...");
      const reviewData = {
        reviewerAnonymousId: `anon_${Date.now()}`,
        reviewedPersonName: "Test Person",
        reviewedPersonLocation: { city: "Test City", state: "TS" },
        greenFlags: ["good_communicator", "respectful"] as GreenFlag[],
        redFlags: [] as RedFlag[],
        sentiment: "green" as const,
        reviewText: "This is a test review created via Supabase integration.",
        media: [],
        profilePhoto: "https://picsum.photos/400/600?random=1",
        status: "approved" as const,
        likeCount: 0,
      };

      const reviewId = await supabaseReviews.createReview(reviewData);
      addTestResult(`✅ Review created with ID: ${reviewId}`);

      // Test get reviews
      addTestResult("Testing Get Reviews...");
      const reviews = await supabaseReviews.getReviews(5, 0);
      addTestResult(`✅ Retrieved ${reviews.length} reviews`);

      // Test get specific review
      addTestResult("Testing Get Specific Review...");
      const specificReview = await supabaseReviews.getReview(reviewId);
      addTestResult(`✅ Retrieved review: ${specificReview?.reviewedPersonName}`);
    } catch (error) {
      addTestResult(`❌ Reviews test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const testChat = async () => {
    setIsLoading(true);
    try {
      // Test get chat rooms
      addTestResult("Testing Get Chat Rooms...");
      const chatRooms = await supabaseChat.getChatRooms();
      addTestResult(`✅ Retrieved ${chatRooms.length} chat rooms`);

      if (chatRooms.length > 0) {
        const testRoom = chatRooms[0];
        addTestResult(`Testing with room: ${testRoom.name}`);

        // Test send message
        addTestResult("Testing Send Message...");
        await supabaseChat.sendMessage(testRoom.id, {
          chatRoomId: testRoom.id,
          senderId: (await supabaseAuth.getCurrentUser())?.id || "test",
          senderName: "Test User",
          content: "Test message from Supabase integration",
          messageType: "text",
          isRead: false,
        });
        addTestResult("✅ Message sent successfully");
      }
    } catch (error) {
      addTestResult(`❌ Chat test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addTestResult("🚀 Starting comprehensive Supabase tests...");

    await testSupabaseAuth();
    await testSupabaseDatabase();
    await testUserProfile();
    await testReviews();
    await testChat();

    addTestResult("🎉 All tests completed!");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-text-primary mb-2">Supabase Integration Test</Text>
          <Text className="text-text-secondary">Test Supabase Authentication, Database, and other services</Text>
        </View>

        {/* Test Inputs */}
        <View className="mb-6 space-y-4">
          <AnimatedInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="test@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AnimatedInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
          />
          <AnimatedInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Test User"
          />
        </View>

        {/* Test Buttons */}
        <View className="mb-6 space-y-3">
          <AnimatedButton title="Run All Tests" onPress={runAllTests} disabled={isLoading} variant="primary" />

          <View className="flex-row space-x-3">
            <AnimatedButton
              title="Test Auth"
              onPress={testSupabaseAuth}
              disabled={isLoading}
              variant="secondary"
              className="flex-1"
            />
            <AnimatedButton
              title="Test Database"
              onPress={testSupabaseDatabase}
              disabled={isLoading}
              variant="secondary"
              className="flex-1"
            />
          </View>

          <View className="flex-row space-x-3">
            <AnimatedButton
              title="Test Profile"
              onPress={testUserProfile}
              disabled={isLoading}
              variant="secondary"
              className="flex-1"
            />
            <AnimatedButton
              title="Test Reviews"
              onPress={testReviews}
              disabled={isLoading}
              variant="secondary"
              className="flex-1"
            />
          </View>

          <AnimatedButton title="Clear Results" onPress={clearResults} disabled={isLoading} variant="ghost" />
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View className="mb-4">
            <LoadingSpinner size="small" />
          </View>
        )}

        {/* Current User Info */}
        {user && (
          <View className="mb-4 p-4 bg-surface-800 rounded-xl border border-border">
            <Text className="text-text-primary font-medium mb-1">Current User</Text>
            <Text className="text-text-secondary text-sm">{user.email}</Text>
            <Text className="text-text-secondary text-sm">ID: {user.id}</Text>
          </View>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <View className="bg-surface-800 rounded-xl border border-border p-4">
            <Text className="text-text-primary font-medium mb-3">Test Results</Text>
            <ScrollView className="max-h-96">
              {testResults.map((result, index) => (
                <Text key={index} className="text-text-secondary text-sm mb-1 font-mono">
                  {result}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
