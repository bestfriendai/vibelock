import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { runChatroomTests, startNetworkMonitoring, ScrollTestResult, NetworkTestResult } from "../utils/chatroomScrollTest";

interface TestResultsProps {
  scrollTests: ScrollTestResult[];
  networkTests: NetworkTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  };
}

function TestResults({ scrollTests, networkTests, summary }: TestResultsProps) {
  return (
    <ScrollView className="max-h-96 bg-surface-800 rounded-lg p-4 mt-4">
      <Text className="text-text-primary font-bold text-lg mb-3">Test Results</Text>
      
      {/* Summary */}
      <View className="bg-surface-700 rounded-lg p-3 mb-4">
        <Text className="text-text-primary font-semibold mb-2">Summary</Text>
        <Text className="text-text-secondary text-sm">
          Total Tests: {summary.totalTests} | Passed: {summary.passedTests} | Failed: {summary.failedTests}
        </Text>
        <Text className={`text-sm font-medium ${summary.successRate >= 80 ? 'text-green-400' : 'text-red-400'}`}>
          Success Rate: {summary.successRate}%
        </Text>
      </View>

      {/* Scroll Tests */}
      <View className="mb-4">
        <Text className="text-text-primary font-semibold mb-2">📜 Message Scrolling Tests</Text>
        {scrollTests.map((test, index) => (
          <View key={index} className="bg-surface-700 rounded-lg p-3 mb-2">
            <View className="flex-row items-center mb-1">
              <Ionicons 
                name={test.passed ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={test.passed ? "#10b981" : "#ef4444"} 
              />
              <Text className="text-text-primary font-medium ml-2">{test.testName}</Text>
            </View>
            <Text className="text-text-secondary text-sm">{test.details}</Text>
            {test.error && (
              <Text className="text-red-400 text-xs mt-1">Error: {test.error}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Network Tests */}
      <View>
        <Text className="text-text-primary font-semibold mb-2">📶 Network Connectivity Tests</Text>
        {networkTests.map((test, index) => (
          <View key={index} className="bg-surface-700 rounded-lg p-3 mb-2">
            <View className="flex-row items-center mb-1">
              <Ionicons 
                name={test.passed ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={test.passed ? "#10b981" : "#ef4444"} 
              />
              <Text className="text-text-primary font-medium ml-2">{test.testName}</Text>
            </View>
            <Text className="text-text-secondary text-sm">{test.details}</Text>
            {test.networkState && (
              <Text className="text-text-muted text-xs mt-1">
                Network: {JSON.stringify(test.networkState, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function ChatroomFixTestButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResultsProps | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stopMonitoring, setStopMonitoring] = useState<(() => void) | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      const results = await runChatroomTests();
      setTestResults(results);

      // Show alert with summary
      Alert.alert(
        "Test Results",
        `${results.summary.passedTests}/${results.summary.totalTests} tests passed (${results.summary.successRate}%)`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Test Error",
        `Failed to run tests: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsRunning(false);
    }
  };

  const toggleNetworkMonitoring = () => {
    if (isMonitoring && stopMonitoring) {
      stopMonitoring();
      setStopMonitoring(null);
      setIsMonitoring(false);
    } else {
      const stopFn = startNetworkMonitoring(60000); // Monitor for 1 minute
      setStopMonitoring(() => stopFn);
      setIsMonitoring(true);
    }
  };

  return (
    <View className="p-4">
      <Text className="text-text-primary font-bold text-xl mb-4">Chatroom Fix Tests</Text>
      
      <Text className="text-text-secondary text-sm mb-4">
        Test the fixes for message scrolling/ordering and network connectivity detection.
      </Text>

      {/* Test Buttons */}
      <View className="flex-row gap-3 mb-4">
        <Pressable
          onPress={runTests}
          disabled={isRunning}
          className={`flex-1 bg-primary-600 rounded-lg p-3 flex-row items-center justify-center ${
            isRunning ? "opacity-50" : ""
          }`}
        >
          <Ionicons name="play" size={16} color="white" />
          <Text className="text-white font-medium ml-2">
            {isRunning ? "Running..." : "Run Tests"}
          </Text>
        </Pressable>

        <Pressable
          onPress={toggleNetworkMonitoring}
          className={`flex-1 rounded-lg p-3 flex-row items-center justify-center ${
            isMonitoring ? "bg-red-600" : "bg-surface-600"
          }`}
        >
          <Ionicons name={isMonitoring ? "stop" : "radio"} size={16} color="white" />
          <Text className="text-white font-medium ml-2">
            {isMonitoring ? "Stop Monitor" : "Monitor Network"}
          </Text>
        </Pressable>
      </View>

      {/* Test Results */}
      {testResults && <TestResults {...testResults} />}

      {/* Instructions */}
      <View className="bg-surface-800 rounded-lg p-4 mt-4">
        <Text className="text-text-primary font-semibold mb-2">What These Tests Check:</Text>
        <Text className="text-text-secondary text-sm mb-2">
          📜 <Text className="font-medium">Message Scrolling:</Text> Verifies messages are in chronological order (oldest to newest) and auto-scroll configuration is correct.
        </Text>
        <Text className="text-text-secondary text-sm">
          📶 <Text className="font-medium">Network Detection:</Text> Checks for false "no internet" errors and ensures consistent network state detection across components.
        </Text>
      </View>
    </View>
  );
}
