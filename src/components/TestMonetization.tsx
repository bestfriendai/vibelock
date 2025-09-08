import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useSubscriptionStore from '../state/subscriptionStore';
import { adMobService } from '../services/adMobService';
import { buildEnv } from '../utils/buildEnvironment';

// Test component for development - add to navigation for testing
export const TestMonetization: React.FC = () => {
  const { 
    initializeRevenueCat, 
    checkSubscriptionStatus, 
    loadOfferings,
    offerings,
    customerInfo,
    isPremium,
    isLoading
  } = useSubscriptionStore();

  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runEnvironmentTest = () => {
    addResult(`Environment: ${buildEnv.isExpoGo ? 'Expo Go' : 'Development Build'}`);
    addResult(`Native Modules: ${buildEnv.hasNativeModules ? 'Available' : 'Mock'}`);
    addResult(`Can Use RevenueCat: ${buildEnv.hasNativeModules && !buildEnv.isExpoGo}`);
    addResult(`Can Use AdMob: ${buildEnv.hasNativeModules && !buildEnv.isExpoGo}`);
  };

  const testRevenueCat = async () => {
    try {
      addResult('Testing RevenueCat initialization...');
      await initializeRevenueCat('test-user-123');
      addResult('✅ RevenueCat initialized successfully');
    } catch (error) {
      addResult(`❌ RevenueCat failed: ${error}`);
    }
  };

  const testSubscriptionStatus = async () => {
    try {
      addResult('Checking subscription status...');
      await checkSubscriptionStatus();
      addResult(`✅ Status checked - Premium: ${isPremium}`);
    } catch (error) {
      addResult(`❌ Status check failed: ${error}`);
    }
  };

  const testOfferings = async () => {
    try {
      addResult('Loading offerings...');
      await loadOfferings();
      addResult(`✅ Loaded ${offerings.length} offerings`);
      if (offerings.length > 0) {
        addResult(`First offering: ${offerings[0].identifier}`);
        addResult(`Packages: ${offerings[0].availablePackages?.length || 0}`);
      }
    } catch (error) {
      addResult(`❌ Offerings failed: ${error}`);
    }
  };

  const testInterstitialAd = async () => {
    try {
      addResult('Testing interstitial ad...');
      const shown = await adMobService.showInterstitialAd();
      addResult(`✅ Interstitial ad ${shown ? 'shown' : 'not ready'}`);
    } catch (error) {
      addResult(`❌ Interstitial failed: ${error}`);
    }
  };

  const testBannerAdUnit = () => {
    const unitId = adMobService.getBannerAdUnitId();
    addResult(`Banner Unit ID: ${unitId || 'Not configured'}`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🧪 Starting comprehensive monetization tests...');
    
    runEnvironmentTest();
    await testRevenueCat();
    await testSubscriptionStatus();
    await testOfferings();
    await testInterstitialAd();
    testBannerAdUnit();
    
    addResult('🎉 All tests completed!');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="p-6">
        <Text className="text-text-primary text-2xl font-bold mb-6">
          Monetization Test Suite
        </Text>

        {/* Environment Info */}
        <View className="bg-surface-800 rounded-lg p-4 mb-6">
          <Text className="text-text-primary font-semibold mb-2">Environment</Text>
          <Text className="text-text-secondary text-sm">
            Mode: {buildEnv.isExpoGo ? 'Expo Go (Mock)' : 'Development Build (Real)'}
          </Text>
          <Text className="text-text-secondary text-sm">
            Native Modules: {buildEnv.hasNativeModules ? 'Available' : 'Not Available'}
          </Text>
        </View>

        {/* Test Buttons */}
        <View className="mb-6">
          <Text className="text-text-primary font-semibold mb-3">Individual Tests</Text>
          
          <View className="flex-row flex-wrap gap-2 mb-4">
            <Pressable 
              onPress={runEnvironmentTest}
              className="bg-blue-500 px-3 py-2 rounded"
            >
              <Text className="text-white text-sm">Environment</Text>
            </Pressable>
            
            <Pressable 
              onPress={testRevenueCat}
              className="bg-green-500 px-3 py-2 rounded"
              disabled={isLoading}
            >
              <Text className="text-white text-sm">RevenueCat</Text>
            </Pressable>
            
            <Pressable 
              onPress={testSubscriptionStatus}
              className="bg-purple-500 px-3 py-2 rounded"
              disabled={isLoading}
            >
              <Text className="text-white text-sm">Status</Text>
            </Pressable>
            
            <Pressable 
              onPress={testOfferings}
              className="bg-orange-500 px-3 py-2 rounded"
              disabled={isLoading}
            >
              <Text className="text-white text-sm">Offerings</Text>
            </Pressable>
            
            <Pressable 
              onPress={testInterstitialAd}
              className="bg-red-500 px-3 py-2 rounded"
            >
              <Text className="text-white text-sm">Interstitial</Text>
            </Pressable>
            
            <Pressable 
              onPress={testBannerAdUnit}
              className="bg-yellow-500 px-3 py-2 rounded"
            >
              <Text className="text-white text-sm">Banner ID</Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2">
            <Pressable 
              onPress={runAllTests}
              className="flex-1 bg-brand-red px-4 py-3 rounded-lg"
              disabled={isLoading}
            >
              <Text className="text-white font-semibold text-center">
                Run All Tests
              </Text>
            </Pressable>
            
            <Pressable 
              onPress={clearResults}
              className="bg-surface-700 px-4 py-3 rounded-lg"
            >
              <Text className="text-text-primary font-semibold">Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Current Status */}
        <View className="bg-surface-800 rounded-lg p-4 mb-6">
          <Text className="text-text-primary font-semibold mb-2">Current Status</Text>
          <Text className="text-text-secondary text-sm">
            Premium: {isPremium ? '✅ Active' : '❌ Inactive'}
          </Text>
          <Text className="text-text-secondary text-sm">
            Loading: {isLoading ? '⏳ Yes' : '✅ No'}
          </Text>
          <Text className="text-text-secondary text-sm">
            Offerings: {offerings.length} loaded
          </Text>
          <Text className="text-text-secondary text-sm">
            Customer Info: {customerInfo ? '✅ Loaded' : '❌ Not loaded'}
          </Text>
        </View>

        {/* Test Results */}
        <View className="flex-1">
          <Text className="text-text-primary font-semibold mb-3">Test Results</Text>
          <ScrollView className="bg-surface-800 rounded-lg p-4 flex-1">
            {testResults.length === 0 ? (
              <Text className="text-text-secondary text-sm">
                No tests run yet. Click "Run All Tests" to start.
              </Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} className="text-text-secondary text-xs mb-1 font-mono">
                  {result}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};
