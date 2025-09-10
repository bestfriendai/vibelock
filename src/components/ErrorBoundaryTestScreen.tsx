import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ErrorBoundary from "./ErrorBoundary";
import ScreenErrorBoundary from "./ScreenErrorBoundary";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import AsyncErrorBoundary from "./AsyncErrorBoundary";

// Test components that throw errors
const ThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test error from ThrowingComponent");
  }
  return <Text className="text-green-500">✅ Component rendered successfully</Text>;
};

const AsyncThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      setTimeout(() => {
        throw new Error("Test async error");
      }, 100);
    }
  }, [shouldThrow]);

  return <Text className="text-green-500">✅ Async component rendered successfully</Text>;
};

export const ErrorBoundaryTestScreen: React.FC = () => {
  const [testStates, setTestStates] = useState({
    basicError: false,
    screenError: false,
    componentError: false,
    asyncError: false,
  });

  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const toggleTest = (testName: keyof typeof testStates) => {
    setTestStates((prev) => ({
      ...prev,
      [testName]: !prev[testName],
    }));
    addResult(`${testName} test ${testStates[testName] ? "disabled" : "enabled"}`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = () => {
    clearResults();
    addResult("🧪 Starting error boundary tests...");
    
    // Enable all tests one by one
    setTimeout(() => {
      toggleTest("basicError");
    }, 500);
    
    setTimeout(() => {
      toggleTest("componentError");
    }, 1000);
    
    setTimeout(() => {
      toggleTest("screenError");
    }, 1500);
    
    addResult("🎉 All error boundary tests initiated!");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-text-primary text-2xl font-bold mb-2">Error Boundary Tests</Text>
          <Text className="text-text-secondary">
            Test different error boundary implementations to ensure proper error handling.
          </Text>
        </View>

        {/* Test Controls */}
        <View className="bg-surface-800 rounded-xl p-4 mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-4">Test Controls</Text>
          
          <View className="space-y-3">
            <Pressable
              className="bg-brand-red rounded-lg py-3 px-4 items-center"
              onPress={runAllTests}
            >
              <Text className="text-white font-semibold">Run All Tests</Text>
            </Pressable>

            <Pressable
              className="bg-surface-700 rounded-lg py-3 px-4 items-center"
              onPress={clearResults}
            >
              <Text className="text-text-primary font-medium">Clear Results</Text>
            </Pressable>
          </View>
        </View>

        {/* Individual Test Buttons */}
        <View className="bg-surface-800 rounded-xl p-4 mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-4">Individual Tests</Text>
          
          <View className="space-y-3">
            <Pressable
              className={`rounded-lg py-3 px-4 items-center ${
                testStates.basicError ? "bg-red-600" : "bg-surface-700"
              }`}
              onPress={() => toggleTest("basicError")}
            >
              <Text className="text-white font-medium">
                {testStates.basicError ? "Disable" : "Enable"} Basic Error Test
              </Text>
            </Pressable>

            <Pressable
              className={`rounded-lg py-3 px-4 items-center ${
                testStates.componentError ? "bg-red-600" : "bg-surface-700"
              }`}
              onPress={() => toggleTest("componentError")}
            >
              <Text className="text-white font-medium">
                {testStates.componentError ? "Disable" : "Enable"} Component Error Test
              </Text>
            </Pressable>

            <Pressable
              className={`rounded-lg py-3 px-4 items-center ${
                testStates.screenError ? "bg-red-600" : "bg-surface-700"
              }`}
              onPress={() => toggleTest("screenError")}
            >
              <Text className="text-white font-medium">
                {testStates.screenError ? "Disable" : "Enable"} Screen Error Test
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Test Components */}
        <View className="space-y-4 mb-6">
          {/* Basic Error Boundary Test */}
          <View className="bg-surface-800 rounded-xl p-4">
            <Text className="text-text-primary font-semibold mb-2">Basic Error Boundary</Text>
            <ErrorBoundary>
              <ThrowingComponent shouldThrow={testStates.basicError} />
            </ErrorBoundary>
          </View>

          {/* Component Error Boundary Test */}
          <View className="bg-surface-800 rounded-xl p-4">
            <Text className="text-text-primary font-semibold mb-2">Component Error Boundary</Text>
            <ComponentErrorBoundary componentName="TestComponent">
              <ThrowingComponent shouldThrow={testStates.componentError} />
            </ComponentErrorBoundary>
          </View>

          {/* Screen Error Boundary Test */}
          <View className="bg-surface-800 rounded-xl p-4">
            <Text className="text-text-primary font-semibold mb-2">Screen Error Boundary</Text>
            <ScreenErrorBoundary screenName="Test Screen">
              <ThrowingComponent shouldThrow={testStates.screenError} />
            </ScreenErrorBoundary>
          </View>

          {/* Async Error Boundary Test */}
          <View className="bg-surface-800 rounded-xl p-4">
            <Text className="text-text-primary font-semibold mb-2">Async Error Boundary</Text>
            <AsyncErrorBoundary
              onRetry={async () => {
                addResult("Async retry attempted");
                await new Promise(resolve => setTimeout(resolve, 1000));
              }}
            >
              <AsyncThrowingComponent shouldThrow={testStates.asyncError} />
            </AsyncErrorBoundary>
          </View>
        </View>

        {/* Test Results */}
        <View className="bg-surface-800 rounded-xl p-4">
          <Text className="text-text-primary text-lg font-semibold mb-4">Test Results</Text>
          {testResults.length === 0 ? (
            <Text className="text-text-secondary italic">No test results yet</Text>
          ) : (
            <ScrollView className="max-h-40">
              {testResults.map((result, index) => (
                <Text key={index} className="text-text-secondary text-sm mb-1 font-mono">
                  {result}
                </Text>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Instructions */}
        <View className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mt-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={16} color="#3B82F6" />
            <Text className="text-blue-400 text-sm font-medium ml-2">Testing Instructions</Text>
          </View>
          <Text className="text-blue-300 text-xs leading-5">
            Each test should show a different error boundary UI when enabled. The basic boundary shows a full-screen error,
            component boundaries show inline errors, and screen boundaries provide navigation options.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
