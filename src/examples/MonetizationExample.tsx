import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Monetization components and hooks
import { useSubscription, useFeatureAccess, useAdStatus } from "../hooks/useSubscription";
import { FeatureGate } from "../components/FeatureGate";
import { AdBanner, BottomAdBanner } from "../components/ads/AdBanner";
import { PaywallAdaptive } from "../components/subscription/PaywallAdaptive";
import useSubscriptionStore from "../state/subscriptionStore";

// Services and utilities
import supabase from "../config/supabase";
import { subscriptionService } from "../services/subscriptionService";
import { adMobService } from "../services/adMobService";
import { runMonetizationIntegrationTests, printIntegrationTestReport } from "../utils/monetizationIntegrationTest";
import { formatSubscriptionTier, getSubscriptionBenefits } from "../utils/subscriptionUtils";

/**
 * Comprehensive example showing how to use all monetization features
 * This component demonstrates:
 * - Subscription status display
 * - Feature gating
 * - Ad display logic
 * - Paywall integration
 * - Integration testing
 */
export const MonetizationExample: React.FC = () => {
  const [showPaywall, setShowPaywall] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Monetization hooks
  const subscription = useSubscription();
  const hasPremiumAccess = useFeatureAccess("premium");
  const hasProAccess = useFeatureAccess("pro");
  const { shouldShowAds } = useAdStatus();

  // Subscription store
  const { initializeRevenueCat, syncWithSupabase, checkAdStatus, isLoading } = useSubscriptionStore();

  useEffect(() => {
    // Initialize monetization on component mount
    const initializeMonetization = async () => {
      try {
        // Initialize RevenueCat
        await initializeRevenueCat();

        // Initialize AdMob
        await adMobService.initialize();

        console.log("✅ Monetization initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize monetization:", error);
      }
    };

    initializeMonetization();
  }, [initializeRevenueCat]);

  const handleRunIntegrationTests = async () => {
    setIsRunningTests(true);
    try {
      const report = await runMonetizationIntegrationTests();
      setTestResults(report);
      printIntegrationTestReport(report);

      Alert.alert(
        "Integration Tests Complete",
        `${report.summary.passedTests}/${report.summary.totalTests} tests passed (${report.summary.successRate}%)`,
        [{ text: "OK" }],
      );
    } catch (error) {
      Alert.alert("Test Error", `Failed to run tests: ${error}`, [{ text: "OK" }]);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleShowInterstitialAd = async () => {
    try {
      const shown = await adMobService.showInterstitialAd();
      Alert.alert("Ad Result", shown ? "Interstitial ad shown" : "Ad not shown (premium user or unavailable)", [
        { text: "OK" },
      ]);
    } catch (error) {
      Alert.alert("Ad Error", `Failed to show ad: ${error}`, [{ text: "OK" }]);
    }
  };

  const handleSyncSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await syncWithSupabase(user.id);
        await checkAdStatus(user.id);
        Alert.alert("Sync Complete", "Subscription status synced with database", [{ text: "OK" }]);
      }
    } catch (error) {
      Alert.alert("Sync Error", `Failed to sync: ${error}`, [{ text: "OK" }]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-text-primary text-2xl font-bold mb-2">Monetization Example</Text>
          <Text className="text-text-secondary text-base">
            Comprehensive demonstration of RevenueCat + AdMob + Supabase integration
          </Text>
        </View>

        {/* Subscription Status */}
        <View className="bg-surface-800 rounded-lg p-4 mb-4">
          <Text className="text-text-primary text-lg font-semibold mb-3">📊 Subscription Status</Text>

          <View className="space-y-2">
            <Text className="text-text-secondary">
              Tier: <Text className="text-text-primary font-medium">{formatSubscriptionTier(subscription.tier)}</Text>
            </Text>

            <Text className="text-text-secondary">
              Status:{" "}
              <Text className={`font-medium ${subscription.isActive ? "text-green-400" : "text-red-400"}`}>
                {subscription.isActive ? "Active" : "Inactive"}
              </Text>
            </Text>

            {subscription.expiresAt && (
              <Text className="text-text-secondary">
                Expires: <Text className="text-text-primary">{subscription.expiresAt.toLocaleDateString()}</Text>
                {subscription.daysRemaining !== null && (
                  <Text className="text-yellow-400"> ({subscription.daysRemaining} days remaining)</Text>
                )}
              </Text>
            )}

            <Text className="text-text-secondary">
              Should Show Ads:{" "}
              <Text className={`font-medium ${shouldShowAds ? "text-red-400" : "text-green-400"}`}>
                {shouldShowAds ? "Yes" : "No"}
              </Text>
            </Text>
          </View>
        </View>

        {/* Feature Access */}
        <View className="bg-surface-800 rounded-lg p-4 mb-4">
          <Text className="text-text-primary text-lg font-semibold mb-3">🔐 Feature Access</Text>

          <View className="space-y-2">
            <View className="flex-row items-center">
              <Ionicons
                name={hasPremiumAccess ? "checkmark-circle" : "close-circle"}
                size={20}
                color={hasPremiumAccess ? "#10B981" : "#EF4444"}
              />
              <Text className="text-text-primary ml-2">Premium Features</Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons
                name={hasProAccess ? "checkmark-circle" : "close-circle"}
                size={20}
                color={hasProAccess ? "#10B981" : "#EF4444"}
              />
              <Text className="text-text-primary ml-2">Pro Features</Text>
            </View>
          </View>
        </View>

        {/* Subscription Benefits */}
        <View className="bg-surface-800 rounded-lg p-4 mb-4">
          <Text className="text-text-primary text-lg font-semibold mb-3">✨ Current Plan Benefits</Text>

          {getSubscriptionBenefits(subscription.tier).map((benefit, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <Ionicons name="checkmark" size={16} color="#10B981" />
              <Text className="text-text-secondary ml-2">{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Feature Gates Examples */}
        <View className="bg-surface-800 rounded-lg p-4 mb-4">
          <Text className="text-text-primary text-lg font-semibold mb-3">🚪 Feature Gates</Text>

          <FeatureGate feature="premium">
            <View className="bg-green-500/20 p-3 rounded-lg mb-3">
              <Text className="text-green-400 font-medium">🎉 Premium Feature Unlocked!</Text>
              <Text className="text-text-secondary text-sm mt-1">This content is only visible to premium users.</Text>
            </View>
          </FeatureGate>

          <FeatureGate feature="pro">
            <View className="bg-purple-500/20 p-3 rounded-lg">
              <Text className="text-purple-400 font-medium">🚀 Pro Feature Unlocked!</Text>
              <Text className="text-text-secondary text-sm mt-1">This content is only visible to pro users.</Text>
            </View>
          </FeatureGate>
        </View>

        {/* Ad Display Example */}
        {shouldShowAds && (
          <View className="bg-surface-800 rounded-lg p-4 mb-4">
            <Text className="text-text-primary text-lg font-semibold mb-3">📱 Ad Display</Text>

            <AdBanner size="mediumRectangle" className="mb-3" />

            <Pressable onPress={handleShowInterstitialAd} className="bg-blue-600 rounded-lg py-3 px-4">
              <Text className="text-white text-center font-medium">Show Interstitial Ad</Text>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View className="bg-surface-800 rounded-lg p-4 mb-4">
          <Text className="text-text-primary text-lg font-semibold mb-3">⚡ Actions</Text>

          <View className="space-y-3">
            <Pressable onPress={() => setShowPaywall(true)} className="bg-brand-red rounded-lg py-3 px-4">
              <Text className="text-white text-center font-medium">Show Paywall</Text>
            </Pressable>

            <Pressable
              onPress={handleSyncSubscription}
              disabled={isLoading}
              className={`rounded-lg py-3 px-4 ${isLoading ? "bg-surface-700" : "bg-green-600"}`}
            >
              <Text className="text-white text-center font-medium">
                {isLoading ? "Syncing..." : "Sync Subscription"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRunIntegrationTests}
              disabled={isRunningTests}
              className={`rounded-lg py-3 px-4 ${isRunningTests ? "bg-surface-700" : "bg-purple-600"}`}
            >
              <Text className="text-white text-center font-medium">
                {isRunningTests ? "Running Tests..." : "Run Integration Tests"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Test Results */}
        {testResults && (
          <View className="bg-surface-800 rounded-lg p-4 mb-4">
            <Text className="text-text-primary text-lg font-semibold mb-3">🧪 Test Results</Text>

            <Text className="text-text-secondary mb-2">
              Success Rate: <Text className="text-text-primary font-medium">{testResults.summary.successRate}%</Text>
            </Text>

            <Text className="text-text-secondary mb-2">
              Passed: <Text className="text-green-400">{testResults.summary.passedTests}</Text> | Failed:{" "}
              <Text className="text-red-400"> {testResults.summary.failedTests}</Text>
            </Text>

            {testResults.recommendations.length > 0 && (
              <View className="mt-2">
                <Text className="text-yellow-400 font-medium mb-1">Recommendations:</Text>
                {testResults.recommendations.slice(0, 3).map((rec: string, index: number) => (
                  <Text key={index} className="text-text-secondary text-sm">
                    • {rec}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Bottom spacing for ad banner */}
        <View className="h-16" />
      </ScrollView>

      {/* Bottom Ad Banner (only shows for non-premium users) */}
      <BottomAdBanner />

      {/* Paywall Modal */}
      <PaywallAdaptive visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
};
