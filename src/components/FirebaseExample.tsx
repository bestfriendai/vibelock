import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "./AnimatedButton";
import AnimatedInput from "./AnimatedInput";
import LoadingSpinner from "./LoadingSpinner";
import { firebaseAuth, firebaseUsers, firebaseFirestore, firebaseReviews } from "../services/firebase";
import useAuthStore from "../state/authStore";
import useReviewsStore from "../state/reviewsStore";
import type { GreenFlag, RedFlag } from "../types";

export default function FirebaseExample() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [displayName, setDisplayName] = useState("Test User");
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { user, isAuthenticated } = useAuthStore();
  const { reviews } = useReviewsStore();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testFirebaseAuth = async () => {
    setIsLoading(true);
    try {
      // Test sign up
      addTestResult("Testing Firebase Auth Sign Up...");
      const firebaseUser = await firebaseAuth.signUp(email, password, displayName);
      addTestResult(`✅ Sign up successful: ${firebaseUser.email}`);

      // Test sign out
      addTestResult("Testing Firebase Auth Sign Out...");
      await firebaseAuth.signOut();
      addTestResult("✅ Sign out successful");

      // Test sign in
      addTestResult("Testing Firebase Auth Sign In...");
      const signInUser = await firebaseAuth.signIn(email, password);
      addTestResult(`✅ Sign in successful: ${signInUser.email}`);

    } catch (error) {
      addTestResult(`❌ Auth test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const testFirestoreOperations = async () => {
    setIsLoading(true);
    try {
      // Test create document
      addTestResult("Testing Firestore Create Document...");
      await firebaseFirestore.createDocument("test", "doc1", {
        name: "Test Document",
        value: 42,
        active: true
      });
      addTestResult("✅ Document created successfully");

      // Test get document
      addTestResult("Testing Firestore Get Document...");
      const doc = await firebaseFirestore.getDocument("test", "doc1");
      addTestResult(`✅ Document retrieved: ${JSON.stringify(doc)}`);

      // Test update document
      addTestResult("Testing Firestore Update Document...");
      await firebaseFirestore.updateDocument("test", "doc1", {
        value: 100,
        updated: true
      });
      addTestResult("✅ Document updated successfully");

      // Test get collection
      addTestResult("Testing Firestore Get Collection...");
      const collection = await firebaseFirestore.getCollection("test");
      addTestResult(`✅ Collection retrieved: ${collection.length} documents`);

      // Test delete document
      addTestResult("Testing Firestore Delete Document...");
      await firebaseFirestore.deleteDocument("test", "doc1");
      addTestResult("✅ Document deleted successfully");

    } catch (error) {
      addTestResult(`❌ Firestore test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const testUserProfile = async () => {
    if (!user) {
      addTestResult("❌ No authenticated user for profile test");
      return;
    }

    setIsLoading(true);
    try {
      // Test create user profile
      addTestResult("Testing User Profile Creation...");
      await firebaseUsers.createUserProfile(user.id, {
        email: user.email,
        anonymousId: `anon_${Date.now()}`,
        location: { city: "Test City", state: "TS" },
        genderPreference: "all"
      });
      addTestResult("✅ User profile created successfully");

      // Test get user profile
      addTestResult("Testing Get User Profile...");
      const profile = await firebaseUsers.getUserProfile(user.id);
      addTestResult(`✅ Profile retrieved: ${profile?.email}`);

      // Test update user profile
      addTestResult("Testing Update User Profile...");
      await firebaseUsers.updateUserProfile(user.id, {
        location: { city: "Updated City", state: "UC" }
      });
      addTestResult("✅ User profile updated successfully");

    } catch (error) {
      addTestResult(`❌ User profile test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
        reviewText: "This is a test review created via Firebase integration.",
        media: [],
        profilePhoto: "https://picsum.photos/400/600?random=1",
        status: "approved" as const,
        likeCount: 0
      };

const reviewId = await firebaseReviews.createReview(reviewData as any);
      addTestResult(`✅ Review created successfully: ${reviewId}`);

      // Test get reviews
      addTestResult("Testing Get Reviews...");
      const { reviews: fetchedReviews } = await firebaseReviews.getReviews(5);
      addTestResult(`✅ Reviews retrieved: ${fetchedReviews.length} reviews`);

      // Test update review (like)
      if (fetchedReviews.length > 0) {
        addTestResult("Testing Review Update (Like)...");
        const firstReview = fetchedReviews[0];
        await firebaseReviews.updateReview(firstReview.id, {
          likeCount: firstReview.likeCount + 1
        });
        addTestResult("✅ Review liked successfully");
      }

    } catch (error) {
      addTestResult(`❌ Reviews test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addTestResult("🚀 Starting comprehensive Firebase tests...");
    
    await testFirebaseAuth();
    await testFirestoreOperations();
    await testUserProfile();
    await testReviews();
    
    addTestResult("🎉 All tests completed!");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-text-primary mb-2">
            Firebase Integration Test
          </Text>
          <Text className="text-text-secondary">
            Test Firebase Authentication, Firestore, and other services
          </Text>
        </View>

        {/* Current Status */}
        <View className="bg-surface-800 rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-text-primary mb-2">
            Current Status
          </Text>
          <View className="flex-row items-center mb-2">
            <Ionicons 
              name={isAuthenticated ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={isAuthenticated ? "#10B981" : "#EF4444"} 
            />
            <Text className="text-text-secondary ml-2">
              Authentication: {isAuthenticated ? "Signed In" : "Not Signed In"}
            </Text>
          </View>
          {user && (
            <Text className="text-text-muted text-sm">
              User: {user.email} ({user.id})
            </Text>
          )}
          <Text className="text-text-muted text-sm">
            Reviews in store: {reviews.length}
          </Text>
        </View>

        {/* Test Configuration */}
        <View className="bg-surface-800 rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-text-primary mb-4">
            Test Configuration
          </Text>
          
          <AnimatedInput
            label="Email"
            placeholder="test@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            className="mb-4"
          />
          
          <AnimatedInput
            label="Password"
            placeholder="password123"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            className="mb-4"
          />
          
          <AnimatedInput
            label="Display Name"
            placeholder="Test User"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="person-outline"
          />
        </View>

        {/* Test Buttons */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-text-primary mb-4">
            Individual Tests
          </Text>
          
          <View className="space-y-3">
            <AnimatedButton
              title="Test Firebase Auth"
              variant="secondary"
              onPress={testFirebaseAuth}
              disabled={isLoading}
            />
            
            <AnimatedButton
              title="Test Firestore Operations"
              variant="secondary"
              onPress={testFirestoreOperations}
              disabled={isLoading}
            />
            
            <AnimatedButton
              title="Test User Profile"
              variant="secondary"
              onPress={testUserProfile}
              disabled={isLoading || !isAuthenticated}
            />
            
            <AnimatedButton
              title="Test Reviews"
              variant="secondary"
              onPress={testReviews}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* Run All Tests */}
        <View className="mb-6">
          <AnimatedButton
            title="Run All Tests"
            variant="primary"
            onPress={runAllTests}
            disabled={isLoading}
            className="mb-3"
          />
          
          <AnimatedButton
            title="Clear Results"
            variant="ghost"
            onPress={clearResults}
            disabled={isLoading}
          />
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View className="items-center mb-6">
            <LoadingSpinner size="large" />
            <Text className="text-text-secondary mt-2">Running tests...</Text>
          </View>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <View className="bg-surface-800 rounded-lg p-4">
            <Text className="text-lg font-semibold text-text-primary mb-4">
              Test Results
            </Text>
            <ScrollView className="max-h-96">
              {testResults.map((result, index) => (
                <Text 
                  key={index} 
                  className="text-text-secondary text-sm mb-1 font-mono"
                >
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